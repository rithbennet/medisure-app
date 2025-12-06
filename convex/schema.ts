import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	patients: defineTable({
		name: v.string(),
		insurer: v.string(),
		policyId: v.optional(v.id("policies")),
		createdAt: v.number(),
	}),

	policies: defineTable({
		// New schema fields
		insurerName: v.optional(v.string()),
		productName: v.optional(v.string()),
		planType: v.optional(v.string()),
		ragIndexId: v.optional(v.string()),
		isDemo: v.optional(v.boolean()),
		createdAt: v.optional(v.number()),
		// Legacy fields (from previous data)
		name: v.optional(v.string()),
		insurer: v.optional(v.string()),
		extractedText: v.optional(v.string()),
	}),

	gl_requests: defineTable({
		patientId: v.optional(v.id("patients")),
		patientName: v.string(),
		insurerName: v.string(),
		// String to accommodate mock policy IDs (e.g. "demo_policy_aia_2025")
		policyId: v.optional(v.string()),
		status: v.string(),
		diagnosis: v.string(),
		estimatedCost: v.optional(v.number()),
		riskBand: v.optional(v.string()),
		riskExplanation: v.optional(v.string()),
		createdAt: v.number(),
		updatedAt: v.number(),
	}),

	policy_chunks: defineTable({
		policyId: v.id("policies"),
		embedding: v.array(v.number()),
		text: v.string(),
	}).index("by_policy", ["policyId"]),

	activity_logs: defineTable({
		type: v.string(),
		message: v.string(),
		glId: v.optional(v.string()),
		createdAt: v.number(),
	}),
});


