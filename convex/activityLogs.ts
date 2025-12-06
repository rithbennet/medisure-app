import { query } from "./_generated/server";

export type ActivityLog = {
	_id: string;
	type: string;
	message: string;
	glId?: string;
	createdAt: number;
};

export const listActivity = query({
	args: {},
	async handler(ctx): Promise<ActivityLog[]> {
		const logs = await ctx.db.query("activity_logs").collect();

		return logs
			.sort((a, b) => (b.createdAt as number) - (a.createdAt as number))
			.map((log: any) => ({
				_id: log._id as string,
				type: log.type as string,
				message: log.message as string,
				glId: log.glId as string | undefined,
				createdAt: log.createdAt as number,
			}));
	},
});


