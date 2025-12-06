"use client";

import { useQuery } from "convex/react";
import { AlertCircle, Eye, FileText, Stethoscope } from "lucide-react";
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

function getDoctorStatusBadge(status: string) {
	switch (status) {
		case "PENDING":
			return (
				<span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 font-medium text-gray-700 text-xs">
					Pending
				</span>
			);
		case "DIAGNOSING":
			return (
				<span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 font-medium text-blue-700 text-xs">
					In Progress
				</span>
			);
		case "REPORT_DRAFT":
			return (
				<span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 font-medium text-amber-700 text-xs">
					Report Draft
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

function getRiskBandBadge(band?: string) {
	switch (band?.toLowerCase()) {
		case "low":
			return (
				<span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-medium text-emerald-700 text-xs">
					Low
				</span>
			);
		case "medium":
			return (
				<span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 font-medium text-amber-700 text-xs">
					Medium
				</span>
			);
		case "high":
			return (
				<span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 font-medium text-red-700 text-xs">
					High
				</span>
			);
		default:
			return null;
	}
}

function getActionButton(caseId: string, doctorStatus: string) {
	switch (doctorStatus) {
		case "PENDING":
		case "DIAGNOSING":
			return (
				<Button asChild size="sm">
					<Link href={`/doctor/cases/${caseId}/diagnose`}>
						<Stethoscope className="mr-1.5 h-3.5 w-3.5" />
						Diagnose
					</Link>
				</Button>
			);
		case "REPORT_DRAFT":
			return (
				<Button asChild size="sm" variant="secondary">
					<Link href={`/doctor/cases/${caseId}/report`}>
						<FileText className="mr-1.5 h-3.5 w-3.5" />
						Continue Report
					</Link>
				</Button>
			);
		case "SUBMITTED":
			return (
				<Button asChild size="sm" variant="outline">
					<Link href={`/doctor/cases/${caseId}/submit`}>
						<Eye className="mr-1.5 h-3.5 w-3.5" />
						View Submission
					</Link>
				</Button>
			);
		default:
			return (
				<Button asChild size="sm">
					<Link href={`/doctor/cases/${caseId}/diagnose`}>
						<Stethoscope className="mr-1.5 h-3.5 w-3.5" />
						Diagnose
					</Link>
				</Button>
			);
	}
}

export default function DoctorCasesPage() {
	const cases = useQuery(api.doctor.getCasesForDoctor, {});

	if (cases === undefined) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="font-semibold text-2xl text-gray-900 tracking-tight">
						My Cases
					</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						Loading your assigned cases...
					</p>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-semibold text-2xl text-gray-900 tracking-tight">
					My Cases
				</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					GL requests assigned to you for clinical review and reporting.
				</p>
			</div>

			{/* Demo notice */}
			<div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
				<AlertCircle className="h-4 w-4 text-blue-600" />
				<span className="text-blue-700 text-sm">
					<span className="font-medium">Demo Mode:</span> Cases are
					auto-assigned to the demo doctor account.
				</span>
			</div>

			{cases.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-12">
						<div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
							<Stethoscope className="h-6 w-6 text-gray-400" />
						</div>
						<h3 className="mt-4 font-medium text-gray-900 text-sm">
							No cases assigned
						</h3>
						<p className="mt-1 text-center text-muted-foreground text-sm">
							You don&apos;t have any GL cases assigned to you yet.
							<br />
							Cases will appear here once a coordinator assigns them.
						</p>
					</CardContent>
				</Card>
			) : (
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base">Assigned Cases</CardTitle>
						<CardDescription>
							{cases.length} case{cases.length !== 1 ? "s" : ""} in your
							worklist
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead>
									<tr className="border-gray-100 border-b text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
										<th className="pr-4 pb-3">Patient</th>
										<th className="pr-4 pb-3">Insurer</th>
										<th className="pr-4 pb-3">Diagnosis</th>
										<th className="pr-4 pb-3">Risk</th>
										<th className="pr-4 pb-3">Status</th>
										<th className="pr-4 pb-3">Updated</th>
										<th className="pb-3 text-right">Action</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-50">
									{cases.map((c) => (
										<tr className="group" key={c._id}>
											<td className="py-3 pr-4">
												<span className="font-medium text-gray-900">
													{c.patientName}
												</span>
											</td>
											<td className="py-3 pr-4 text-gray-600 text-sm">
												{c.insurerName}
												{c.policyName && (
													<span className="block text-muted-foreground text-xs">
														{c.policyName}
													</span>
												)}
											</td>
											<td className="max-w-[200px] truncate py-3 pr-4 text-gray-600 text-sm">
												{c.primaryDiagnosis || c.diagnosis}
											</td>
											<td className="py-3 pr-4">
												{getRiskBandBadge(c.riskBand)}
											</td>
											<td className="py-3 pr-4">
												{getDoctorStatusBadge(c.doctorStatus)}
											</td>
											<td className="py-3 pr-4 text-muted-foreground text-sm">
												{new Date(c.updatedAt).toLocaleDateString()}
											</td>
											<td className="py-3 text-right">
												{getActionButton(c._id, c.doctorStatus)}
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
