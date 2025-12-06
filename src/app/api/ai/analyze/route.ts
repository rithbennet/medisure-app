import { api } from "@convex/_generated/api.js";
import type { Id } from "@convex/_generated/dataModel.js";
import { streamObject } from "ai";
import { z } from "zod";
import { env } from "@/env";
import { type AIProvider, getModel } from "@/lib/aiProvider";
import { getConvexClient } from "@/lib/convex";
import { embedText } from "@/lib/embedding";
import {
	buildRiskPrompt,
	combineChunksToContext,
	type GlRequestData,
} from "@/lib/promptFactory";

export const runtime = "nodejs";
export const maxDuration = 60;

// Schema for the risk analysis response
const riskAnalysisSchema = z.object({
	risk: z.enum(["low", "medium", "high"]),
	score: z.number().min(0).max(100),
	explanation: z.string(),
	factors: z.array(z.string()),
	recommendation: z.string(),
});

export async function POST(request: Request) {
	const startTime = Date.now();

	try {
		const body = await request.json();
		const { glId, provider }: { glId: string; provider?: AIProvider } = body;

		if (!glId) {
			return Response.json({ error: "glId is required" }, { status: 400 });
		}

		const convex = getConvexClient();

		// Fetch the GL request from Convex
		const glRequest = await convex.query(api.glRequests.get, {
			glId: glId as Id<"glRequests">,
		});

		if (!glRequest) {
			return Response.json({ error: "GL request not found" }, { status: 404 });
		}

		// Build GL data for the prompt
		const glData: GlRequestData = {
			diagnosis: glRequest.diagnosis,
			diagnosisCode: glRequest.diagnosisCode,
			symptomStartDate: glRequest.symptomStartDate,
			policyStartDate: glRequest.policyStartDate,
			estimatedCost: glRequest.estimatedCost,
			patientName: glRequest.patientName,
		};

		// Get relevant policy chunks via vector search
		let policyContext = "";
		try {
			// Generate embedding for the diagnosis/query
			const queryText = `${glRequest.diagnosis} treatment coverage insurance policy`;
			const queryEmbedding = await embedText(queryText);

			// Search for relevant policy chunks
			const chunks = await convex.action(api.policies.searchPolicyChunks, {
				policyId: glRequest.policyId,
				queryEmbedding,
				limit: 5,
			});

			if (chunks && chunks.length > 0) {
				const chunkTexts = chunks.map((c: { text: string }) => c.text);
				policyContext = combineChunksToContext(chunkTexts);
			}
		} catch (err) {
			console.warn(
				"[AI Analyze] Vector search failed, proceeding without context:",
				err,
			);
		}

		// Build the prompt
		const prompt = buildRiskPrompt(glData, policyContext);

		// Get the model
		const model = getModel(provider);

		// Stream the structured response
		const result = streamObject({
			model,
			schema: riskAnalysisSchema,
			prompt,
		});

		const latency = Date.now() - startTime;
		const selectedProvider = provider ?? env.AI_PROVIDER ?? "gemini";
		const modelName =
			selectedProvider === "gemini"
				? (env.AI_MODEL_GEMINI ?? "models/gemini-3.0-pro")
				: (env.AI_MODEL_ANTHROPIC ?? "claude-opus-4-5-20251101");

		console.log(
			`[AI Analyze] Provider: ${selectedProvider}, Model: ${modelName}, GL: ${glId}, Latency: ${latency}ms`,
		);

		return result.toTextStreamResponse();
	} catch (error) {
		console.error("[AI Analyze] Error:", error);
		return Response.json(
			{
				error:
					error instanceof Error ? error.message : "Unknown error occurred",
			},
			{ status: 500 },
		);
	}
}
