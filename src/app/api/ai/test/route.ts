import { streamText } from "ai";
import { env } from "@/env";
import { type AIProvider, getModel } from "@/lib/aiProvider";

export const runtime = "nodejs";

export async function POST(request: Request) {
	try {
		const startTime = Date.now();
		const body = await request.json();
		const { prompt, provider }: { prompt: string; provider?: AIProvider } =
			body;

		if (!prompt) {
			return Response.json({ error: "Prompt is required" }, { status: 400 });
		}

		// Get the model based on provider selection
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
			`[AI Test] Provider: ${selectedProvider}, Model: ${modelName}, Latency: ${latency}ms`,
		);

		return result.toTextStreamResponse();
	} catch (error) {
		console.error("[AI Test] Error:", error);
		return Response.json(
			{
				error:
					error instanceof Error ? error.message : "Unknown error occurred",
			},
			{ status: 500 },
		);
	}
}
