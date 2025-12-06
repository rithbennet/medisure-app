import type { MutationCtx } from "../_generated/server";

export async function logActivity(
	ctx: MutationCtx,
	event: {
		type: string;
		message: string;
		glId?: string;
	},
) {
	const now = Date.now();

	await ctx.db.insert("activity_logs", {
		type: event.type,
		message: event.message,
		glId: event.glId,
		createdAt: now,
	});
}


