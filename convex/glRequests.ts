import { mutation, query, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

import { lookupPolicyForUser, type PolicyMetadata } from "./utils/policyLookup";
import { logActivity } from "./utils/activityLog";

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
	async handler(ctx: MutationCtx, args: CreateGLArgs): Promise<GLRequestWithPolicy> {
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
			.sort((a, b) => (b.createdAt as number) - (a.createdAt as number))
			.map((gl: any) => {
				const matchedPolicy = lookupPolicyForUser(gl.insurerName as string);

				return {
					_id: gl._id as string,
					creationTime: gl.createdAt as number,
					patientName: gl.patientName as string,
					insurerName: gl.insurerName as string,
					diagnosis: gl.diagnosis as string,
					estimatedCost: gl.estimatedCost as number | undefined,
					status: gl.status as string,
					policyId: gl.policyId as string | null | undefined,
					riskBand: gl.riskBand as string | undefined,
					riskExplanation: gl.riskExplanation as string | undefined,
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
 * Create a new GL request (for glRequests table) - basic version
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
 * Create a comprehensive GL request with all fields for AI analysis
 * This is the unified mutation that supports the full workflow
 */
export const createComprehensive = mutation({
	args: {
		// Required fields
		patientName: v.string(),
		diagnosis: v.string(),
		estimatedCost: v.number(),
		policyId: v.id("policyDocuments"),
		symptomStartDate: v.string(),
		policyStartDate: v.string(),
		// Optional fields for enhanced analysis
		diagnosisCode: v.optional(v.string()),
		encounterType: v.optional(v.union(
			v.literal("inpatient"),
			v.literal("outpatient"),
			v.literal("ed"),
			v.literal("day_surgery"),
		)),
		plannedDate: v.optional(v.string()),
		emergencyFlag: v.optional(v.boolean()),
		accidentFlag: v.optional(v.boolean()),
		panelStatus: v.optional(v.union(
			v.literal("panel"),
			v.literal("non_panel"),
			v.literal("unknown"),
		)),
		estimateBreakdown: v.optional(v.array(v.object({
			category: v.string(),
			amount: v.number(),
		}))),
		providerId: v.optional(v.string()),
		// Document attachments (I-4.3)
		attachments: v.optional(v.array(v.object({
			type: v.string(),
			fileName: v.string(),
		}))),
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
 * Ensure a default policy exists for the given insurer
 * Returns existing policy ID or creates a new one
 */
export const ensureDefaultPolicy = mutation({
	args: {
		insurerName: v.string(),
	},
	handler: async (ctx, args) => {
		// Check if a policy exists for this insurer
		const existingPolicy = await ctx.db
			.query("policyDocuments")
			.withIndex("by_insurer", (q) => q.eq("insurerName", args.insurerName))
			.first();

		if (existingPolicy) {
			return existingPolicy._id;
		}

		// Create a default policy for the insurer
		const policyId = await ctx.db.insert("policyDocuments", {
			insurerName: args.insurerName,
			productName: `${args.insurerName} Standard Health Plan`,
			planType: "Standard",
			indexed: false,
			createdAt: Date.now(),
		});

		return policyId;
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
 * Automatically captures calibration data when status changes to approved/denied
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
		outcomeNotes: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		
		// Get current GL request to capture prediction data
		const glRequest = await ctx.db.get(args.glId);
		if (!glRequest) {
			throw new Error("GL request not found");
		}

		// Update status
		const updates: Record<string, unknown> = { status: args.status };

		// If status is approved or denied, capture calibration data
		if (args.status === "approved" || args.status === "denied") {
			updates.actualOutcome = args.status;
			updates.outcomeSetAt = now;
			if (args.outcomeNotes) {
				updates.outcomeNotes = args.outcomeNotes;
			}

			// Only create calibration data if we have a prediction
			if (glRequest.approvalProbability !== undefined && glRequest.rulesEvaluatedAt) {
				const signals = glRequest.signals || [];
				const blockers = signals.filter((s: { severity: string }) => s.severity === "Blocker");
				const warnings = signals.filter((s: { severity: string }) => s.severity === "Warning");
				const missingItems = glRequest.missingItems || [];

				// Store calibration data point
				await ctx.db.insert("calibrationData", {
					glRequestId: args.glId,
					predictedProbability: glRequest.approvalProbability,
					scoreBucket: glRequest.scoreBucket || "Low",
					signalCount: signals.length,
					blockerCount: blockers.length,
					warningCount: warnings.length,
					missingItemCount: missingItems.length,
					actualOutcome: args.status === "approved" ? "approved" : "denied",
					diagnosis: glRequest.diagnosis,
					diagnosisCode: glRequest.diagnosisCode,
					estimatedCost: glRequest.estimatedCost,
					policyId: glRequest.policyId,
					encounterType: glRequest.encounterType,
					evaluatedAt: glRequest.rulesEvaluatedAt,
					outcomeSetAt: now,
					outcomeNotes: args.outcomeNotes,
					createdAt: now,
				});
			}
		}

		await ctx.db.patch(args.glId, updates);
	},
});

// ============== CALIBRATION DATA EXPORT ==============

/**
 * Get all calibration data points for model training
 * Returns prediction-outcome pairs with context
 */
export const getCalibrationDataset = query({
	args: {
		minSamples: v.optional(v.number()), // Minimum number of samples required
		startDate: v.optional(v.number()), // Filter by outcome date
		endDate: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		let query = ctx.db.query("calibrationData");

		// Apply date filters if provided
		if (args.startDate || args.endDate) {
			// Note: Convex doesn't support range queries directly, so we'll filter in memory
			// For large datasets, consider adding an index on outcomeSetAt
			const allData = await query.collect();
			
			const filtered = allData.filter((item) => {
				if (args.startDate && item.outcomeSetAt < args.startDate) return false;
				if (args.endDate && item.outcomeSetAt > args.endDate) return false;
				return true;
			});

			// Check minimum samples
			if (args.minSamples && filtered.length < args.minSamples) {
				return {
					data: [],
					count: filtered.length,
					meetsMinimum: false,
					message: `Only ${filtered.length} samples available, need ${args.minSamples} for training`,
				};
			}

			return {
				data: filtered,
				count: filtered.length,
				meetsMinimum: true,
			};
		}

		const allData = await query.collect();

		if (args.minSamples && allData.length < args.minSamples) {
			return {
				data: [],
				count: allData.length,
				meetsMinimum: false,
				message: `Only ${allData.length} samples available, need ${args.minSamples} for training`,
			};
		}

		return {
			data: allData,
			count: allData.length,
			meetsMinimum: true,
		};
	},
});

/**
 * Get calibration statistics for analysis
 */
export const getCalibrationStats = query({
	args: {},
	handler: async (ctx) => {
		const allData = await ctx.db.query("calibrationData").collect();

		if (allData.length === 0) {
			return {
				totalSamples: 0,
				message: "No calibration data available yet",
			};
		}

		const approved = allData.filter((d) => d.actualOutcome === "approved").length;
		const denied = allData.filter((d) => d.actualOutcome === "denied").length;
		
		// Calculate calibration metrics
		const avgPredictedProb = allData.reduce((sum, d) => sum + d.predictedProbability, 0) / allData.length;
		const actualApprovalRate = approved / allData.length;

		// Group by score bucket
		const byBucket: Record<string, { count: number; approved: number; avgProb: number }> = {};
		for (const item of allData) {
			const bucket = item.scoreBucket;
			if (!byBucket[bucket]) {
				byBucket[bucket] = { count: 0, approved: 0, avgProb: 0 };
			}
			byBucket[bucket].count++;
			if (item.actualOutcome === "approved") {
				byBucket[bucket].approved++;
			}
			byBucket[bucket].avgProb += item.predictedProbability;
		}

		// Calculate averages per bucket
		for (const bucket of Object.keys(byBucket)) {
			byBucket[bucket].avgProb /= byBucket[bucket].count;
		}

		return {
			totalSamples: allData.length,
			approved,
			denied,
			actualApprovalRate,
			averagePredictedProbability: avgPredictedProb,
			calibrationError: Math.abs(avgPredictedProb - actualApprovalRate),
			byBucket,
			readyForTraining: allData.length >= 100, // Recommend at least 100 samples
		};
	},
});

/**
 * Export calibration dataset as CSV-ready format
 */
export const exportCalibrationDataset = query({
	args: {},
	handler: async (ctx) => {
		const allData = await ctx.db.query("calibrationData").collect();

		// Format for CSV export or model training
		return allData.map((item) => ({
			// Prediction features
			predicted_probability: item.predictedProbability,
			score_bucket: item.scoreBucket,
			signal_count: item.signalCount,
			blocker_count: item.blockerCount,
			warning_count: item.warningCount,
			missing_item_count: item.missingItemCount,
			// Outcome (target variable)
			actual_outcome: item.actualOutcome,
			actual_approved: item.actualOutcome === "approved" ? 1 : 0,
			// Context features
			diagnosis: item.diagnosis,
			diagnosis_code: item.diagnosisCode || "",
			estimated_cost: item.estimatedCost,
			encounter_type: item.encounterType || "",
			// Metadata
			gl_request_id: item.glRequestId,
			policy_id: item.policyId,
			evaluated_at: item.evaluatedAt,
			outcome_set_at: item.outcomeSetAt,
		}));
	},
});

