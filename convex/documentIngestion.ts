/**
 * Document Ingestion Module
 * Handles policy and clinical document ingestion with Anthropic-based parsing
 */

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";

// ============== TYPES ==============

export interface ParsedClause {
	clauseId: string;
	type: "waiting_period" | "exclusion_general" | "exclusion_specific" | "sublimit" | "coverage" | "doc_requirement" | "pec_definition";
	tags: string[];
	text: string;
	pageRef?: string;
	waitingPeriodDays?: number;
	sublimitAmount?: number;
	sublimitCategory?: string;
}

export interface ParsedPayerConfig {
	waitingPeriods?: Array<{ conditionTag: string; days: number }>;
	exclusionsGeneral?: Array<{ tag: string; description: string }>;
	sublimits?: Array<{ category: string; amount: number; currency: string }>;
	annualMax?: number;
	lifetimeMax?: number;
}

export interface ClinicalParsedFindings {
	diagnoses?: string[];
	procedures?: string[];
	symptomDates?: string[];
	medicalHistory?: string[];
	pecIndicators?: string[];
	relevantTags?: string[];
}

// ============== QUERIES ==============

/**
 * Get policy clauses for a policy
 */
export const getPolicyClauses = query({
	args: { policyId: v.id("policyDocuments") },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("policyClauses")
			.withIndex("by_policy", (q) => q.eq("policyId", args.policyId))
			.collect();
	},
});

/**
 * Get payer config for a policy
 */
export const getPayerConfig = query({
	args: { policyId: v.id("policyDocuments") },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("payerPlanConfig")
			.withIndex("by_policy", (q) => q.eq("policyId", args.policyId))
			.first();
	},
});

/**
 * Get clinical documents for a GL request
 */
export const getClinicalDocuments = query({
	args: { glRequestId: v.id("glRequests") },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("clinicalDocuments")
			.withIndex("by_gl_request", (q) => q.eq("glRequestId", args.glRequestId))
			.collect();
	},
});

/**
 * List all clinical documents for a policy
 */
export const getClinicalDocsByPolicy = query({
	args: { policyId: v.id("policyDocuments") },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("clinicalDocuments")
			.withIndex("by_policy", (q) => q.eq("policyId", args.policyId))
			.collect();
	},
});

// ============== MUTATIONS ==============

/**
 * Store raw policy document text
 */
export const storePolicyRawText = mutation({
	args: {
		policyId: v.id("policyDocuments"),
		rawText: v.string(),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.policyId, {
			rawText: args.rawText,
			ingestionStatus: "processing",
		});
	},
});

/**
 * Internal mutation to store parsed clauses
 */
export const storeParsedClauses = internalMutation({
	args: {
		policyId: v.id("policyDocuments"),
		clauses: v.array(v.object({
			clauseId: v.string(),
			type: v.union(
				v.literal("waiting_period"),
				v.literal("exclusion_general"),
				v.literal("exclusion_specific"),
				v.literal("sublimit"),
				v.literal("coverage"),
				v.literal("doc_requirement"),
				v.literal("pec_definition"),
			),
			tags: v.array(v.string()),
			text: v.string(),
			pageRef: v.optional(v.string()),
			waitingPeriodDays: v.optional(v.number()),
			sublimitAmount: v.optional(v.number()),
			sublimitCategory: v.optional(v.string()),
		})),
	},
	handler: async (ctx, args) => {
		const insertedIds = [];
		for (const clause of args.clauses) {
			const id = await ctx.db.insert("policyClauses", {
				policyId: args.policyId,
				...clause,
				createdAt: Date.now(),
			});
			insertedIds.push(id);
		}
		return insertedIds;
	},
});

/**
 * Internal mutation to store or update payer config
 */
export const storePayerConfig = internalMutation({
	args: {
		policyId: v.id("policyDocuments"),
		payerName: v.string(),
		planCode: v.string(),
		config: v.object({
			waitingPeriods: v.optional(v.array(v.object({
				conditionTag: v.string(),
				days: v.number(),
				clauseId: v.optional(v.string()),
			}))),
			exclusionsGeneral: v.optional(v.array(v.object({
				tag: v.string(),
				description: v.string(),
				clauseId: v.optional(v.string()),
			}))),
			exclusionsSpecific: v.optional(v.array(v.object({
				code: v.string(),
				codeType: v.union(v.literal("icd10"), v.literal("procedure")),
				description: v.string(),
				clauseId: v.optional(v.string()),
			}))),
			sublimits: v.optional(v.array(v.object({
				category: v.string(),
				amount: v.number(),
				currency: v.string(),
				period: v.optional(v.string()),
				clauseId: v.optional(v.string()),
			}))),
			annualMax: v.optional(v.number()),
			lifetimeMax: v.optional(v.number()),
			currency: v.optional(v.string()),
			panelRequired: v.optional(v.boolean()),
		}),
	},
	handler: async (ctx, args) => {
		// Check if config exists
		const existing = await ctx.db
			.query("payerPlanConfig")
			.withIndex("by_policy", (q) => q.eq("policyId", args.policyId))
			.first();

		const now = Date.now();

		if (existing) {
			await ctx.db.patch(existing._id, {
				...args.config,
				updatedAt: now,
			});
			return existing._id;
		}

		return await ctx.db.insert("payerPlanConfig", {
			policyId: args.policyId,
			payerName: args.payerName,
			planCode: args.planCode,
			...args.config,
			createdAt: now,
			updatedAt: now,
		});
	},
});

/**
 * Public mutation to store parsed clauses (can be called from API routes)
 */
