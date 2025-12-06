import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const listPatients = query({
	args: {},
	async handler(ctx) {
		const patients = await ctx.db.query("patients").collect();
		return patients.sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);
	},
});

export const createPatient = mutation({
	args: {
		name: v.string(),
		insurer: v.string(),
		policyId: v.optional(v.id("policies")),
	},
	async handler(ctx, args) {
		const patientId = await ctx.db.insert("patients", {
			name: args.name,
			insurer: args.insurer,
			policyId: args.policyId,
			createdAt: Date.now(),
		});

		return patientId;
	},
});

export const createDoctorCase = mutation({
	args: {
		patientId: v.optional(v.id("patients")),
		patientName: v.string(),
		insurerName: v.string(),
		diagnosis: v.string(),
		notes: v.optional(v.string()),
		estimatedCost: v.optional(v.number()),
		// Structured clinical fields
		symptoms: v.optional(v.string()),
		findings: v.optional(v.string()),
		labs: v.optional(v.string()),
		plan: v.optional(v.string()),
	},
	async handler(ctx, args) {
		const now = Date.now();

		// Build comprehensive notes from all fields
		const notesParts = [
			args.diagnosis && `Working diagnosis: ${args.diagnosis}`,
			args.symptoms && `Symptoms/onset: ${args.symptoms}`,
			args.findings && `Findings/imaging: ${args.findings}`,
			args.labs && `Labs: ${args.labs}`,
			args.plan && `Plan/intervention: ${args.plan}`,
			args.notes && `Notes: ${args.notes}`,
		].filter(Boolean);
		const comprehensiveNotes = notesParts.join("\n");

		const glRequestId = await ctx.db.insert("gl_requests", {
			patientId: args.patientId,
			patientName: args.patientName,
			insurerName: args.insurerName,
			diagnosis: args.diagnosis,
			estimatedCost: args.estimatedCost,
			status: "DOCTOR_DRAFT",
			riskBand: undefined,
			riskExplanation: comprehensiveNotes || args.notes,
			createdAt: now,
			updatedAt: now,
		});

		return { glRequestId, createdAt: now };
	},
});

export const listDoctorCases = query({
	args: {},
	async handler(ctx) {
		const cases = await ctx.db.query("gl_requests").collect();
		return cases.sort((a, b) => b.createdAt - a.createdAt).slice(0, 30);
	},
});
