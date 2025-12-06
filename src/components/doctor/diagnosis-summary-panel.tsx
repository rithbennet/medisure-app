"use client";

import { AlertCircle, Pencil, Stethoscope } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DiagnosisSummaryPanelProps = {
	caseId: string;
	primaryDiagnosis?: string;
	secondaryDiagnoses?: string;
	clinicalNotes?: string;
};

export function DiagnosisSummaryPanel({
	caseId,
	primaryDiagnosis,
	secondaryDiagnoses,
	clinicalNotes,
}: DiagnosisSummaryPanelProps) {
	const hasDiagnosis = primaryDiagnosis || secondaryDiagnoses || clinicalNotes;

	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2 font-semibold text-lg">
						<Stethoscope className="h-5 w-5 text-emerald-600" />
						Diagnosis Summary
					</CardTitle>
					<Button asChild size="sm" variant="ghost">
						<Link href={`/doctor/cases/${caseId}/diagnose`}>
							<Pencil className="mr-1.5 h-3.5 w-3.5" />
							Edit
						</Link>
					</Button>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{!hasDiagnosis ? (
					<div className="flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
						<AlertCircle className="h-4 w-4 text-amber-600" />
						<span className="text-amber-700 text-sm">
							No diagnosis recorded yet.{" "}
							<Link
								className="font-medium underline"
								href={`/doctor/cases/${caseId}/diagnose`}
							>
								Add diagnosis
							</Link>
						</span>
					</div>
				) : (
					<>
						{primaryDiagnosis && (
							<div className="space-y-1">
								<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
									Primary Diagnosis
								</p>
								<p className="font-medium text-gray-900 text-sm">
									{primaryDiagnosis}
								</p>
							</div>
						)}

						{secondaryDiagnoses && (
							<div className="space-y-1">
								<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
									Secondary Diagnoses / Comorbidities
								</p>
								<p className="text-gray-700 text-sm">{secondaryDiagnoses}</p>
							</div>
						)}

						{clinicalNotes && (
							<div className="space-y-1">
								<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
									Clinical Notes
								</p>
								<p className="whitespace-pre-wrap text-gray-700 text-sm">
									{clinicalNotes}
								</p>
							</div>
						)}
					</>
				)}
			</CardContent>
		</Card>
	);
}
