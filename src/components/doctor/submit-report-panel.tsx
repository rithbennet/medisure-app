"use client";

import { useMutation } from "convex/react";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

type SubmitReportPanelProps = {
	caseId: Id<"gl_requests">;
	hasReport: boolean;
	isAlreadySubmitted: boolean;
};

export function SubmitReportPanel({
	caseId,
	hasReport,
	isAlreadySubmitted,
}: SubmitReportPanelProps) {
	const router = useRouter();
	const { addToast } = useToast();
	const submitReport = useMutation(api.doctor.submitReport);

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [confirmation, setConfirmation] = useState(false);
	const [internalNote, setInternalNote] = useState("");
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit() {
		if (!confirmation) {
			setError("Please confirm your report before submitting.");
			return;
		}

		try {
			setIsSubmitting(true);
			setError(null);

			await submitReport({
				glId: caseId,
				confirmation: true,
				internalNote: internalNote || undefined,
			});

			addToast({
				title: "Report submitted",
				description: "Your medical report has been submitted successfully.",
				variant: "success",
			});

			router.push("/doctor/reports");
		} catch (err) {
			console.error("Failed to submit report:", err);
			setError("Failed to submit report. Please try again.");
			addToast({
				title: "Error",
				description: "Failed to submit report. Please try again.",
				variant: "error",
			});
		} finally {
			setIsSubmitting(false);
		}
	}

	if (isAlreadySubmitted) {
		return (
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="flex items-center gap-2 font-semibold text-lg">
						<CheckCircle2 className="h-5 w-5 text-emerald-600" />
						Report Submitted
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3">
						<p className="text-emerald-700 text-sm">
							This report has already been submitted. The coordinator and
							insurer can now view it.
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="font-semibold text-lg">Submit Report</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{!hasReport ? (
					<div className="flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3">
						<AlertCircle className="h-4 w-4 text-amber-600" />
						<span className="text-amber-700 text-sm">
							Please complete the report before submitting.
						</span>
					</div>
				) : (
					<>
						<div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
							<p className="font-medium text-blue-700 text-xs uppercase tracking-wide">
								Step 3 of 3: Review &amp; Submit
							</p>
							<p className="mt-1 text-blue-600 text-sm">
								Once submitted, the report will be visible to the coordinator
								and insurer. Changes will require a new version.
							</p>
						</div>

						<div className="space-y-2">
							<label className="flex cursor-pointer items-start gap-3">
								<input
									checked={confirmation}
									className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
									onChange={(e) => setConfirmation(e.target.checked)}
									type="checkbox"
								/>
								<span className="text-gray-700 text-sm">
									I confirm this report accurately reflects my clinical opinion
									and has been reviewed for accuracy.
								</span>
							</label>
						</div>

						<div className="space-y-2">
							<label
								className="font-medium text-gray-900 text-sm"
								htmlFor="internalNote"
							>
								Internal Note (Optional)
							</label>
							<textarea
								className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-gray-900 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
								id="internalNote"
								onChange={(e) => setInternalNote(e.target.value)}
								placeholder="Add a note for the coordinator (not included in the insurer-facing report)..."
								value={internalNote}
							/>
							<p className="text-muted-foreground text-xs">
								This note is for internal use only and will not be shared with
								the insurer.
							</p>
						</div>

						{error && (
							<div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2">
								<AlertCircle className="h-4 w-4 text-red-600" />
								<span className="text-red-700 text-sm">{error}</span>
							</div>
						)}

						<div className="border-gray-100 border-t pt-4">
							<Button
								className="w-full"
								disabled={isSubmitting || !confirmation}
								onClick={handleSubmit}
							>
								{isSubmitting ? (
									<Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
								) : (
									<Send className="mr-1.5 h-4 w-4" />
								)}
								Submit Report
							</Button>
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
}
