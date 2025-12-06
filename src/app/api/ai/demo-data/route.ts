import { api } from "@convex/_generated/api.js";
import { getConvexClient } from "@/lib/convex";

export const runtime = "nodejs";

interface DemoDataRequest {
	patientName?: string;
	diagnosis?: string;
	diagnosisCode?: string;
	symptomStartDate?: string;
	policyStartDate?: string;
	estimatedCost?: number;
	insurerName?: string;
}

export async function POST(request: Request) {
	try {
		const convex = getConvexClient();

		// Parse request body for custom data (optional)
		let customData: DemoDataRequest = {};
		try {
			const contentType = request.headers.get("content-type");
			if (contentType?.includes("application/json")) {
				customData = await request.json();
			}
		} catch {
			// No custom data provided, use defaults
		}

		// Create a demo policy
		const policyId = await convex.mutation(api.policies.createPolicy, {
			insurerName: customData.insurerName || "MediSure Insurance Co.",
			productName: "Comprehensive Health Plan",
			planType: "Gold",
		});

		// Create a demo GL request with custom or default data
		const glId = await convex.mutation(api.glRequests.create, {
			diagnosis: customData.diagnosis || "Type 2 Diabetes Management",
			diagnosisCode: customData.diagnosisCode || "E11.9",
			symptomStartDate: customData.symptomStartDate || "2024-06-15",
			policyStartDate: customData.policyStartDate || "2024-01-01",
			estimatedCost: customData.estimatedCost || 5500,
			policyId,
			patientName: customData.patientName || "John Demo",
		});

		return Response.json({ policyId, glId });
	} catch (error) {
		console.error("[Demo Data] Error:", error);
		return Response.json(
			{
				error:
					error instanceof Error ? error.message : "Failed to create demo data",
			},
			{ status: 500 },
		);
	}
}
