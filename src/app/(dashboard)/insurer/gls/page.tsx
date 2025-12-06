"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

type Outcome = "APPROVED" | "PENDING" | "REJECTED";

export default function InsurerQueuePage() {
	const glRequests = useQuery(api.glRequests.getGLRequests, {});
	const setOutcome = useMutation(api.glRequests.setInsurerOutcome);
	const [updatingId, setUpdatingId] = useState<Id<"gl_requests"> | null>(null);

	async function handleSimulateOutcome(id: Id<"gl_requests">, status: Outcome) {
		try {
			setUpdatingId(id);
			await setOutcome({ id, status });
		} finally {
			setUpdatingId(null);
		}
	}

	return (
		<div className="space-y-6">
			<section>
				<Card className="bg-white shadow-soft-md">
					<CardHeader>
						<p className="text-muted-foreground text-xs uppercase tracking-[0.3em]">
							Insurer Simulation
						</p>
						<CardTitle className="text-gray-900 text-section-title">
							Insurer GL Review Queue
						</CardTitle>
						<CardDescription className="text-muted-foreground text-sm">
							See how an insurer might view coordinator submissions in a
							prioritised list.
						</CardDescription>
					</CardHeader>
				</Card>
			</section>

			<section>
				<Card className="bg-white">
					<CardHeader>
						<CardTitle className="text-card-title text-gray-900">
							Ready-for-review GLs
						</CardTitle>
						<CardDescription>
							GLs created by the coordinator appear here in real time. Use the
							buttons to simulate an insurer decision.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{glRequests === undefined ? (
							<p className="text-muted-foreground text-sm">
								Loading insurer queue&hellip;
							</p>
						) : glRequests.length > 0 ? (
							<div className="space-y-3">
								<div className="grid grid-cols-[1.6fr_1fr_1fr_1.4fr] gap-3 border-gray-100 border-b pb-2 font-medium text-muted-foreground text-xs">
									<p>Patient &amp; diagnosis</p>
									<p>Insurer</p>
									<p>Current status</p>
									<p className="text-right">Simulate outcome</p>
								</div>
								<ul className="space-y-2 text-sm">
									{glRequests.map((gl) => (
										<li
											className="grid grid-cols-[1.6fr_1fr_1fr_1.4fr] items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
											key={gl._id}
										>
											<div className="space-y-0.5">
												<p className="font-medium text-gray-900">
													{gl.patientName}
												</p>
												<p className="line-clamp-1 text-muted-foreground text-xs">
													{gl.diagnosis}
												</p>
											</div>
											<p className="text-gray-900 text-xs">{gl.insurerName}</p>
											<p className="text-muted-foreground text-xs">
												{gl.status}
											</p>
											<div className="flex flex-wrap justify-end gap-2">
												<Button
													className="h-7 px-3 text-xs"
													disabled={
														updatingId === (gl._id as Id<"gl_requests">)
													}
													onClick={() =>
														handleSimulateOutcome(
															gl._id as Id<"gl_requests">,
															"APPROVED",
														)
													}
													size="sm"
													variant="outline"
												>
													Approve
												</Button>
												<Button
													className="h-7 px-3 text-xs"
													disabled={
														updatingId === (gl._id as Id<"gl_requests">)
													}
													onClick={() =>
														handleSimulateOutcome(
															gl._id as Id<"gl_requests">,
															"PENDING",
														)
													}
													size="sm"
													variant="outline"
												>
													Pending
												</Button>
												<Button
													className="h-7 px-3 text-xs"
													disabled={
														updatingId === (gl._id as Id<"gl_requests">)
													}
													onClick={() =>
														handleSimulateOutcome(
															gl._id as Id<"gl_requests">,
															"REJECTED",
														)
													}
													size="sm"
													variant="outline"
												>
													Reject
												</Button>
											</div>
										</li>
									))}
								</ul>
							</div>
						) : (
							<div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-muted-foreground text-sm">
								<p className="font-medium text-gray-900">
									No GLs in the insurer queue yet.
								</p>
								<p className="max-w-md">
									Create a GL as the coordinator and it will appear here for
									simulated Approve / Pending / Reject decisions.
								</p>
							</div>
						)}
					</CardContent>
				</Card>
			</section>
		</div>
	);
}
