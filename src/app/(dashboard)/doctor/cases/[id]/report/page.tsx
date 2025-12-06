"use client";

import { useQuery } from "convex/react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CaseSummaryCard } from "@/components/doctor/case-summary-card";
import { DiagnosisSummaryPanel } from "@/components/doctor/diagnosis-summary-panel";
import { ReportEditor } from "@/components/doctor/report-editor";
import { StepIndicator } from "@/components/doctor/step-indicator";
import { Button } from "@/components/ui/button";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";

const DOCTOR_STEPS = [
	{ id: "diagnose", label: "Diagnose" },
	{ id: "report", label: "Create Report" },
	{ id: "submit", label: "Submit" },
];

export default function CreateReportPage() {
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

			<div>
				<h1 className="font-semibold text-2xl text-gray-900 tracking-tight">
					Create Medical Report
				</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Draft your medical report for the insurer. Use AI to generate a
					starting draft.
				</p>
			</div>

			<StepIndicator currentStep={1} steps={DOCTOR_STEPS} />

			<CaseSummaryCard
				diagnosis={gl.diagnosis}
				estimatedCost={gl.estimatedCost}
				insurerName={gl.insurerName}
				patientName={gl.patientName}
				policyName={policy?.productName}
				riskBand={gl.riskBand}
				status={gl.status}
			/>

			<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
				<DiagnosisSummaryPanel
					caseId={caseId}
					clinicalNotes={gl.clinicalNotes}
					primaryDiagnosis={gl.primaryDiagnosis}
					secondaryDiagnoses={gl.secondaryDiagnoses}
				/>

				<ReportEditor caseId={caseId} initialData={report?.bodyJson} />
			</div>
		</div>
	);
}
