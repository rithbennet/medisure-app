import { mutation, query, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";

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



