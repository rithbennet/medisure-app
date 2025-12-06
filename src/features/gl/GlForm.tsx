"use client";

import { useMutation } from "convex/react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "../../../convex/_generated/api";

type FormValues = {
	patientName: string;
	insurerName: string;
	diagnosis: string;
	estimatedCost?: string;
};

type SubmitState = {
	status: "idle" | "submitting" | "success" | "error";
	message?: string;
};

export function GlForm() {
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<FormValues>({
		defaultValues: {
			patientName: "",
			insurerName: "AIA",
			diagnosis: "",
			estimatedCost: "",
		},
	});

	const createGL = useMutation(api.glRequests.createGLRequest);

	const [submitState, setSubmitState] = useState<SubmitState>({
		status: "idle",
	});

	const [policyFile, setPolicyFile] = useState<File | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (file && file.type === "application/pdf") {
			setPolicyFile(file);
		}
	}

	function handleRemoveFile() {
		setPolicyFile(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	}

	async function onSubmit(values: FormValues) {
		try {
			setSubmitState({ status: "submitting" });

			const estimatedCost = values.estimatedCost
				? Number.parseFloat(values.estimatedCost)
				: undefined;

			await createGL({
				patientName: values.patientName,
				insurerName: values.insurerName,
				diagnosis: values.diagnosis,
				estimatedCost,
			});

			setSubmitState({
				status: "success",
				message: "GL draft created and auto-linked to a demo policy.",
			});
		} catch (error) {
			console.error(error);
			setSubmitState({
				status: "error",
				message: "Something went wrong creating this GL. Please try again.",
			});
		}
	}

	return (
		<form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
			<div className="grid gap-4 md:grid-cols-2">
				<div className="space-y-2">
					<label
						className="font-medium text-gray-900 text-sm"
						htmlFor="patientName"
					>
						Patient name
					</label>
					<Input
						id="patientName"
						{...register("patientName", { required: true })}
						placeholder="e.g. Tan Mei Ling"
					/>
					{errors.patientName && (
						<p className="text-red-600 text-xs">
							Please enter the patient&apos;s name.
						</p>
					)}
				</div>

				<div className="space-y-2">
					<label className="font-medium text-gray-900 text-sm">Insurer</label>
					<select
						{...register("insurerName", { required: true })}
						className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-gray-900 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
					>
						<option value="AIA">AIA</option>
						<option value="Prudential">Prudential</option>
						<option value="Allianz">Allianz</option>
					</select>
				</div>
			</div>

			<div className="space-y-2">
				<label className="font-medium text-gray-900 text-sm">
					Diagnosis &amp; procedure
				</label>
				<textarea
					{...register("diagnosis", { required: true })}
					className="flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-gray-900 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
					placeholder="Short description of diagnosis, symptom onset, and planned procedure."
				/>
				{errors.diagnosis && (
					<p className="text-red-600 text-xs">
						Please describe the diagnosis or planned procedure.
					</p>
				)}
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="space-y-2">
					<label className="font-medium text-gray-900 text-sm">
						Estimated cost (RM)
					</label>
					<Input
						{...register("estimatedCost")}
						inputMode="decimal"
						placeholder="e.g. 18000"
					/>
				</div>

				<div className="space-y-2 text-sm">
					<p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.2em]">
						Policy document
					</p>
					<div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm">
						{policyFile ? (
							<div className="space-y-2">
								<div className="flex items-center gap-2">
									<svg
										className="h-5 w-5 text-red-500"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path d="M4 18h12a2 2 0 002-2V6l-4-4H4a2 2 0 00-2 2v12a2 2 0 002 2zm8-14l4 4h-4V4zM6 10h8v2H6v-2zm0 4h5v2H6v-2z" />
									</svg>
									<span className="flex-1 truncate font-medium text-gray-900 text-sm">
										{policyFile.name}
									</span>
									<button
										className="text-gray-400 transition-colors hover:text-red-500"
										onClick={handleRemoveFile}
										type="button"
									>
										<svg
											className="h-4 w-4"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												d="M6 18L18 6M6 6l12 12"
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
											/>
										</svg>
									</button>
								</div>
								<p className="text-muted-foreground text-xs">
									{(policyFile.size / 1024).toFixed(1)} KB
								</p>
								<p className="text-muted-foreground text-xs">
									This GL will be analysed against the uploaded policy document.
								</p>
							</div>
						) : (
							<label className="block cursor-pointer">
								<input
									accept="application/pdf"
									className="hidden"
									onChange={handleFileChange}
									ref={fileInputRef}
									type="file"
								/>
								<div className="flex flex-col items-center gap-2 py-3 text-center">
									<svg
										className="h-8 w-8 text-gray-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={1.5}
										/>
									</svg>
									<div>
										<p className="font-medium text-blue-600 text-sm hover:text-blue-700">
											Upload policy PDF
										</p>
										<p className="text-muted-foreground text-xs">
											Click to browse or drag and drop
										</p>
									</div>
								</div>
							</label>
						)}
					</div>
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-3 border-gray-100 border-t pt-4">
				<Button
					className="w-full sm:w-auto"
					disabled={submitState.status === "submitting"}
					type="submit"
				>
					{submitState.status === "submitting" ? "Saving..." : "Analyze risk"}
				</Button>
				<Button
					className="w-full sm:w-auto"
					disabled={submitState.status === "submitting"}
					type="button"
					variant="outline"
				>
					Save draft
				</Button>
				{submitState.message && (
					<p className="text-muted-foreground text-xs">{submitState.message}</p>
				)}
			</div>
		</form>
	);
}
