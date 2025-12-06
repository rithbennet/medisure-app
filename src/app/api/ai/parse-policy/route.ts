/**
 * Policy Document Parsing API
 * Uses Gemini to extract clauses and config from policy text
 */

import { generateText } from "ai";
import { NextResponse } from "next/server";
import { getDocAnalysisModel } from "@/lib/aiProvider";
import { buildPolicyParsingPrompt } from "@/lib/promptFactory";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { env } from "@/env";

const convex = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL);

interface ParsedClause {
	clause_id: string;
	type: "waiting_period" | "exclusion_general" | "exclusion_specific" | "sublimit" | "coverage" | "doc_requirement" | "pec_definition";
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
		const prompt = buildPolicyParsingPrompt(rawText, insurerName || "Unknown Insurer");

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
			// Convert null values to undefined (Convex doesn't accept null for optional fields)
			const clausesForDb = parsed.clauses.map((c) => ({
				clauseId: c.clause_id || `clause_${Math.random().toString(36).slice(2, 9)}`,
				type: c.type,
				tags: c.tags || [],
				text: c.text || "",
				pageRef: c.page_ref || undefined,
				waitingPeriodDays: c.waiting_period_days ?? undefined,
				sublimitAmount: c.sublimit_amount ?? undefined,
				sublimitCategory: c.sublimit_category || undefined,
			}));

			// Save clauses to database
			await convex.mutation(api.documentIngestion.savePolicyClauses, {
				policyId: policyId as Id<"policyDocuments">,
				clauses: clausesForDb,
			});
			
			console.log(`[Parse Policy] Saved ${clausesForDb.length} clauses to database`);
		}

		// Store payer config if extracted
		if (parsed.config && (parsed.config.waiting_periods || parsed.config.exclusions_general || parsed.config.sublimits || parsed.config.annual_max)) {
			await convex.mutation(api.documentIngestion.savePayerConfig, {
				policyId: policyId as Id<"policyDocuments">,
				config: {
					waitingPeriods: parsed.config.waiting_periods?.map(wp => ({
						conditionTag: wp.condition_tag,
						days: wp.days,
					})) ?? undefined,
					exclusionsGeneral: parsed.config.exclusions_general?.map(e => ({
						tag: e.tag,
						description: e.description,
					})) ?? undefined,
					sublimits: parsed.config.sublimits
						?.filter(s => s.amount != null && s.currency != null)
						.map(s => ({
							category: s.category,
							amount: s.amount,
							currency: s.currency,
						})) ?? undefined,
					annualMax: parsed.config.annual_max ?? undefined,
					lifetimeMax: parsed.config.lifetime_max ?? undefined,
				},
			});
			
			console.log("[Parse Policy] Saved payer config to database");
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

