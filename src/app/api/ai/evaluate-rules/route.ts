/**
 * Rule Engine Evaluation API
 * Runs deterministic rule evaluation for a GL request
 */

import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { env } from "@/env";

const convex = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL);

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { glId } = body as { glId: string };

		if (!glId) {
			return NextResponse.json(
				{ error: "glId is required" },
				{ status: 400 },
			);
		}

		// Run rule evaluation via Convex action
		const result = await convex.action(api.rulesEngine.evaluateRulesForGlRequest, {
			glId: glId as Id<"glRequests">,
		});

		return NextResponse.json({
			success: true,
			glId,
			result: {
				scoreBucket: result.scoreBucket,
				approvalProbability: result.approvalProbability,
				signals: result.signals,
				missingItems: result.missingItems,
				suggestedActions: result.suggestedActions,
			},
			metadata: {
				signalCount: result.signals.length,
				blockerCount: result.signals.filter((s) => s.severity === "Blocker").length,
				warningCount: result.signals.filter((s) => s.severity === "Warning").length,
				infoCount: result.signals.filter((s) => s.severity === "Info").length,
			},
		});
	} catch (error) {
		console.error("Rule evaluation error:", error);
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

