import { api } from "@convex/_generated/api.js";
import { getConvexClient } from "@/lib/convex";

export const runtime = "nodejs";

export async function POST() {
	try {
		const convex = getConvexClient();

		// Create a demo policy
		const policyId = await convex.mutation(api.policies.createPolicy, {
			insurerName: "MediSure Insurance Co.",
			productName: "Comprehensive Health Plan",
			planType: "Gold",
		});

		// Create a demo GL request
		const glId = await convex.mutation(api.glRequests.create, {
			diagnosis: "Type 2 Diabetes Management",
			diagnosisCode: "E11.9",
			symptomStartDate: "2024-06-15",
			policyStartDate: "2024-01-01",
			estimatedCost: 5500,
			policyId,
			patientName: "John Demo",
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
