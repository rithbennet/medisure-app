import { api } from "@convex/_generated/api.js";
import type { Id } from "@convex/_generated/dataModel.js";
import { streamText } from "ai";
import { env } from "@/env";
import { type AIProvider, getModel } from "@/lib/aiProvider";
import { getConvexClient } from "@/lib/convex";
import { embedText } from "@/lib/embedding";
import { buildQnAPrompt, combineChunksToContext } from "@/lib/promptFactory";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
	const startTime = Date.now();

	try {
		const body = await request.json();
		const {
			policyId,
			question,
			provider,
		}: {
			policyId: string;
			question: string;
			provider?: AIProvider;
		} = body;

		if (!question) {
			return Response.json({ error: "question is required" }, { status: 400 });
		}

		let policyContext = "";

		// If a policyId is provided, search for relevant chunks
		if (policyId) {
			const convex = getConvexClient();

			try {
				// Generate embedding for the question
				const queryEmbedding = await embedText(question);

				// Search for relevant policy chunks
				const chunks = await convex.action(api.policies.searchPolicyChunks, {
					policyId: policyId as Id<"policyDocuments">,
					queryEmbedding,
					limit: 5,
				});

				if (chunks && chunks.length > 0) {
					const chunkTexts = chunks.map((c: { text: string }) => c.text);
					policyContext = combineChunksToContext(chunkTexts);
				}
			} catch (err) {
				console.warn(
					"[AI Q&A] Vector search failed, proceeding without context:",
					err,
				);
			}
		}

		// Build the prompt
		const prompt = buildQnAPrompt(question, policyContext);

		// Get the model
		const model = getModel(provider);

		// Stream the response
		const result = streamText({
			model,
			prompt,
		});

		const latency = Date.now() - startTime;
		const selectedProvider = provider ?? env.AI_PROVIDER ?? "gemini";
		const modelName =
			selectedProvider === "gemini"
				? (env.AI_MODEL_GEMINI ?? "models/gemini-3.0-pro")
				: (env.AI_MODEL_ANTHROPIC ?? "claude-opus-4-5-20251101");

		console.log(
			`[AI Q&A] Provider: ${selectedProvider}, Model: ${modelName}, Policy: ${policyId || "none"}, Latency: ${latency}ms`,
		);

		return result.toTextStreamResponse();
	} catch (error) {
		console.error("[AI Q&A] Error:", error);
		return Response.json(
			{
				error:
					error instanceof Error ? error.message : "Unknown error occurred",
			},
			{ status: 500 },
		);
	}
}
