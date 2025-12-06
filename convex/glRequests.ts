import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";

// ============== QUERIES ==============

/**
 * Get a GL request by ID
 */
export const get = query({
	args: { glId: v.id("glRequests") },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.glId);
	},
});

/**
 * Internal query to get a GL request (for use by actions/internal functions)
 */
export const getInternal = internalQuery({
	args: { glId: v.id("glRequests") },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.glId);
	},
});

/**
 * List all GL requests
 */
export const list = query({
	args: { limit: v.optional(v.number()) },
	handler: async (ctx, args) => {
		const limit = args.limit ?? 50;
		return await ctx.db.query("glRequests").order("desc").take(limit);
	},
});

/**
 * List GL requests by policy ID
 */
export const listByPolicy = query({
	args: { policyId: v.id("policyDocuments") },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("glRequests")
			.withIndex("by_policy", (q) => q.eq("policyId", args.policyId))
			.collect();
	},
});

/**
 * List GL requests by status
 */
export const listByStatus = query({
	args: {
		status: v.union(
			v.literal("pending"),
			v.literal("approved"),
			v.literal("denied"),
			v.literal("review"),
		),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("glRequests")
			.withIndex("by_status", (q) => q.eq("status", args.status))
			.collect();
	},
});

// ============== MUTATIONS ==============

/**
 * Create a new GL request
 */
export const create = mutation({
	args: {
		diagnosis: v.string(),
		diagnosisCode: v.optional(v.string()),
		symptomStartDate: v.string(),
		policyStartDate: v.string(),
		estimatedCost: v.number(),
		policyId: v.id("policyDocuments"),
		patientName: v.optional(v.string()),
		providerId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const glId = await ctx.db.insert("glRequests", {
			...args,
			status: "pending",
			createdAt: Date.now(),
		});
		return glId;
	},
});

/**
 * Update GL request with AI analysis results
 */
export const updateWithAnalysis = internalMutation({
	args: {
		glId: v.id("glRequests"),
		riskScore: v.number(),
		aiExplanation: v.string(),
		status: v.optional(
			v.union(
				v.literal("pending"),
				v.literal("approved"),
				v.literal("denied"),
				v.literal("review"),
			),
		),
	},
	handler: async (ctx, args) => {
		const { glId, ...updates } = args;
		await ctx.db.patch(glId, updates);
	},
});

/**
 * Update GL request status
 */
export const updateStatus = mutation({
	args: {
		glId: v.id("glRequests"),
		status: v.union(
			v.literal("pending"),
			v.literal("approved"),
			v.literal("denied"),
			v.literal("review"),
		),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.glId, { status: args.status });
	},
});
