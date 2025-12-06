import { generateText } from "ai";
import { NextResponse } from "next/server";

import { getModelForRole } from "@/lib/aiProvider";

export const runtime = "nodejs";
export const maxDuration = 30;

type ReportRequest = {
	patient?: {
		name?: string;
		insurer?: string;
	};
	diagnosis?: {
		primary?: string;
		symptoms?: string;
		findings?: string;
		labs?: string;
		plan?: string;
		notes?: string;
	};
};

export async function POST(req: Request) {
	try {
		const body = (await req.json()) as ReportRequest;
		const patientName = body.patient?.name?.trim() || "Patient";
		const insurer = body.patient?.insurer?.trim() || "—";
		const primaryDx =
			body.diagnosis?.primary?.trim() || "Diagnosis pending from doctor";

		const contextLines = [
			`Patient: ${patientName}`,
			`Insurer: ${insurer}`,
			`Primary concern: ${primaryDx}`,
			body.diagnosis?.symptoms && `Symptoms/onset: ${body.diagnosis.symptoms}`,
			body.diagnosis?.findings &&
				`Exam/imaging findings: ${body.diagnosis.findings}`,
			body.diagnosis?.labs && `Labs: ${body.diagnosis.labs}`,
			body.diagnosis?.plan && `Plan/intervention: ${body.diagnosis.plan}`,
			body.diagnosis?.notes && `Notes: ${body.diagnosis.notes}`,
		]
			.filter(Boolean)
			.join("\n");

		const fallbackReport = [
			`Clinical report draft for ${patientName}`,
			"",
			primaryDx,
			"",
			contextLines,
		].join("\n");

		try {
			const { model, modelName, provider } = getModelForRole("risk_assessment");
			const prompt = `
You are a concise clinical documentation assistant. 
Draft a short doctor-facing report (150-220 words) that summarises the case and can be shared with a coordinator. 
Keep it factual, avoid speculation, and include: presentation, key findings, working diagnosis, recommended plan, and any insurer-facing notes. 
Return plain text only.

Case context:
${contextLines}
`;

			const { text } = await generateText({
				model,
				prompt,
				temperature: 0.35,
				maxOutputTokens: 600,
			});

			return NextResponse.json({
				report: text?.trim() || fallbackReport,
				provider,
				model: modelName,
			});
		} catch (modelError) {
			console.warn("[doctor/report] AI provider unavailable, using fallback.", {
				error: modelError,
			});
			return NextResponse.json({
				report: fallbackReport,
				provider: "fallback",
				model: "template",
				note: "AI provider unavailable; using deterministic draft.",
			});
		}
	} catch (error) {
		console.error("[doctor/report] Failed to generate report", error);
		return NextResponse.json(
			{ error: "Unable to generate report" },
			{ status: 400 },
		);
	}
}