export const savePolicyClauses = mutation({
	args: {
		policyId: v.id("policyDocuments"),
		clauses: v.array(v.object({
			clauseId: v.string(),
			type: v.string(),
			tags: v.array(v.string()),
			text: v.string(),
			pageRef: v.optional(v.union(v.string(), v.null())),
			waitingPeriodDays: v.optional(v.union(v.number(), v.null())),
			sublimitAmount: v.optional(v.union(v.number(), v.null())),
			sublimitCategory: v.optional(v.union(v.string(), v.null())),
		})),
	},
	handler: async (ctx, args) => {
		const insertedIds = [];
		for (const clause of args.clauses) {
			const id = await ctx.db.insert("policyClauses", {
				policyId: args.policyId,
				clauseId: clause.clauseId,
				type: clause.type as "waiting_period" | "exclusion_general" | "exclusion_specific" | "sublimit" | "coverage" | "doc_requirement" | "pec_definition",
				tags: clause.tags,
				text: clause.text,
				// Convert null to undefined for optional fields
				pageRef: clause.pageRef ?? undefined,
				waitingPeriodDays: clause.waitingPeriodDays ?? undefined,
				sublimitAmount: clause.sublimitAmount ?? undefined,
				sublimitCategory: clause.sublimitCategory ?? undefined,
				createdAt: Date.now(),
			});
			insertedIds.push(id);
		}
		
		// Mark policy as completed
		await ctx.db.patch(args.policyId, {
			ingestionStatus: "completed",
		});
		
		return insertedIds;
	},
});

/**
 * Public mutation to store payer config (can be called from API routes)
 */
export const savePayerConfig = mutation({
	args: {
		policyId: v.id("policyDocuments"),
		config: v.object({
			waitingPeriods: v.optional(v.union(v.array(v.object({
				conditionTag: v.string(),
				days: v.number(),
			})), v.null())),
			exclusionsGeneral: v.optional(v.union(v.array(v.object({
				tag: v.string(),
				description: v.string(),
			})), v.null())),
			sublimits: v.optional(v.union(v.array(v.object({
				category: v.string(),
				amount: v.number(),
				currency: v.string(),
			})), v.null())),
			annualMax: v.optional(v.union(v.number(), v.null())),
			lifetimeMax: v.optional(v.union(v.number(), v.null())),
		}),
	},
	handler: async (ctx, args) => {
		// Check if config exists
		const existing = await ctx.db
			.query("payerPlanConfig")
			.withIndex("by_policy", (q) => q.eq("policyId", args.policyId))
			.first();

		const policy = await ctx.db.get(args.policyId);
		const now = Date.now();

		// Convert null to undefined for all fields
		const cleanConfig = {
			waitingPeriods: args.config.waitingPeriods ?? undefined,
			exclusionsGeneral: args.config.exclusionsGeneral ?? undefined,
			sublimits: args.config.sublimits ?? undefined,
			annualMax: args.config.annualMax ?? undefined,
			lifetimeMax: args.config.lifetimeMax ?? undefined,
		};

		if (existing) {
			await ctx.db.patch(existing._id, {
				...cleanConfig,
				updatedAt: now,
			});
			return existing._id;
		}

		return await ctx.db.insert("payerPlanConfig", {
			policyId: args.policyId,
			payerName: policy?.insurerName || "Unknown",
			planCode: policy?.productName || "Unknown",
			...cleanConfig,
			createdAt: now,
			updatedAt: now,
		});
	},
});

/**
 * Mark policy ingestion as complete
 */
export const markPolicyIngestionComplete = internalMutation({
	args: {
		policyId: v.id("policyDocuments"),
		metadata: v.optional(v.object({
			totalPages: v.optional(v.number()),
			extractedDate: v.optional(v.string()),
			documentType: v.optional(v.string()),
			version: v.optional(v.string()),
		})),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.policyId, {
			ingestionStatus: "completed",
			parsedMetadata: args.metadata,
		});
	},
});

/**
 * Mark policy ingestion as failed
 */
export const markPolicyIngestionFailed = internalMutation({
	args: { policyId: v.id("policyDocuments") },
	handler: async (ctx, args) => {
		await ctx.db.patch(args.policyId, {
			ingestionStatus: "failed",
		});
	},
});

/**
 * Create a clinical document
 */
export const createClinicalDocument = mutation({
	args: {
		glRequestId: v.optional(v.id("glRequests")),
		policyId: v.optional(v.id("policyDocuments")),
		docType: v.union(
			v.literal("doctor_report"),
			v.literal("clinical_note"),
			v.literal("itemized_estimate"),
			v.literal("imaging"),
			v.literal("lab_result"),
			v.literal("referral_letter"),
			v.literal("other"),
		),
		fileName: v.optional(v.string()),
		rawText: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("clinicalDocuments", {
			...args,
			ingestionStatus: "pending",
			createdAt: Date.now(),
		});
	},
});

/**
 * Internal mutation to update clinical document with parsed findings
 */
export const updateClinicalDocWithFindings = internalMutation({
	args: {
		docId: v.id("clinicalDocuments"),
		findings: v.object({
			diagnoses: v.optional(v.array(v.string())),
			procedures: v.optional(v.array(v.string())),
			symptomDates: v.optional(v.array(v.string())),
			medicalHistory: v.optional(v.array(v.string())),
			pecIndicators: v.optional(v.array(v.string())),
			relevantTags: v.optional(v.array(v.string())),
		}),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.docId, {
			parsedFindings: args.findings,
			ingestionStatus: "completed",
		});
	},
});

// ============== INTERNAL QUERIES ==============

/**
 * Get policy document for parsing
 */
export const getPolicyForParsing = internalQuery({
	args: { policyId: v.id("policyDocuments") },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.policyId);
	},
});

/**
 * Get clinical document for parsing
 */
export const getClinicalDocForParsing = internalQuery({
	args: { docId: v.id("clinicalDocuments") },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.docId);
	},
});

