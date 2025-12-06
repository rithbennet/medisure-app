"use client";

import { useQuery } from "convex/react";
import {
	AlertCircle,
	ArrowLeft,
	FileCheck,
	Stethoscope,
	User,
} from "lucide-react";
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
import type { Id } from "../../../../../convex/_generated/dataModel";

type GLDetailPageProps = {
	params: {
		id: string;
	};
};

function getDoctorStatusBadge(status?: string | null) {
	switch (status) {
		case "PENDING":
			return (
				<span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 font-medium text-gray-700 text-xs">
					Awaiting Doctor
				</span>
			);
		case "DIAGNOSING":
			return (
				<span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 font-medium text-blue-700 text-xs">
					Doctor Diagnosing
				</span>
			);
		case "REPORT_DRAFT":
			return (
				<span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 font-medium text-amber-700 text-xs">
					Report in Draft
				</span>
			);
		case "SUBMITTED":
			return (
				<span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-medium text-emerald-700 text-xs">
					Report Submitted
				</span>
			);
		default:
			return (
				<span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 font-medium text-gray-700 text-xs">
					Not Assigned
				</span>
			);
	}
}

function getRiskBandBadge(band?: string) {
	switch (band?.toLowerCase()) {
		case "low":
			return (
				<span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-medium text-emerald-700 text-xs">
					Low Risk
				</span>
			);
		case "medium":
			return (
				<span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 font-medium text-amber-700 text-xs">
					Medium Risk
				</span>
			);
		case "high":
			return (
				<span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 font-medium text-red-700 text-xs">
					High Risk
				</span>
			);
		default:
			return (
				<span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 font-medium text-gray-700 text-xs">
					TBD
				</span>
			);
	}
}

export default function GLDetailPage({ params }: GLDetailPageProps) {
	const { id } = params;
	const glData = useQuery(api.glRequests.getGLById, {
		id: id as Id<"gl_requests">,
	});

	if (glData === undefined) {
		return (
			<div className="space-y-6">
				<div className="flex items-center gap-4">
					<Button asChild size="sm" variant="ghost">
						<Link href="/dashboard">
							<ArrowLeft className="mr-1.5 h-4 w-4" />
							Back to Dashboard
						</Link>
					</Button>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
				</div>
			</div>
		);
	}

	if (!glData) {
		return (
			<div className="space-y-6">
				<div className="flex items-center gap-4">
					<Button asChild size="sm" variant="ghost">
						<Link href="/dashboard">
							<ArrowLeft className="mr-1.5 h-4 w-4" />
							Back to Dashboard
						</Link>
					</Button>
				</div>
				<div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-red-700 text-sm">
					GL request not found. It may have been deleted.
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Button asChild size="sm" variant="ghost">
					<Link href="/dashboard">
						<ArrowLeft className="mr-1.5 h-4 w-4" />
						Back to Dashboard
					</Link>
				</Button>
			</div>

			<section>
				<Card className="bg-white shadow-soft-md">
					<CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<div className="space-y-1.5">
							<p className="text-muted-foreground text-xs uppercase tracking-[0.3em]">
								Guarantee Letter
							</p>
							<CardTitle className="font-semibold text-2xl text-gray-900">
								{glData.patientName}
							</CardTitle>
							<CardDescription className="text-muted-foreground text-sm">
								{glData.insurerName} • {glData.diagnosis}
							</CardDescription>
						</div>
						<div className="flex flex-wrap gap-2">
							<span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs">
								Status:{" "}
								<span className="font-medium text-gray-900">
									{glData.status}
								</span>
							</span>
							{getRiskBandBadge(glData.riskBand)}
						</div>
					</CardHeader>
				</Card>
			</section>

			<section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
				<div className="space-y-6">
					<Card className="bg-white">
						<CardHeader>
							<CardTitle className="font-semibold text-gray-900 text-lg">
								Request Details
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-4 sm:grid-cols-2">
								<div className="flex items-start gap-3">
									<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
										<User className="h-4 w-4 text-blue-600" />
									</div>
									<div>
										<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
											Patient
										</p>
										<p className="font-medium text-gray-900 text-sm">
											{glData.patientName}
										</p>
									</div>
								</div>

								<div>
									<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
										Insurer
									</p>
									<p className="font-medium text-gray-900 text-sm">
										{glData.insurerName}
									</p>
									{glData.policy && (
										<p className="text-muted-foreground text-xs">
											{glData.policy.productName}
										</p>
									)}
								</div>

								<div>
									<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
										Diagnosis
									</p>
									<p className="text-gray-700 text-sm">{glData.diagnosis}</p>
								</div>

								{glData.estimatedCost && (
									<div>
										<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
											Estimated Cost
										</p>
										<p className="font-medium text-gray-900 text-sm">
											RM {glData.estimatedCost.toLocaleString()}
										</p>
									</div>
								)}
							</div>

							{glData.riskExplanation && (
								<div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
									<p className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
										Risk Analysis
									</p>
									<p className="text-gray-700 text-sm">
										{glData.riskExplanation}
									</p>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Doctor Workflow Status */}
					<Card className="bg-white">
						<CardHeader className="pb-3">
							<div className="flex items-center justify-between">
								<CardTitle className="flex items-center gap-2 font-semibold text-gray-900 text-lg">
									<Stethoscope className="h-5 w-5 text-emerald-600" />
									Doctor Review
								</CardTitle>
								{getDoctorStatusBadge(glData.doctorStatus)}
							</div>
						</CardHeader>
						<CardContent>
							{glData.hasDoctorReport ? (
								<div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3">
									<FileCheck className="h-5 w-5 text-emerald-600" />
									<div>
										<p className="font-medium text-emerald-700 text-sm">
											Medical Report Submitted
										</p>
										<p className="text-emerald-600 text-xs">
											The assigned doctor has submitted their medical report for
											this GL.
										</p>
									</div>
								</div>
							) : glData.doctorStatus === "PENDING" || !glData.doctorStatus ? (
								<div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
									<AlertCircle className="h-5 w-5 text-gray-400" />
									<div>
										<p className="font-medium text-gray-700 text-sm">
											Awaiting Doctor Review
										</p>
										<p className="text-muted-foreground text-xs">
											The assigned doctor has not yet started their review.
										</p>
									</div>
								</div>
							) : (
								<div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
									<Stethoscope className="h-5 w-5 text-blue-600" />
									<div>
										<p className="font-medium text-blue-700 text-sm">
											Doctor Review in Progress
										</p>
										<p className="text-blue-600 text-xs">
											{glData.doctorStatus === "DIAGNOSING"
												? "The doctor is currently diagnosing this case."
												: "The doctor is drafting their medical report."}
										</p>
									</div>
								</div>
							)}
						</CardContent>
					</Card>
				</div>

				<Card className="bg-white lg:sticky lg:top-4">
					<CardHeader>
						<CardTitle className="font-semibold text-gray-900 text-lg">
							Risk &amp; Actions
						</CardTitle>
						<CardDescription>
							AI risk assessment and available actions.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
							<p className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
								Risk Band
							</p>
							<div className="flex items-center gap-2">
								{getRiskBandBadge(glData.riskBand)}
							</div>
						</div>

						<div className="space-y-2">
							<Button className="w-full" disabled variant="outline">
								Generate Explanation Letter
							</Button>
							<Button className="w-full" disabled variant="outline">
								Simulate Outcome
							</Button>
						</div>

						<p className="text-center text-muted-foreground text-xs">
							Run risk analysis from the GL form to enable these actions.
						</p>
					</CardContent>
				</Card>
			</section>
		</div>
	);
}
