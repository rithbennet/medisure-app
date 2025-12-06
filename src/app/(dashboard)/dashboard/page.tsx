'use client';

import Link from "next/link";

import { useQuery } from "convex/react";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { api } from "../../../../convex/_generated/api";

export default function DashboardPage() {
	const glRequests = useQuery(api.glRequests.getGLRequests, {});

	return (
		<div className="space-y-6">
			<section>
				<Card className="bg-white shadow-soft-md">
					<CardHeader className="flex flex-row items-center justify-between gap-4">
						<div className="space-y-1.5">
							<p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
								Coordinator Overview
							</p>
							<CardTitle className="text-section-title text-gray-900">
								Guarantee Letter Requests
							</CardTitle>
							<CardDescription className="text-sm text-muted-foreground">
								View all GL requests, their risk bands, and simulated insurer
								outcomes.
							</CardDescription>
						</div>
						<Button asChild size="sm">
							<Link href="/gl/new">+ New GL Request</Link>
						</Button>
					</CardHeader>
				</Card>
			</section>

			<section>
				<Card className="bg-white">
					<CardHeader>
						<CardTitle className="text-card-title text-gray-900">
							Recent GL requests
						</CardTitle>
						<CardDescription>
							This table updates live as you create GLs and simulate insurer
							outcomes.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{glRequests === undefined ? (
							<p className="py-10 text-sm text-muted-foreground">
								Loading GL requests&hellip;
							</p>
						) : glRequests.length === 0 ? (
							<div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-sm text-muted-foreground">
								<p className="font-medium text-gray-900">
									No GL requests yet.
								</p>
								<p className="max-w-md">
									Start by creating a new GL for a patient. Once created, it
									will appear here with risk banding and simulated insurer
									decisions.
								</p>
								<Button asChild size="sm" variant="outline">
									<Link href="/gl/new">Create your first GL</Link>
								</Button>
							</div>
						) : (
							<div className="space-y-3 text-sm">
								<div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1.2fr] gap-3 border-b border-gray-100 pb-2 text-xs font-medium text-muted-foreground">
									<p>Patient</p>
									<p>Insurer</p>
									<p>Risk band</p>
									<p>Status</p>
									<p className="text-right">Created</p>
								</div>
								<ul className="space-y-2">
									{glRequests.map((gl) => (
										<li
											className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1.2fr] items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
											key={gl._id}
										>
											<div className="space-y-0.5">
												<p className="text-sm font-medium text-gray-900">
													{gl.patientName}
												</p>
												<p className="line-clamp-1 text-xs text-muted-foreground">
													{gl.diagnosis}
												</p>
											</div>
											<p className="text-xs text-gray-900">{gl.insurerName}</p>
											<p className="text-xs">
												{gl.riskBand ? (
													<span className="inline-flex rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">
														{gl.riskBand}
													</span>
												) : (
													<span className="text-muted-foreground">TBD</span>
												)}
											</p>
											<p className="text-xs text-muted-foreground">{gl.status}</p>
											<p className="text-right text-xs text-muted-foreground">
												{new Date(gl.creationTime).toLocaleString()}
											</p>
										</li>
									))}
								</ul>
							</div>
						)}
					</CardContent>
				</Card>
			</section>
		</div>
	);
}

