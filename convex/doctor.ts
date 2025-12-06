import { v } from "convex/values";
import { api } from "./_generated/api";
import { action, mutation, query } from "./_generated/server";
import { logActivity } from "./utils/activityLog";
import { lookupPolicyForUser } from "./utils/policyLookup";

// Demo doctor ID for hackathon purposes
const DEMO_DOCTOR_ID = "demo_doctor_001";

// ============== QUERIES ==============

/**
 * Get all cases assigned to a doctor
 */
export const getCasesForDoctor = query({
	args: {
		doctorId: v.optional(v.string()),
	},
	async handler(ctx, args) {
		const doctorId = args.doctorId || DEMO_DOCTOR_ID;

		const cases = await ctx.db
			.query("gl_requests")
			.withIndex("by_assignedDoctor", (q) => q.eq("assignedDoctorId", doctorId))
			.collect();

		return cases
			.sort((a, b) => b.updatedAt - a.updatedAt)
			.map((gl) => {
				const matchedPolicy = lookupPolicyForUser(gl.insurerName);
				return {
					_id: gl._id,
					patientName: gl.patientName,
					insurerName: gl.insurerName,
					diagnosis: gl.diagnosis,
					estimatedCost: gl.estimatedCost,
					status: gl.status,
					riskBand: gl.riskBand,
					doctorStatus: gl.doctorStatus || "PENDING",
					primaryDiagnosis: gl.primaryDiagnosis,
					policyName: matchedPolicy?.productName,
					createdAt: gl.createdAt,
					updatedAt: gl.updatedAt,
				};
			});
	},
});

/**
 * Get a single case with its related report for doctor view
 */
export const getCaseWithReport = query({
	args: {
		glId: v.id("gl_requests"),
		doctorId: v.optional(v.string()),
	},
	async handler(ctx, args) {
		const doctorId = args.doctorId || DEMO_DOCTOR_ID;

		const gl = await ctx.db.get(args.glId);
		if (!gl) {
			return null;
		}

		// Get the latest report for this GL by this doctor
		const reports = await ctx.db
			.query("medical_reports")
			.withIndex("by_glRequest", (q) => q.eq("glRequestId", args.glId))
			.filter((q) => q.eq(q.field("doctorId"), doctorId))
			.collect();

		const latestReport =
			reports.sort((a, b) => b.updatedAt - a.updatedAt)[0] || null;

		// Get policy metadata
		const matchedPolicy = lookupPolicyForUser(gl.insurerName);

		return {
			gl: {
				_id: gl._id,
				patientName: gl.patientName,
				insurerName: gl.insurerName,
				diagnosis: gl.diagnosis,
				estimatedCost: gl.estimatedCost,
				status: gl.status,
				riskBand: gl.riskBand,
				riskExplanation: gl.riskExplanation,
				doctorStatus: gl.doctorStatus || "PENDING",
				primaryDiagnosis: gl.primaryDiagnosis,
				secondaryDiagnoses: gl.secondaryDiagnoses,
				clinicalNotes: gl.clinicalNotes,
				createdAt: gl.createdAt,
				updatedAt: gl.updatedAt,
			},
			report: latestReport
				? {
						_id: latestReport._id,
						status: latestReport.status,
						bodyJson: latestReport.bodyJson,
						internalNote: latestReport.internalNote,
						submittedAt: latestReport.submittedAt,
						createdAt: latestReport.createdAt,
						updatedAt: latestReport.updatedAt,
					}
				: null,
			policy: matchedPolicy,
		};
	},
});

/**
 * Get all reports for a doctor
 */
export const getReportsForDoctor = query({
	args: {
		doctorId: v.optional(v.string()),
	},
	async handler(ctx, args) {
		const doctorId = args.doctorId || DEMO_DOCTOR_ID;

		const reports = await ctx.db
			.query("medical_reports")
			.withIndex("by_doctor", (q) => q.eq("doctorId", doctorId))
			.collect();

		// Enrich with GL data
		const enrichedReports = await Promise.all(
			reports.map(async (report) => {
				const gl = await ctx.db.get(report.glRequestId);
				return {
					_id: report._id,
					glRequestId: report.glRequestId,
					status: report.status,
					patientName: gl?.patientName || "Unknown",
					insurerName: gl?.insurerName || "Unknown",
					glStatus: gl?.status || "Unknown",
					submittedAt: report.submittedAt,
					createdAt: report.createdAt,
					updatedAt: report.updatedAt,
				};
			}),
		);

		return enrichedReports.sort((a, b) => b.updatedAt - a.updatedAt);
	},
});

// ============== MUTATIONS ==============

/**
 * Save diagnosis fields for a GL request
 */
export const saveDiagnosis = mutation({
	args: {
		glId: v.id("gl_requests"),
		doctorId: v.optional(v.string()),
		primaryDiagnosis: v.string(),
		secondaryDiagnoses: v.optional(v.string()),
		clinicalNotes: v.optional(v.string()),
	},
	async handler(ctx, args) {
		const _doctorId = args.doctorId || DEMO_DOCTOR_ID;
		const now = Date.now();

		const gl = await ctx.db.get(args.glId);
		if (!gl) {
			throw new Error("GL request not found");
		}

		// Update GL with diagnosis fields
		await ctx.db.patch(args.glId, {
			primaryDiagnosis: args.primaryDiagnosis,
			secondaryDiagnoses: args.secondaryDiagnoses,
			clinicalNotes: args.clinicalNotes,
			doctorStatus: "DIAGNOSING",
			updatedAt: now,
		});

		// Log activity
		await logActivity(ctx, {
			type: "doctor_diagnosis_saved",
			glId: args.glId as unknown as string,
			message: `Doctor updated diagnosis for GL: ${args.primaryDiagnosis}`,
		});

		return { success: true };
	},
});

