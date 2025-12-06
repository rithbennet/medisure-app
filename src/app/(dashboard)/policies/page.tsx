"use client";

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

export default function PoliciesPage() {
	const demoPolicies = useQuery(api.policies.listDemoPolicies, {});

	return (
		<div className="space-y-6">
			<section>
				<Card className="bg-white shadow-soft-md">
					<CardHeader>
						<p className="text-muted-foreground text-xs uppercase tracking-[0.3em]">
							Policies
						</p>
						<CardTitle className="text-gray-900 text-section-title">
							Policy Library &amp; Q&amp;A
						</CardTitle>
						<CardDescription className="text-muted-foreground text-sm">
							Upload insurer PDFs, index them, and ask natural language
							questions during GL review.
						</CardDescription>
					</CardHeader>
				</Card>
			</section>

			<section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)]">
				<Card className="bg-white">
					<CardHeader>
						<CardTitle className="text-card-title text-gray-900">
							Upload policy documents
						</CardTitle>
						<CardDescription>
							Drag and drop Malaysian insurer policies here to prepare them for
							RAG-based lookup.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-gray-200 border-dashed bg-gray-50 px-6 py-10 text-center">
							<p className="font-medium text-gray-900 text-sm">
								Policy upload coming soon
							</p>
							<p className="max-w-md text-muted-foreground text-sm">
								In the full implementation, this dropzone will send PDFs to a
								Convex action that chunks and indexes each policy for Q&amp;A.
							</p>
							<Button disabled size="sm" variant="outline">
								Choose files
							</Button>
						</div>
					</CardContent>
				</Card>

				<Card className="bg-white">
					<CardHeader>
						<CardTitle className="text-card-title text-gray-900">
							Pre-loaded demo policies
						</CardTitle>
						<CardDescription>
							These mock policies are served from Convex and used for policy
							auto lookup and Q&amp;A.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid gap-4 md:grid-cols-2">
							{demoPolicies ? (
								demoPolicies.map((policy) => (
									<div
										className="rounded-xl border border-gray-200 bg-white p-4 shadow-soft"
										key={policy.id}
									>
										<p className="font-semibold text-blue-600 text-xs uppercase tracking-[0.2em]">
											Demo Policy
										</p>
										<p className="mt-2 font-semibold text-gray-900 text-sm">
											{policy.productName}
										</p>
										<p className="mt-1 text-muted-foreground text-xs">
											Plan type: {policy.planType}
										</p>
										<p className="mt-1 text-muted-foreground text-xs">
											Insurer: {policy.insurerName}
										</p>
									</div>
								))
							) : (
								<p className="text-muted-foreground text-sm">
									Loading demo policies from Convex&hellip;
								</p>
							)}
						</div>
						<div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-muted-foreground text-sm">
							<p className="font-medium text-gray-900">Policy Q&amp;A</p>
							<p className="mt-1 text-xs">
								A question box and AI answers will appear here once wired to the
								Convex RAG index.
							</p>
						</div>
					</CardContent>
				</Card>
			</section>
		</div>
	);
}
