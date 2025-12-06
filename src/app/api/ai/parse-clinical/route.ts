/**
 * Clinical Document Parsing API
 * Uses Gemini to extract medical findings from clinical documents
 */

import { generateText } from "ai";
import { NextResponse } from "next/server";
import { getDocAnalysisModel } from "@/lib/aiProvider";
import { buildClinicalParsingPrompt } from "@/lib/promptFactory";

interface ParsedFindings {
	diagnoses?: string[];
	procedures?: string[];
	symptom_dates?: string[];
	medical_history?: string[];
	pec_indicators?: string[];
	relevant_tags?: string[];
}

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { rawText, docType } = body as {
			rawText: string;
			docType: string;
		};

		if (!rawText) {
			return NextResponse.json(
				{ error: "rawText is required" },
				{ status: 400 },
			);
		}

		// Get Gemini model for document analysis
		const model = getDocAnalysisModel();
		const prompt = buildClinicalParsingPrompt(
			rawText,
			docType || "clinical document",
		);

		// Call Gemini for parsing
		const startTime = Date.now();
		const { text: resultText } = await generateText({
			model,
			prompt,
			temperature: 0.1,
			maxOutputTokens: 4000,
		});
		const latencyMs = Date.now() - startTime;

		// Parse the JSON response
		let parsed: ParsedFindings;
		try {
			// Clean the response
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

		return NextResponse.json({
			success: true,
			findings: {
				diagnoses: parsed.diagnoses || [],
				procedures: parsed.procedures || [],
				symptomDates: parsed.symptom_dates || [],
				medicalHistory: parsed.medical_history || [],
				pecIndicators: parsed.pec_indicators || [],
				relevantTags: parsed.relevant_tags || [],
			},
			metadata: {
				latencyMs,
				model: "gemini-2.0-flash",
			},
		});
	} catch (error) {
		console.error("Clinical parsing error:", error);
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
