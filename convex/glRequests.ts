import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import {
	internalMutation,
	internalQuery,
	type MutationCtx,
	mutation,
	query,
} from "./_generated/server";
import { logActivity } from "./utils/activityLog";
import { lookupPolicyForUser, type PolicyMetadata } from "./utils/policyLookup";

type CreateGLArgs = {
	patientName: string;
	insurerName: string;
	diagnosis: string;
	estimatedCost?: number;
};

export type GLRequestWithPolicy = {
	_id: string;
	creationTime: number;
	patientName: string;
	insurerName: string;
	diagnosis: string;
	estimatedCost?: number;
	status: string;
	policyId?: string | null;
	riskBand?: string;
	riskExplanation?: string;
	policy?: PolicyMetadata | null;
};

// ============== HEAD VERSION FUNCTIONS ==============

export const createGLRequest = mutation({
	args: {
		patientName: v.string(),
		insurerName: v.string(),
		diagnosis: v.string(),
		estimatedCost: v.optional(v.number()),
	},
	async handler(
		ctx: MutationCtx,
		args: CreateGLArgs,
	): Promise<GLRequestWithPolicy> {
		const now = Date.now();
		const matchedPolicy = lookupPolicyForUser(args.insurerName);

		const glId = await ctx.db.insert("gl_requests", {
			patientName: args.patientName,
			insurerName: args.insurerName,
			diagnosis: args.diagnosis,
			estimatedCost: args.estimatedCost,
			status: "DRAFT",
			policyId: matchedPolicy?.id,
			riskBand: undefined,
			riskExplanation: undefined,
			createdAt: now,
			updatedAt: now,
		});

		await logActivity(ctx, {
			type: "gl_created",
			glId: glId as unknown as string,
			message: matchedPolicy
				? `Auto-matched policy: ${matchedPolicy.productName} (${matchedPolicy.insurerName})`
				: `No indexed policy found for insurer ${args.insurerName}.`,
		});

		return {
			_id: glId as unknown as string,
			creationTime: now,
			patientName: args.patientName,
			insurerName: args.insurerName,
			diagnosis: args.diagnosis,
			estimatedCost: args.estimatedCost,
			status: "DRAFT",
			policyId: matchedPolicy ? matchedPolicy.id : null,
			riskBand: undefined,
			riskExplanation: undefined,
			policy: matchedPolicy,
		};
	},
});

export const getGLRequests = query({
	args: {},
	async handler(ctx): Promise<GLRequestWithPolicy[]> {
		const gls = await ctx.db.query("gl_requests").collect();

		return gls
			.sort((a, b) => b.createdAt - a.createdAt)
			.map((gl: Doc<"gl_requests">) => {
				const matchedPolicy = lookupPolicyForUser(gl.insurerName);

				return {
					_id: gl._id as string,
					creationTime: gl.createdAt,
					patientName: gl.patientName,
					insurerName: gl.insurerName,
					diagnosis: gl.diagnosis,
					estimatedCost: gl.estimatedCost,
					status: gl.status,
					policyId: gl.policyId as string | null | undefined,
					riskBand: gl.riskBand,
					riskExplanation: gl.riskExplanation,
					policy: matchedPolicy,
				};
			});
	},
});

export const getGLById = query({
	args: {
		id: v.id("gl_requests"),
	},
	async handler(ctx, args): Promise<GLRequestWithPolicy | null> {
		const gl = await ctx.db.get(args.id);

		if (!gl) {
			return null;
		}

		const matchedPolicy = lookupPolicyForUser(gl.insurerName);

		return {
			_id: gl._id as string,
			creationTime: gl.createdAt,
			patientName: gl.patientName,
			insurerName: gl.insurerName,
			diagnosis: gl.diagnosis,
			estimatedCost: gl.estimatedCost,
			status: gl.status,
			policyId: gl.policyId as string | null | undefined,
			riskBand: gl.riskBand,
			riskExplanation: gl.riskExplanation,
			policy: matchedPolicy,
		};
	},
});

export const setInsurerOutcome = mutation({
	args: {
		id: v.id("gl_requests"),
		status: v.string(),
	},
	async handler(ctx: MutationCtx, args): Promise<void> {
		await ctx.db.patch(args.id, {
			status: args.status,
			updatedAt: Date.now(),
		});

		await logActivity(ctx, {
			type: "insurer_outcome_set",
			glId: args.id as string,
			message: `Insurer outcome set to ${args.status}.`,
		});
	},
});

// ============== FEATURE BRANCH FUNCTIONS ==============

/**
 * Get a GL request by ID (for glRequests table)
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
 * List all GL requests (for glRequests table)
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
 * Create a new GL request (for glRequests table)
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
 * Update GL request status (for glRequests table)
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
