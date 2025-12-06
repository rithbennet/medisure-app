"use client";

import { useQuery } from "convex/react";
import { Edit, Eye, FileCheck, FileText } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { api } from "../../../../../convex/_generated/api";

function getStatusBadge(status: string) {
	switch (status) {
		case "DRAFT":
			return (
				<span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 font-medium text-amber-700 text-xs">
					Draft
				</span>
			);
		case "SUBMITTED":
			return (
				<span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-medium text-emerald-700 text-xs">
					Submitted
				</span>
			);
		default:
			return (
				<span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 font-medium text-gray-700 text-xs">
					{status}
				</span>
			);
	}
}

function getActionButton(glRequestId: string, status: string) {
	if (status === "SUBMITTED") {
		return (
			<Button asChild size="sm" variant="outline">
				<Link href={`/doctor/cases/${glRequestId}/submit`}>
					<Eye className="mr-1.5 h-3.5 w-3.5" />
					View
				</Link>
			</Button>
		);
	}

	return (
		<Button asChild size="sm" variant="secondary">
			<Link href={`/doctor/cases/${glRequestId}/report`}>
				<Edit className="mr-1.5 h-3.5 w-3.5" />
				Continue Editing
			</Link>
		</Button>
	);
}

export default function DoctorReportsPage() {
	const reports = useQuery(api.doctor.getReportsForDoctor, {});

	if (reports === undefined) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="font-semibold text-2xl text-gray-900 tracking-tight">
						My Reports
					</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						Loading your reports...
					</p>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
				</div>
			</div>
		);
	}

	const draftCount = reports.filter((r) => r.status === "DRAFT").length;
	const submittedCount = reports.filter((r) => r.status === "SUBMITTED").length;

	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-semibold text-2xl text-gray-900 tracking-tight">
					My Reports
				</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Medical reports you have created for GL requests.
				</p>
			</div>

			{/* Stats */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<Card>
					<CardContent className="flex items-center gap-4 p-4">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
							<FileText className="h-5 w-5 text-blue-600" />
						</div>
						<div>
							<p className="font-semibold text-2xl text-gray-900">
								{reports.length}
							</p>
							<p className="text-muted-foreground text-xs">Total Reports</p>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="flex items-center gap-4 p-4">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
							<Edit className="h-5 w-5 text-amber-600" />
						</div>
						<div>
							<p className="font-semibold text-2xl text-gray-900">
								{draftCount}
							</p>
							<p className="text-muted-foreground text-xs">Drafts</p>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="flex items-center gap-4 p-4">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
							<FileCheck className="h-5 w-5 text-emerald-600" />
						</div>
						<div>
							<p className="font-semibold text-2xl text-gray-900">
								{submittedCount}
							</p>
							<p className="text-muted-foreground text-xs">Submitted</p>
						</div>
					</CardContent>
				</Card>
			</div>

			{reports.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-12">
						<div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
							<FileText className="h-6 w-6 text-gray-400" />
						</div>
						<h3 className="mt-4 font-medium text-gray-900 text-sm">
							No reports yet
						</h3>
						<p className="mt-1 text-center text-muted-foreground text-sm">
							You haven&apos;t created any medical reports yet.
							<br />
							Start by diagnosing a case from your worklist.
						</p>
						<Button asChild className="mt-4">
							<Link href="/doctor/cases">Go to My Cases</Link>
						</Button>
					</CardContent>
				</Card>
			) : (
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base">All Reports</CardTitle>
						<CardDescription>
							{reports.length} report{reports.length !== 1 ? "s" : ""} found
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead>
									<tr className="border-gray-100 border-b text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
										<th className="pr-4 pb-3">Patient</th>
										<th className="pr-4 pb-3">Insurer</th>
										<th className="pr-4 pb-3">GL Status</th>
										<th className="pr-4 pb-3">Report Status</th>
										<th className="pr-4 pb-3">Created</th>
										<th className="pr-4 pb-3">Last Updated</th>
										<th className="pb-3 text-right">Action</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-50">
									{reports.map((report) => (
										<tr className="group" key={report._id}>
											<td className="py-3 pr-4">
												<span className="font-medium text-gray-900">
													{report.patientName}
												</span>
											</td>
											<td className="py-3 pr-4 text-gray-600 text-sm">
												{report.insurerName}
											</td>
											<td className="py-3 pr-4 text-gray-600 text-sm">
												{report.glStatus}
											</td>
											<td className="py-3 pr-4">
												{getStatusBadge(report.status)}
											</td>
											<td className="py-3 pr-4 text-muted-foreground text-sm">
												{new Date(report.createdAt).toLocaleDateString()}
											</td>
											<td className="py-3 pr-4 text-muted-foreground text-sm">
												{new Date(report.updatedAt).toLocaleDateString()}
											</td>
											<td className="py-3 text-right">
												{getActionButton(report.glRequestId, report.status)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
