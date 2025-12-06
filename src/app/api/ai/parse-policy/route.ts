/**
 * Policy Document Parsing API
 * Uses Gemini to extract clauses and config from policy text
 */

import { generateText } from "ai";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { getDocAnalysisModel } from "@/lib/aiProvider";
import { buildPolicyParsingPrompt } from "@/lib/promptFactory";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

const convex = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL);

interface ParsedClause {
	clause_id: string;
	type:
		| "waiting_period"
		| "exclusion_general"
		| "exclusion_specific"
		| "sublimit"
		| "coverage"
		| "doc_requirement"
		| "pec_definition";
	tags: string[];
	text: string;
	page_ref?: string;
	waiting_period_days?: number;
	sublimit_amount?: number;
	sublimit_category?: string;
}

interface ParsedConfig {
	waiting_periods?: Array<{ condition_tag: string; days: number }>;
	exclusions_general?: Array<{ tag: string; description: string }>;
	sublimits?: Array<{ category: string; amount: number; currency: string }>;
	annual_max?: number;
	lifetime_max?: number;
}

interface ParseResult {
	clauses: ParsedClause[];
	config: ParsedConfig;
	metadata: {
		total_clauses: number;
		document_type?: string;
		version?: string;
	};
}

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { policyId, rawText, insurerName } = body as {
			policyId: string;
			rawText: string;
			insurerName: string;
		};

		if (!policyId || !rawText) {
			return NextResponse.json(
				{ error: "policyId and rawText are required" },
				{ status: 400 },
			);
		}

		// Store raw text in Convex
		await convex.mutation(api.documentIngestion.storePolicyRawText, {
			policyId: policyId as Id<"policyDocuments">,
			rawText,
		});

		// Get Gemini model for document analysis
		const model = getDocAnalysisModel();
		const prompt = buildPolicyParsingPrompt(
			rawText,
			insurerName || "Unknown Insurer",
		);

		// Call Gemini for parsing
		const startTime = Date.now();
		const { text: resultText } = await generateText({
			model,
			prompt,
			temperature: 0.1, // Low temperature for structured extraction
			maxOutputTokens: 8000,
		});
		const latencyMs = Date.now() - startTime;

		// Parse the JSON response
		let parsed: ParseResult;
		try {
			// Clean the response - remove markdown code blocks if present
			let cleanedText = resultText.trim();
			if (cleanedText.startsWith("```json")) {
				cleanedText = cleanedText.slice(7);
			} else if (cleanedText.startsWith("```")) {
				cleanedText = cleanedText.slice(3);
			}
			if (cleanedText.endsWith("```")) {
				cleanedText = cleanedText.slice(0, -3);
			}
			parsed = JSON.parse(cleanedText.trim());
		} catch {
			console.error("Failed to parse Gemini response:", resultText);
			return NextResponse.json(
				{ error: "Failed to parse AI response", raw: resultText },
				{ status: 500 },
			);
		}

		// Store parsed clauses in Convex
		if (parsed.clauses && parsed.clauses.length > 0) {
			const _clausesForDb = parsed.clauses.map((c) => ({
				clauseId: c.clause_id,
				type: c.type,
				tags: c.tags || [],
				text: c.text,
				pageRef: c.page_ref,
				waitingPeriodDays: c.waiting_period_days,
				sublimitAmount: c.sublimit_amount,
				sublimitCategory: c.sublimit_category,
			}));

			// Using the internal mutation would require an action, so we'll handle this via API
			// For now, return the parsed data to be stored by the client
		}

		// Store payer config if extracted
		if (parsed.config) {
			// Similar to above, return for client-side storage
		}

		return NextResponse.json({
			success: true,
			policyId,
			clauses: parsed.clauses || [],
			config: parsed.config || {},
			metadata: {
				...parsed.metadata,
				latencyMs,
				model: "gemini-2.0-flash",
			},
		});
	} catch (error) {
		console.error("Policy parsing error:", error);
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
