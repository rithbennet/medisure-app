"use client";

import { useQuery } from "convex/react";
import { useMemo } from "react";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { api } from "../../../../../convex/_generated/api";

type ActivityLog = {
	_id: string;
	type: string;
	message: string;
	glId?: string;
	createdAt: number;
};

type TimelineItem = {
	id: string;
	time: string;
	title: string;
	body: string;
};

function getTitle(type: string): string {
	if (type === "gl_created") return "GL created";
	if (type === "insurer_outcome_set") return "Insurer outcome updated";
	return type;
}

function ActivityContent({
	activity,
	items,
}: Readonly<{
	activity: ActivityLog[] | undefined;
	items: TimelineItem[];
}>) {
	if (activity === undefined) {
		return (
			<p className="text-muted-foreground text-sm">
				Loading activity log&hellip;
			</p>
		);
	}

	if (items.length === 0) {
		return (
			<p className="text-muted-foreground text-sm">
				No activity yet. Create a GL and simulate an insurer outcome to see
				events appear here.
			</p>
		);
	}

	return (
		<ol className="relative border-gray-200 border-l pl-4">
			{items.map((event: TimelineItem) => (
				<li className="mb-6 ml-2 last:mb-0" key={event.id}>
					<div className="-left-[9px] absolute mt-1 h-2.5 w-2.5 rounded-full bg-blue-500" />
					<p className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
						{event.time}
					</p>
					<p className="mt-1 font-semibold text-gray-900 text-sm">
						{event.title}
					</p>
					<p className="mt-1 text-muted-foreground text-xs">{event.body}</p>
				</li>
			))}
		</ol>
	);
}

export default function ActivityPage() {
	const activity = useQuery(api.activityLogs.listActivity, {}) as
		| ActivityLog[]
		| undefined;

	const items: TimelineItem[] = useMemo(
		() =>
			activity?.map((log: ActivityLog) => ({
				id: log._id,
				time: new Date(log.createdAt).toLocaleTimeString(undefined, {
					hour: "2-digit",
					minute: "2-digit",
				}),
				title: getTitle(log.type),
				body: log.message,
			})) ?? [],
		[activity],
	);

	return (
		<div className="space-y-6">
			<section>
				<Card className="bg-white shadow-soft-md">
					<CardHeader>
						<p className="text-muted-foreground text-xs uppercase tracking-[0.3em]">
							Activity
						</p>
						<CardTitle className="text-gray-900 text-section-title">
							Activity Log
						</CardTitle>
						<CardDescription className="text-muted-foreground text-sm">
							A narrative timeline of key demo events — perfect for judges and
							stakeholders following along.
						</CardDescription>
					</CardHeader>
				</Card>
			</section>

			<section>
				<Card className="bg-white">
					<CardHeader>
						<CardTitle className="text-card-title text-gray-900">
							Recent activity
						</CardTitle>
						<CardDescription>
							Events are streamed from Convex whenever GLs are created or
							insurer outcomes are simulated.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ActivityContent activity={activity} items={items} />
					</CardContent>
				</Card>
			</section>
		</div>
	);
}
