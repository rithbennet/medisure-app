"use client";

import { useQuery } from "convex/react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CaseSummaryCard } from "@/components/doctor/case-summary-card";
import { ReportPreview } from "@/components/doctor/report-preview";
import { StepIndicator } from "@/components/doctor/step-indicator";
import { SubmitReportPanel } from "@/components/doctor/submit-report-panel";
import { Button } from "@/components/ui/button";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";

const DOCTOR_STEPS = [
	{ id: "diagnose", label: "Diagnose" },
	{ id: "report", label: "Create Report" },
	{ id: "submit", label: "Submit" },
];

export default function SubmitReportPage() {
	const params = useParams();
	const caseId = params.id as Id<"gl_requests">;

	const caseData = useQuery(api.doctor.getCaseWithReport, {
		glId: caseId,
	});

	if (caseData === undefined) {
		return (
			<div className="space-y-6">
				<div className="flex items-center gap-4">
					<Button asChild size="sm" variant="ghost">
						<Link href="/doctor/cases">
							<ArrowLeft className="mr-1.5 h-4 w-4" />
							Back to Cases
						</Link>
					</Button>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
				</div>
			</div>
		);
	}

	if (!caseData) {
		return (
			<div className="space-y-6">
				<div className="flex items-center gap-4">
					<Button asChild size="sm" variant="ghost">
						<Link href="/doctor/cases">
							<ArrowLeft className="mr-1.5 h-4 w-4" />
							Back to Cases
						</Link>
					</Button>
				</div>
				<div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-red-700 text-sm">
					Case not found. It may have been deleted or you don&apos;t have
					access.
				</div>
			</div>
		);
	}

	const { gl, report, policy } = caseData;
	const hasReport = !!report?.bodyJson;
	const isAlreadySubmitted = report?.status === "SUBMITTED";

	// Determine step based on status
	const currentStep = isAlreadySubmitted ? 2 : 2;

	return (
		<div className="space-y-6 print:space-y-4">
			<div className="flex items-center gap-4 print:hidden">
				<Button asChild size="sm" variant="ghost">
					<Link href="/doctor/cases">
						<ArrowLeft className="mr-1.5 h-4 w-4" />
						Back to Cases
					</Link>
				</Button>
			</div>

			<div className="print:hidden">
				<h1 className="font-semibold text-2xl text-gray-900 tracking-tight">
					{isAlreadySubmitted
						? "View Submitted Report"
						: "Review & Submit Report"}
				</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					{isAlreadySubmitted
						? "This report has been submitted to the coordinator and insurer."
						: "Review your report and submit it for insurer consideration."}
				</p>
			</div>

			<div className="print:hidden">
				<StepIndicator currentStep={currentStep} steps={DOCTOR_STEPS} />
			</div>

			<div className="print:hidden">
				<CaseSummaryCard
					diagnosis={gl.primaryDiagnosis || gl.diagnosis}
					estimatedCost={gl.estimatedCost}
					insurerName={gl.insurerName}
					patientName={gl.patientName}
					policyName={policy?.productName}
					riskBand={gl.riskBand}
					status={gl.status}
				/>
			</div>

			<div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] print:block">
				<ReportPreview
					diagnosis={gl.primaryDiagnosis || gl.diagnosis}
					insurerName={gl.insurerName}
					patientName={gl.patientName}
					reportBody={report?.bodyJson}
				/>

				<div className="print:hidden">
					<SubmitReportPanel
						caseId={caseId}
						hasReport={hasReport}
						isAlreadySubmitted={isAlreadySubmitted}
					/>
				</div>
			</div>
		</div>
	);
}