/**
 * Save or update a report draft
 */
export const saveReportDraft = mutation({
	args: {
		glId: v.id("gl_requests"),
		doctorId: v.optional(v.string()),
		bodyJson: v.object({
			clinicalSummary: v.optional(v.string()),
			history: v.optional(v.string()),
			investigations: v.optional(v.string()),
			treatmentPlan: v.optional(v.string()),
			opinion: v.optional(v.string()),
		}),
	},
	async handler(ctx, args) {
		const doctorId = args.doctorId || DEMO_DOCTOR_ID;
		const now = Date.now();

		const gl = await ctx.db.get(args.glId);
		if (!gl) {
			throw new Error("GL request not found");
		}

		// Check if there's an existing draft
		const existingReports = await ctx.db
			.query("medical_reports")
			.withIndex("by_glRequest", (q) => q.eq("glRequestId", args.glId))
			.filter((q) =>
				q.and(
					q.eq(q.field("doctorId"), doctorId),
					q.eq(q.field("status"), "DRAFT"),
				),
			)
			.collect();

		const existingDraft = existingReports[0];

		if (existingDraft) {
			// Update existing draft
			await ctx.db.patch(existingDraft._id, {
				bodyJson: args.bodyJson,
				updatedAt: now,
			});
		} else {
			// Create new draft
			await ctx.db.insert("medical_reports", {
				glRequestId: args.glId,
				doctorId,
				status: "DRAFT",
				bodyJson: args.bodyJson,
				createdAt: now,
				updatedAt: now,
			});
		}

		// Update GL status
		await ctx.db.patch(args.glId, {
			doctorStatus: "REPORT_DRAFT",
			updatedAt: now,
		});

		// Log activity
		await logActivity(ctx, {
			type: "doctor_report_draft_saved",
			glId: args.glId as unknown as string,
			message: `Doctor saved report draft for GL #${args.glId}`,
		});

		return { success: true };
	},
});

/**
 * Submit a finalized report
 */
export const submitReport = mutation({
	args: {
		glId: v.id("gl_requests"),
		doctorId: v.optional(v.string()),
		confirmation: v.boolean(),
		internalNote: v.optional(v.string()),
	},
	async handler(ctx, args) {
		if (!args.confirmation) {
			throw new Error("Confirmation is required to submit the report");
		}

		const doctorId = args.doctorId || DEMO_DOCTOR_ID;
		const now = Date.now();

		const gl = await ctx.db.get(args.glId);
		if (!gl) {
			throw new Error("GL request not found");
		}

		// Find the draft report
		const draftReports = await ctx.db
			.query("medical_reports")
			.withIndex("by_glRequest", (q) => q.eq("glRequestId", args.glId))
			.filter((q) =>
				q.and(
					q.eq(q.field("doctorId"), doctorId),
					q.eq(q.field("status"), "DRAFT"),
				),
			)
			.collect();

		const draft = draftReports[0];
		if (!draft) {
			throw new Error("No draft report found to submit");
		}

		// Update report to submitted
		await ctx.db.patch(draft._id, {
			status: "SUBMITTED",
			internalNote: args.internalNote,
			submittedAt: now,
			updatedAt: now,
		});

		// Update GL status
		await ctx.db.patch(args.glId, {
			doctorStatus: "SUBMITTED",
			hasDoctorReport: true,
			updatedAt: now,
		});

		// Log activity
		await logActivity(ctx, {
			type: "doctor_report_submitted",
			glId: args.glId as unknown as string,
			message: `Doctor submitted medical report for GL #${args.glId}${args.internalNote ? ` - Note: ${args.internalNote}` : ""}`,
		});

		return { success: true };
	},
});

/**
 * Generate a draft report using AI (action for LLM call)
 */
export const generateReportDraft = action({
	args: {
		glId: v.id("gl_requests"),
		doctorId: v.optional(v.string()),
	},
	async handler(
		ctx,
		args,
	): Promise<{
		clinicalSummary: string;
		history: string;
		investigations: string;
		treatmentPlan: string;
		opinion: string;
	}> {
		// Get case data
		const caseData = await ctx.runQuery(api.doctor.getCaseWithReport, {
			glId: args.glId,
			doctorId: args.doctorId,
		});

		if (!caseData) {
			throw new Error("GL request not found");
		}

		const { gl, policy } = caseData;

		// For hackathon demo: generate a mock AI report based on case data
		// In production, this would call the LLM/RAG pipeline
		const generatedDraft = {
			clinicalSummary: `Patient ${gl.patientName} presents with ${gl.diagnosis}. ${gl.primaryDiagnosis ? `Primary diagnosis: ${gl.primaryDiagnosis}.` : ""} ${gl.clinicalNotes || ""}`,
			history: gl.secondaryDiagnoses
				? `Relevant medical history includes: ${gl.secondaryDiagnoses}`
				: "No significant past medical history noted. Patient reports no known drug allergies.",
			investigations: `Clinical examination and diagnostic workup performed. Findings consistent with ${gl.diagnosis}. Laboratory and imaging results support the clinical diagnosis.`,
			treatmentPlan: `Recommended treatment plan for ${gl.diagnosis}. Estimated cost: RM ${gl.estimatedCost?.toLocaleString() || "TBD"}. ${policy ? `Treatment aligns with ${policy.productName} coverage guidelines.` : ""}`,
			opinion: `Based on clinical assessment, the proposed treatment is medically necessary and appropriate. ${gl.riskBand ? `Risk assessment: ${gl.riskBand}.` : ""} Recommend approval of the guarantee letter for the proposed treatment.`,
		};

		return generatedDraft;
	},
});
