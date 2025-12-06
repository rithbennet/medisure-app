import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";
import { env } from "@/env";

export type AIProvider = "gemini" | "anthropic";

/**
 * Model roles for different AI tasks:
 * - Document Analysis (Gemini 3.0 Pro): structure extraction, clause parsing, summarization
 * - Risk Assessment (Claude 4.5): final reasoning, narrative reports, rule-aligned analysis
 */
export type ModelRole = "doc_analysis" | "risk_assessment" | "general";

/**
 * Get the default AI provider from environment or default to gemini
 */
export function getDefaultProvider(): AIProvider {
	return (env.AI_PROVIDER as AIProvider) ?? "gemini";
}

/**
 * Get the Gemini model instance
 */
export function getGeminiModel(): LanguageModel {
	const modelName = env.AI_MODEL_GEMINI ?? "gemini-2.0-flash";
	const google = createGoogleGenerativeAI({
		apiKey: env.GOOGLE_API_KEY,
	});
	return google(modelName);
}

/**
 * Get the Anthropic model instance
 */
export function getAnthropicModel(): LanguageModel {
	const modelName = env.AI_MODEL_ANTHROPIC ?? "claude-sonnet-4-20250514";
	const anthropic = createAnthropic({
		apiKey: env.ANTHROPIC_API_KEY,
	});
	return anthropic(modelName);
}

/**
 * Get Document Analysis Model (Gemini 3.0 Pro)
 * Used for: document understanding, clause extraction, rule config assistance, summarization
 * @returns Gemini model configured for document analysis
 */
export function getDocAnalysisModel(): LanguageModel {
	if (!env.GOOGLE_API_KEY) {
		throw new Error(
			"GOOGLE_API_KEY is required for Document Analysis (Gemini)",
		);
	}
	// Use gemini-2.0-flash for doc analysis (fast and capable)
	const modelName = env.AI_MODEL_GEMINI ?? "gemini-2.0-flash";
	const google = createGoogleGenerativeAI({
		apiKey: env.GOOGLE_API_KEY,
	});
	return google(modelName);
}

/**
 * Get Risk Assessment Model (Claude 4.5)
 * Used for: final risk reasoning, narrative reports, rule-aligned analysis
 * @returns Claude model configured for risk assessment
 */
export function getRiskAssessmentModel(): LanguageModel {
	if (!env.ANTHROPIC_API_KEY) {
		throw new Error(
			"ANTHROPIC_API_KEY is required for Risk Assessment (Claude)",
		);
	}
	// Use Claude Sonnet 4 for risk assessment (balanced reasoning)
	const modelName = env.AI_MODEL_ANTHROPIC ?? "claude-sonnet-4-20250514";
	const anthropic = createAnthropic({
		apiKey: env.ANTHROPIC_API_KEY,
	});
	return anthropic(modelName);
}

/**
 * Get model for a specific role
 * @param role - The role/task the model will perform
 * @returns Appropriate language model for the role
 */
export function getModelForRole(role: ModelRole): {
	model: LanguageModel;
	provider: AIProvider;
	modelName: string;
} {
	switch (role) {
		case "doc_analysis":
			return {
				model: getDocAnalysisModel(),
				provider: "gemini",
				modelName: env.AI_MODEL_GEMINI ?? "gemini-2.0-flash",
			};
		case "risk_assessment":
			return {
				model: getRiskAssessmentModel(),
				provider: "anthropic",
				modelName: env.AI_MODEL_ANTHROPIC ?? "claude-sonnet-4-20250514",
			};
		default: {
			const defaultProvider = getDefaultProvider();
			return {
				model: getModel(defaultProvider),
				provider: defaultProvider,
				modelName:
					defaultProvider === "gemini"
						? (env.AI_MODEL_GEMINI ?? "gemini-2.0-flash")
						: (env.AI_MODEL_ANTHROPIC ?? "claude-sonnet-4-20250514"),
			};
		}
	}
}

/**
 * Get a model instance based on provider selection
 * @param provider - Optional provider override, otherwise uses default from env
 */
export function getModel(provider?: AIProvider): LanguageModel {
	const selectedProvider = provider ?? getDefaultProvider();

	if (selectedProvider === "gemini") {
		if (!env.GOOGLE_API_KEY) {
			throw new Error("GOOGLE_API_KEY is required for Gemini provider");
		}
		return getGeminiModel();
	}

	if (selectedProvider === "anthropic") {
		if (!env.ANTHROPIC_API_KEY) {
			throw new Error("ANTHROPIC_API_KEY is required for Anthropic provider");
		}
		return getAnthropicModel();
	}

	throw new Error(`Unknown provider: ${selectedProvider}`);
}
