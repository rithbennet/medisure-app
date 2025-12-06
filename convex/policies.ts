import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
	action,
	internalMutation,
	internalQuery,
	mutation,
	query,
} from "./_generated/server";
import { getAllDemoPolicies } from "./utils/policyLookup";

// ============== QUERIES ==============

/**
 * Get a policy document by ID
 */
export const getPolicy = query({
	args: { policyId: v.id("policyDocuments") },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.policyId);
	},
});

/**
 * List all policies
 */
export const listPolicies = query({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.query("policyDocuments").collect();
	},
});

/**
 * Get policy chunks by policy ID
 */
export const getPolicyChunks = query({
	args: { policyId: v.id("policyDocuments") },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("policyChunks")
			.withIndex("by_policy", (q) => q.eq("policyId", args.policyId))
			.collect();
	},
});

/**
 * List demo policies (hardcoded demo data)
 */
export const listDemoPolicies = query({
	args: {},
	handler: async () => {
		return getAllDemoPolicies();
	},
});

// ============== MUTATIONS ==============

/**
 * Create a new policy document
 */
export const createPolicy = mutation({
	args: {
		insurerName: v.string(),
		productName: v.string(),
		planType: v.optional(v.string()),
		fileUrl: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const policyId = await ctx.db.insert("policyDocuments", {
			...args,
			indexed: false,
			createdAt: Date.now(),
		});
		return policyId;
	},
});

/**
 * Add a chunk to a policy (internal - called from action after embedding)
 */
export const addPolicyChunk = internalMutation({
	args: {
		policyId: v.id("policyDocuments"),
		text: v.string(),
		embedding: v.array(v.float64()),
		chunkIndex: v.number(),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("policyChunks", args);
	},
});

/**
 * Mark policy as indexed
 */
export const markPolicyIndexed = internalMutation({
	args: { policyId: v.id("policyDocuments") },
	handler: async (ctx, args) => {
		await ctx.db.patch(args.policyId, { indexed: true });
	},
});

// ============== INTERNAL QUERIES ==============

/**
 * Internal query to get chunks for vector search results
 */
export const getChunksByIds = internalQuery({
	args: { chunkIds: v.array(v.id("policyChunks")) },
	handler: async (ctx, args) => {
		const chunks = await Promise.all(args.chunkIds.map((id) => ctx.db.get(id)));
		return chunks.filter((chunk) => chunk !== null);
	},
});

// ============== ACTIONS ==============

/**
 * Vector search action to find relevant policy chunks
 */
export const searchPolicyChunks = action({
	args: {
		policyId: v.id("policyDocuments"),
		queryEmbedding: v.array(v.float64()),
		limit: v.optional(v.number()),
	},
	handler: async (
		ctx,
		args,
	): Promise<
		Array<{
			_id: string;
			_creationTime: number;
			policyId: string;
			text: string;
			embedding: number[];
			chunkIndex: number;
		}>
	> => {
		const results = await ctx.vectorSearch("policyChunks", "by_embedding", {
			vector: args.queryEmbedding,
			limit: args.limit ?? 5,
			filter: (q) => q.eq("policyId", args.policyId),
		});

		// Get the full chunk documents
		const chunkIds = results.map((r) => r._id);
		const chunks = await ctx.runQuery(internal.policies.getChunksByIds, {
			chunkIds,
		});

		return chunks as Array<{
			_id: string;
			_creationTime: number;
			policyId: string;
			text: string;
			embedding: number[];
			chunkIndex: number;
		}>;
	},
});

/**
 * Ingest policy text - chunks and embeds the text
 * Note: Embedding is done externally via the AI SDK, passed in as an argument
 */
export const ingestPolicyChunk = action({
	args: {
		policyId: v.id("policyDocuments"),
		text: v.string(),
		embedding: v.array(v.float64()),
		chunkIndex: v.number(),
	},
	handler: async (ctx, args) => {
		await ctx.runMutation(internal.policies.addPolicyChunk, {
			policyId: args.policyId,
			text: args.text,
			embedding: args.embedding,
			chunkIndex: args.chunkIndex,
		});
	},
});

/**
 * Mark policy as fully indexed after all chunks are ingested
 */
export const finalizePolicyIndexing = action({
	args: { policyId: v.id("policyDocuments") },
	handler: async (ctx, args) => {
		await ctx.runMutation(internal.policies.markPolicyIndexed, {
			policyId: args.policyId,
		});
	},
});
