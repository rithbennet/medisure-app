/**
 * Final Risk Report API
 * Uses Claude to generate narrative risk assessment based on rule engine output
 */

import { generateText, streamText } from "ai";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { getModelForRole } from "@/lib/aiProvider";
import {
	buildFinalRiskReportPrompt,
	buildSimpleNarrativePrompt,
	type CaseIntakeForReport,
	type FinalRiskReport,
	type ParsedClause,
	type RuleEngineOutput,
} from "@/lib/promptFactory";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

const convex = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL);

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { glId, stream = false } = body as {
			glId: string;
			stream?: boolean;
		};

		if (!glId) {
			return NextResponse.json({ error: "glId is required" }, { status: 400 });
		}

		// Get GL request data
		const glRequest = await convex.query(api.glRequests.get, {
			glId: glId as Id<"glRequests">,
		});

		if (!glRequest) {
			return NextResponse.json(
				{ error: "GL request not found" },
				{ status: 404 },
			);
		}

		// Check if rules have been evaluated
		if (!glRequest.signals || !glRequest.scoreBucket) {
			return NextResponse.json(
				{
					error: "Rules must be evaluated first. Call /api/ai/evaluate-rules",
					needsRuleEvaluation: true,
				},
				{ status: 400 },
			);
		}

		// Build case intake for report
		const intake: CaseIntakeForReport = {
			case_id: glRequest.caseId || glId,
			diagnosis: glRequest.diagnosis,
			diagnosis_code: glRequest.diagnosisCode,
			symptom_start_date: glRequest.symptomStartDate,
			policy_start_date: glRequest.policyStartDate,
			estimated_cost: glRequest.estimatedCost,
			patient_name: glRequest.patientName,
			encounter_type: glRequest.encounterType,
			panel_status: glRequest.panelStatus,
			estimate_breakdown: glRequest.estimateBreakdown,
		};

		// Build rule engine output
		const ruleOutput: RuleEngineOutput = {
			signals: (glRequest.signals || []).map(
				(s: {
					ruleId: string;
					severity: "Blocker" | "Warning" | "Info";
					message: string;
					clauseId?: string;
					clauseText?: string;
					evidence?: Record<string, unknown>;
				}) => ({
					rule_id: s.ruleId,
					severity: s.severity as "Blocker" | "Warning" | "Info",
					message: s.message,
					clause_id: s.clauseId,
					clause_text: s.clauseText,
					evidence: s.evidence,
				}),
			),
			missing_items: (glRequest.missingItems || []).map(
				(m: { type: string; key: string; reason: string }) => ({
					type: m.type,
					key: m.key,
					reason: m.reason,
				}),
			),
			score_bucket: glRequest.scoreBucket as "Low" | "Medium" | "High",
			approval_probability: glRequest.approvalProbability || 0.5,
			suggested_actions: glRequest.suggestedActions || [],
		};

		// Get policy clauses
		const clauses = await convex.query(api.documentIngestion.getPolicyClauses, {
			policyId: glRequest.policyId,
		});

		const parsedClauses: ParsedClause[] = clauses.map(
			(c: {
				clauseId: string;
				type: string;
				tags: string[];
				text: string;
				pageRef?: string;
				waitingPeriodDays?: number;
				sublimitAmount?: number;
				sublimitCategory?: string;
			}) => ({
				clause_id: c.clauseId,
				type: c.type as ParsedClause["type"],
				tags: c.tags,
				text: c.text,
				page_ref: c.pageRef,
				waiting_period_days: c.waitingPeriodDays,
				sublimit_amount: c.sublimitAmount,
				sublimit_category: c.sublimitCategory,
			}),
		);

		// Get Claude model for risk assessment
		const { model, modelName } = getModelForRole("risk_assessment");

		// Build prompt based on risk level
		let prompt: string;
		if (ruleOutput.score_bucket === "Low" && ruleOutput.signals.length <= 1) {
			prompt = buildSimpleNarrativePrompt(intake, ruleOutput);
		} else {
			prompt = buildFinalRiskReportPrompt(intake, ruleOutput, parsedClauses);
		}

		const startTime = Date.now();

		// Streaming response
		if (stream) {
			const result = streamText({
				model,
				prompt,
				temperature: 0.3,
				maxOutputTokens: 4000,
			});

			// Return streaming response
			const textStream = result.textStream;

			const encoder = new TextEncoder();
			const readable = new ReadableStream({
				async start(controller) {
					for await (const chunk of textStream) {
						controller.enqueue(encoder.encode(chunk));
					}
					controller.close();
				},
			});

			return new Response(readable, {
				headers: {
					"Content-Type": "text/plain; charset=utf-8",
					"X-Model": modelName,
					"X-Provider": "anthropic",
				},
			});
		}

		// Non-streaming response
		const { text: resultText } = await generateText({
			model,
			prompt,
			temperature: 0.3,
			maxOutputTokens: 4000,
		});
		const latencyMs = Date.now() - startTime;

		// Parse the response
		let report: FinalRiskReport;
		try {
			let cleanedText = resultText.trim();
			if (cleanedText.startsWith("```json")) {
				cleanedText = cleanedText.slice(7);
			} else if (cleanedText.startsWith("```")) {
				cleanedText = cleanedText.slice(3);
			}
			if (cleanedText.endsWith("```")) {
				cleanedText = cleanedText.slice(0, -3);
			}
			report = JSON.parse(cleanedText.trim());
		} catch {
			// For simple narratives, wrap in a basic report structure
			report = {
				case_id: intake.case_id || glId,
				score_bucket: ruleOutput.score_bucket,
				approval_probability: ruleOutput.approval_probability,
				narrative_summary: resultText,
				rule_explanations: [],
				coordinator_actions: ruleOutput.suggested_actions,
			};
		}

		// Update GL request with final report
		// Note: In production, this would use an internal mutation
		// For now, we return the report to be handled by the client

		return NextResponse.json({
			success: true,
			glId,
			report,
			metadata: {
				latencyMs,
				model: modelName,
				provider: "anthropic",
				rulesEvaluated: true,
				clausesUsed: parsedClauses.length,
			},
		});
	} catch (error) {
		console.error("Final report generation error:", error);

		// Fallback: Return deterministic results only
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Unknown error",
				fallback: true,
				message:
					"AI narrative generation failed. Showing deterministic rule results only.",
			},
			{ status: 500 },
		);
	}
}
