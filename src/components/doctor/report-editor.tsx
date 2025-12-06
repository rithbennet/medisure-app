"use client";

import { useAction, useMutation } from "convex/react";
import { ArrowRight, Loader2, Save, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

type ReportFormValues = {
	clinicalSummary: string;
	history: string;
	investigations: string;
	treatmentPlan: string;
	opinion: string;
};

type ReportEditorProps = {
	caseId: Id<"gl_requests">;
	initialData?: {
		clinicalSummary?: string;
		history?: string;
		investigations?: string;
		treatmentPlan?: string;
		opinion?: string;
	};
};

export function ReportEditor({
	caseId,
	initialData,
}: Readonly<ReportEditorProps>) {
	const router = useRouter();
	const { addToast } = useToast();
	const saveReportDraft = useMutation(api.doctor.saveReportDraft);
	const generateDraft = useAction(api.doctor.generateReportDraft);

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isGenerating, setIsGenerating] = useState(false);
	const [submitType, setSubmitType] = useState<"save" | "next">("save");

	const { register, handleSubmit, setValue } = useForm<ReportFormValues>({
		defaultValues: {
			clinicalSummary: initialData?.clinicalSummary || "",
			history: initialData?.history || "",
			investigations: initialData?.investigations || "",
			treatmentPlan: initialData?.treatmentPlan || "",
			opinion: initialData?.opinion || "",
		},
	});

	async function handleGenerateDraft() {
		try {
			setIsGenerating(true);
			const draft = await generateDraft({ glId: caseId });

			// Populate form fields with generated content
			setValue("clinicalSummary", draft.clinicalSummary);
			setValue("history", draft.history);
			setValue("investigations", draft.investigations);
			setValue("treatmentPlan", draft.treatmentPlan);
			setValue("opinion", draft.opinion);

			addToast({
				title: "Draft generated",
				description:
					"AI-generated draft has been populated. Review and edit as needed.",
				variant: "success",
			});
		} catch (error) {
			console.error("Failed to generate draft:", error);
			addToast({
				title: "Error",
				description: "Failed to generate draft. Please try again.",
				variant: "error",
			});
		} finally {
			setIsGenerating(false);
		}
	}

	async function onSubmit(values: ReportFormValues) {
		try {
			setIsSubmitting(true);

			await saveReportDraft({
				glId: caseId,
				bodyJson: {
					clinicalSummary: values.clinicalSummary || undefined,
					history: values.history || undefined,
					investigations: values.investigations || undefined,
					treatmentPlan: values.treatmentPlan || undefined,
					opinion: values.opinion || undefined,
				},
			});

			addToast({
				title: "Draft saved",
				description: "Your report draft has been saved.",
				variant: "success",
			});

			if (submitType === "next") {
				router.push(`/doctor/cases/${caseId}/submit`);
			}
		} catch (error) {
			console.error("Failed to save report:", error);
			addToast({
				title: "Error",
				description: "Failed to save report. Please try again.",
				variant: "error",
			});
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="font-semibold text-lg">
						Medical Report
					</CardTitle>
					<Button
						disabled={isGenerating}
						onClick={handleGenerateDraft}
						size="sm"
						type="button"
						variant="outline"
					>
						{isGenerating ? (
							<Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
						) : (
							<Sparkles className="mr-1.5 h-4 w-4 text-purple-600" />
						)}
						Generate Draft with AI
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				<form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
					<div className="space-y-2">
						<label
							className="font-medium text-gray-900 text-sm"
							htmlFor="clinicalSummary"
						>
							Clinical Summary
						</label>
						<textarea
							id="clinicalSummary"
							{...register("clinicalSummary")}
							className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-gray-900 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
							placeholder="Summarize the patient's clinical presentation and current status..."
						/>
					</div>

					<div className="space-y-2">
						<label
							className="font-medium text-gray-900 text-sm"
							htmlFor="history"
						>
							Relevant Past History
						</label>
						<textarea
							id="history"
							{...register("history")}
							className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-gray-900 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
							placeholder="Document relevant medical history, comorbidities, and past conditions..."
						/>
					</div>

					<div className="space-y-2">
						<label
							className="font-medium text-gray-900 text-sm"
							htmlFor="investigations"
						>
							Examination &amp; Investigations
						</label>
						<textarea
							id="investigations"
							{...register("investigations")}
							className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-gray-900 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
							placeholder="Summarize physical examination findings and investigation results..."
						/>
					</div>

					<div className="space-y-2">
						<label
							className="font-medium text-gray-900 text-sm"
							htmlFor="treatmentPlan"
						>
							Proposed Treatment Plan
						</label>
						<textarea
							id="treatmentPlan"
							{...register("treatmentPlan")}
							className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-gray-900 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
							placeholder="Describe the proposed treatment, procedures, and expected outcomes..."
						/>
					</div>

					<div className="space-y-2">
						<label
							className="font-medium text-gray-900 text-sm"
							htmlFor="opinion"
						>
							Doctor&apos;s Opinion
						</label>
						<textarea
							id="opinion"
							{...register("opinion")}
							className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-gray-900 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
							placeholder="Provide your clinical opinion on medical necessity and recommendation for coverage..."
						/>
					</div>

					<div className="flex flex-wrap items-center gap-3 border-gray-100 border-t pt-4">
						<Button
							disabled={isSubmitting}
							onClick={() => setSubmitType("save")}
							type="submit"
							variant="outline"
						>
							{isSubmitting && submitType === "save" ? (
								<Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
							) : (
								<Save className="mr-1.5 h-4 w-4" />
							)}
							Save Draft
						</Button>
						<Button
							disabled={isSubmitting}
							onClick={() => setSubmitType("next")}
							type="submit"
						>
							{isSubmitting && submitType === "next" ? (
								<Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
							) : (
								<>
									Next: Review &amp; Submit
									<ArrowRight className="ml-1.5 h-4 w-4" />
								</>
							)}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
