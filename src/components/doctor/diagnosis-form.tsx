"use client";

import { useMutation } from "convex/react";
import { ArrowRight, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

type DiagnosisFormValues = {
	primaryDiagnosis: string;
	secondaryDiagnoses: string;
	clinicalNotes: string;
};

type DiagnosisFormProps = {
	caseId: Id<"gl_requests">;
	initialData?: {
		primaryDiagnosis?: string;
		secondaryDiagnoses?: string;
		clinicalNotes?: string;
	};
};

export function DiagnosisForm({ caseId, initialData }: DiagnosisFormProps) {
	const router = useRouter();
	const { addToast } = useToast();
	const saveDiagnosis = useMutation(api.doctor.saveDiagnosis);

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitType, setSubmitType] = useState<"save" | "next">("save");

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<DiagnosisFormValues>({
		defaultValues: {
			primaryDiagnosis: initialData?.primaryDiagnosis || "",
			secondaryDiagnoses: initialData?.secondaryDiagnoses || "",
			clinicalNotes: initialData?.clinicalNotes || "",
		},
	});

	async function onSubmit(values: DiagnosisFormValues) {
		try {
			setIsSubmitting(true);

			await saveDiagnosis({
				glId: caseId,
				primaryDiagnosis: values.primaryDiagnosis,
				secondaryDiagnoses: values.secondaryDiagnoses || undefined,
				clinicalNotes: values.clinicalNotes || undefined,
			});

			addToast({
				title: "Diagnosis saved",
				description: "Your diagnosis has been saved successfully.",
				variant: "success",
			});

			if (submitType === "next") {
				router.push(`/doctor/cases/${caseId}/report`);
			}
		} catch (error) {
			console.error("Failed to save diagnosis:", error);
			addToast({
				title: "Error",
				description: "Failed to save diagnosis. Please try again.",
				variant: "error",
			});
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="font-semibold text-lg">
					Clinical Diagnosis
				</CardTitle>
			</CardHeader>
			<CardContent>
				<form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
					<div className="space-y-2">
						<label
							className="font-medium text-gray-900 text-sm"
							htmlFor="primaryDiagnosis"
						>
							Primary Diagnosis <span className="text-red-500">*</span>
						</label>
						<Input
							id="primaryDiagnosis"
							{...register("primaryDiagnosis", {
								required: "Primary diagnosis is required",
							})}
							className="text-gray-900"
							placeholder="e.g. Acute Appendicitis, Cholecystitis"
						/>
						{errors.primaryDiagnosis && (
							<p className="text-red-600 text-xs">
								{errors.primaryDiagnosis.message}
							</p>
						)}
						<p className="text-muted-foreground text-xs">
							Enter the primary diagnosis or ICD code.
						</p>
					</div>

					<div className="space-y-2">
						<label
							className="font-medium text-gray-900 text-sm"
							htmlFor="secondaryDiagnoses"
						>
							Secondary Diagnoses / Comorbidities
						</label>
						<textarea
							id="secondaryDiagnoses"
							{...register("secondaryDiagnoses")}
							className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-gray-900 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
							placeholder="e.g. Hypertension, Type 2 Diabetes Mellitus, History of cardiac surgery"
						/>
						<p className="text-muted-foreground text-xs">
							List any relevant secondary diagnoses or pre-existing conditions.
						</p>
					</div>

					<div className="space-y-2">
						<label
							className="font-medium text-gray-900 text-sm"
							htmlFor="clinicalNotes"
						>
							Clinical Notes
						</label>
						<textarea
							id="clinicalNotes"
							{...register("clinicalNotes")}
							className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-gray-900 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
							placeholder="Document relevant clinical findings, history, examination notes, and any other pertinent information..."
						/>
						<p className="text-muted-foreground text-xs">
							Add detailed clinical notes, history of present illness, and
							physical examination findings.
						</p>
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
							Save Diagnosis
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
									Next: Create Report
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
