import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	// Users table - stores registered user data
	users: defineTable({
		email: v.string(), // Email address
		password: v.optional(v.string()), // Hashed password (optional for WorkOS users)
		fullName: v.string(), // User's full name
		icNumber: v.optional(v.string()), // Identification card number (optional until profile complete)
		role: v.union(
			v.literal("coordinator"), // Admin role
			v.literal("patient"),
			v.literal("doctor"),
			v.literal("insurance_agent")
		),
		workosId: v.optional(v.string()), // WorkOS user ID for OAuth users
		profileComplete: v.optional(v.boolean()), // Whether the user has completed their profile (added IC) - defaults to true for existing users
		createdAt: v.number(), // Timestamp
		updatedAt: v.number(), // Timestamp
	})
		.index("by_email", ["email"])
		.index("by_icNumber", ["icNumber"])
		.index("by_workosId", ["workosId"]),

	// Session tokens table - stores active sessions
	sessionTokens: defineTable({
		userId: v.id("users"), // Reference to user
		token: v.string(), // Session token
		expiresAt: v.number(), // Expiration timestamp
		createdAt: v.number(), // Timestamp
	})
		.index("by_token", ["token"])
		.index("by_userId", ["userId"]),

	// Patients table
	patients: defineTable({
		name: v.string(),
		insurer: v.string(),
		policyId: v.optional(v.id("policies")),
		createdAt: v.number(),
	}),

	// Policies table
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

	// GL (Guarantee Letter) requests table
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

	// Policy chunks table for RAG/embeddings
	policy_chunks: defineTable({
		policyId: v.id("policies"),
		embedding: v.array(v.number()),
		text: v.string(),
	}).index("by_policy", ["policyId"]),

	// Activity logs table
	activity_logs: defineTable({
		type: v.string(),
		message: v.string(),
		glId: v.optional(v.string()),
		createdAt: v.number(),
	}),
});
