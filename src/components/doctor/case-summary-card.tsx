"use client";

import {
	AlertCircle,
	Building2,
	DollarSign,
	Stethoscope,
	User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CaseSummaryCardProps = {
	patientName: string;
	insurerName: string;
	diagnosis: string;
	estimatedCost?: number;
	riskBand?: string;
	policyName?: string;
	status?: string;
};

function getRiskBandColor(band?: string) {
	switch (band?.toLowerCase()) {
		case "low":
			return "bg-emerald-50 text-emerald-700 border-emerald-200";
		case "medium":
			return "bg-amber-50 text-amber-700 border-amber-200";
		case "high":
			return "bg-red-50 text-red-700 border-red-200";
		default:
			return "bg-gray-50 text-gray-700 border-gray-200";
	}
}

export function CaseSummaryCard({
	patientName,
	insurerName,
	diagnosis,
	estimatedCost,
	riskBand,
	policyName,
	status,
}: CaseSummaryCardProps) {
	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="font-semibold text-lg">Case Summary</CardTitle>
					{riskBand && (
						<span
							className={`rounded-full border px-3 py-1 font-medium text-xs ${getRiskBandColor(riskBand)}`}
						>
							{riskBand} Risk
						</span>
					)}
				</div>
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
							<p className="font-medium text-gray-900 text-sm">{patientName}</p>
						</div>
					</div>

					<div className="flex items-start gap-3">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50">
							<Building2 className="h-4 w-4 text-purple-600" />
						</div>
						<div>
							<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
								Insurer
							</p>
							<p className="font-medium text-gray-900 text-sm">{insurerName}</p>
							{policyName && (
								<p className="text-muted-foreground text-xs">{policyName}</p>
							)}
						</div>
					</div>

					<div className="flex items-start gap-3">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
							<Stethoscope className="h-4 w-4 text-emerald-600" />
						</div>
						<div>
							<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
								Diagnosis / Reason
							</p>
							<p className="text-gray-700 text-sm">{diagnosis}</p>
						</div>
					</div>

					{estimatedCost && (
						<div className="flex items-start gap-3">
							<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
								<DollarSign className="h-4 w-4 text-amber-600" />
							</div>
							<div>
								<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
									Estimated Cost
								</p>
								<p className="font-medium text-gray-900 text-sm">
									RM {estimatedCost.toLocaleString()}
								</p>
							</div>
						</div>
					)}
				</div>

				{status && (
					<div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
						<AlertCircle className="h-4 w-4 text-blue-600" />
						<span className="text-blue-700 text-xs">
							GL Status: <span className="font-medium">{status}</span>
						</span>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
