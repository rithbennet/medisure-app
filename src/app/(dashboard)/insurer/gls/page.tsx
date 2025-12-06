'use client';

import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';

import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { api } from '../../../../../convex/_generated/api';

type Outcome = 'APPROVED' | 'PENDING' | 'REJECTED';

export default function InsurerQueuePage() {
	const glRequests = useQuery(api.glRequests.getGLRequests, {});
	const setOutcome = useMutation(api.glRequests.setInsurerOutcome);
	const [updatingId, setUpdatingId] = useState<string | null>(null);

	async function handleSimulateOutcome(id: string, status: Outcome) {
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
						<p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
							Insurer Simulation
						</p>
						<CardTitle className="text-section-title text-gray-900">
							Insurer GL Review Queue
						</CardTitle>
						<CardDescription className="text-sm text-muted-foreground">
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
							<p className="text-sm text-muted-foreground">
								Loading insurer queue&hellip;
							</p>
						) : glRequests.length > 0 ? (
							<div className="space-y-3">
								<div className="grid grid-cols-[1.6fr_1fr_1fr_1.4fr] gap-3 border-b border-gray-100 pb-2 text-xs font-medium text-muted-foreground">
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
												<p className="line-clamp-1 text-xs text-muted-foreground">
													{gl.diagnosis}
												</p>
											</div>
											<p className="text-xs text-gray-900">{gl.insurerName}</p>
											<p className="text-xs text-muted-foreground">
												{gl.status}
											</p>
											<div className="flex flex-wrap justify-end gap-2">
												<Button
													className="h-7 px-3 text-xs"
													disabled={updatingId === gl._id}
													onClick={() =>
														handleSimulateOutcome(gl._id as string, 'APPROVED')
													}
													size="sm"
													variant="outline"
												>
													Approve
												</Button>
												<Button
													className="h-7 px-3 text-xs"
													disabled={updatingId === gl._id}
													onClick={() =>
														handleSimulateOutcome(gl._id as string, 'PENDING')
													}
													size="sm"
													variant="outline"
												>
													Pending
												</Button>
												<Button
													className="h-7 px-3 text-xs"
													disabled={updatingId === gl._id}
													onClick={() =>
														handleSimulateOutcome(gl._id as string, 'REJECTED')
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
							<div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-sm text-muted-foreground">
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

