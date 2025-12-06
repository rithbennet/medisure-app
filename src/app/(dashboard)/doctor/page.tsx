"use client";

import { useEffect, useMemo, useState } from "react";

import type { Id } from "@/../convex/_generated/dataModel";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
	type DoctorCasePayload,
	type PatientPayload,
	useDoctorActions,
	useDoctorData,
} from "@/services/doctor";

type Status =
	| { tone: "idle"; message?: string }
	| { tone: "loading"; message: string }
	| { tone: "success"; message: string }
	| { tone: "error"; message: string };

const directoryPatients: Array<Pick<PatientPayload, "name" | "insurer">> = [
	{ name: "Aina Rahman", insurer: "AIA" },
	{ name: "Lim Chen Wei", insurer: "Prudential" },
	{ name: "Siti Noraini", insurer: "Allianz" },
];

type PatientFormState = {
	name: string;
	insurer: string;
};

type DiagnosisFormState = {
	diagnosis: string;
	symptoms: string;
	findings: string;
	labs: string;
	plan: string;
	notes: string;
	estimatedCost: string;
};

const initialPatient: PatientFormState = { name: "", insurer: "AIA" };
const initialDiagnosis: DiagnosisFormState = {
	diagnosis: "",
	symptoms: "",
	findings: "",
	labs: "",
	plan: "",
	notes: "",
	estimatedCost: "",
};

export default function DoctorPage() {
	const { patients, doctorCases, isLoading } = useDoctorData();
	const { createPatient, createDoctorCase } = useDoctorActions();

	const [patientForm, setPatientForm] =
		useState<PatientFormState>(initialPatient);
	const [selectedPatientId, setSelectedPatientId] =
		useState<Id<"patients"> | null>(null);
	const [diagnosisForm, setDiagnosisForm] =
		useState<DiagnosisFormState>(initialDiagnosis);
	const [patientStatus, setPatientStatus] = useState<Status>({
		tone: "idle",
	});
	const [diagnosisStatus, setDiagnosisStatus] = useState<Status>({
		tone: "idle",
	});
	const [aiDraft, setAiDraft] = useState("");
	const [aiStatus, setAiStatus] = useState<Status>({
		tone: "idle",
	});

	useEffect(() => {
		// reset statuses when switching patients; include message only when switching
		setDiagnosisStatus({
			tone: "idle",
			message: selectedPatientId ? "Switched patient context." : undefined,
		});
		setAiStatus({ tone: "idle" });
	}, [selectedPatientId]);

	const compiledDiagnosis = useMemo(() => {
		const lines = [
			diagnosisForm.diagnosis &&
				`Working diagnosis: ${diagnosisForm.diagnosis}`,
			diagnosisForm.symptoms && `Symptoms/onset: ${diagnosisForm.symptoms}`,
			diagnosisForm.findings && `Findings/imaging: ${diagnosisForm.findings}`,
			diagnosisForm.labs && `Labs: ${diagnosisForm.labs}`,
			diagnosisForm.plan && `Plan/intervention: ${diagnosisForm.plan}`,
			diagnosisForm.notes && `Notes: ${diagnosisForm.notes}`,
		].filter(Boolean);
		return lines.join("\n");
	}, [diagnosisForm]);

	function handleDirectoryImport(imported: PatientFormState) {
		setPatientForm(imported);
		setSelectedPatientId(null);
		setPatientStatus({ tone: "idle" });
	}

	function handleExistingPatientSelect(patientId: Id<"patients">) {
		const existing = patients.find((p) => p._id === patientId);
		if (!existing) return;
		setSelectedPatientId(existing._id as Id<"patients">);
		setPatientForm({
			name: existing.name,
			insurer: existing.insurer,
		});
	}

	async function persistPatient() {
		if (!patientForm.name || !patientForm.insurer) {
			setPatientStatus({
				tone: "error",
				message: "Patient name and insurer are required.",
			});
			return null;
		}

		try {
			setPatientStatus({ tone: "loading", message: "Saving patient..." });
			const newId = await createPatient({
				name: patientForm.name,
				insurer: patientForm.insurer,
			});
			setSelectedPatientId(newId);
			setPatientStatus({
				tone: "success",
				message: "Patient saved. You can now capture diagnosis.",
			});
			return newId;
		} catch (error) {
			console.error(error);
			setPatientStatus({
				tone: "error",
				message: "Unable to save patient. Please try again.",
			});
			return null;
		}
	}

	async function handleSaveDiagnosis() {
		let patientId = selectedPatientId;

		setDiagnosisStatus({ tone: "loading", message: "Saving diagnosis..." });

		if (!patientId) {
			const createdId = await persistPatient();
			if (!createdId) {
				setDiagnosisStatus({
					tone: "error",
					message: "Patient could not be saved. Fix patient info first.",
				});
				return;
			}
			patientId = createdId;
		}

		const payload: DoctorCasePayload = {
			patientId: patientId ?? undefined,
			patientName: patientForm.name || "Patient",
			insurerName: patientForm.insurer || "Unknown",
			diagnosis: diagnosisForm.diagnosis || "Pending diagnosis",
			notes: diagnosisForm.notes || undefined,
			estimatedCost: diagnosisForm.estimatedCost
				? Number.parseFloat(diagnosisForm.estimatedCost)
				: undefined,
			// Send structured fields separately
			symptoms: diagnosisForm.symptoms || undefined,
			findings: diagnosisForm.findings || undefined,
			labs: diagnosisForm.labs || undefined,
			plan: diagnosisForm.plan || undefined,
		};

		try {
			await createDoctorCase(payload);
			setDiagnosisStatus({
				tone: "success",
				message:
					"Diagnosis saved. Coordinator can now pick this case from their queue.",
			});
		} catch (error) {
			console.error(error);
			setDiagnosisStatus({
				tone: "error",
				message: "Could not save diagnosis to Convex.",
			});
		}
	}

	async function handleGenerateDraft() {
		setAiStatus({ tone: "loading", message: "Calling AI for draft..." });
		try {
			const response = await fetch("/api/doctor/report", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					patient: {
						name: patientForm.name || "Patient",
						insurer: patientForm.insurer || "Unknown",
					},
					diagnosis: {
						primary: diagnosisForm.diagnosis,
						symptoms: diagnosisForm.symptoms,
						findings: diagnosisForm.findings,
						labs: diagnosisForm.labs,
						plan: diagnosisForm.plan,
						notes: diagnosisForm.notes,
					},
				}),
			});

			if (!response.ok) {
				throw new Error("AI draft failed");
			}

			const data = (await response.json()) as {
				report: string;
				model?: string;
				provider?: string;
				note?: string;
			};

			setAiDraft(data.report);
			setAiStatus({
				tone: "success",
				message: `Draft ready${
					data.provider ? ` (${data.provider} – ${data.model})` : ""
				}`,
			});
		} catch (error) {
			console.error(error);
			setAiDraft(
				[
					"Clinical report draft",
					"Include presentation, findings, working diagnosis, and plan.",
					compiledDiagnosis,
				]
					.filter(Boolean)
					.join("\n\n"),
			);
			setAiStatus({
				tone: "error",
				message: "AI unavailable; using a templated draft.",
			});
		}
	}

	return (
		<div className="space-y-6">
			<section>
				<Card className="border-0 bg-white shadow-soft-md">
					<CardHeader className="gap-2">
						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<p className="text-muted-foreground text-xs uppercase tracking-[0.3em]">
									Doctor workspace
								</p>
								<CardTitle className="font-serif text-2xl text-gray-900">
									Clinical Dashboard
								</CardTitle>
							</div>
							{selectedPatientId && (
								<div className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700 text-xs">
									Active Patient: {patientForm.name}
								</div>
							)}
						</div>
					</CardHeader>
				</Card>
			</section>

			<Tabs className="w-full" defaultValue="new">
				<TabsList className="mb-4 h-auto w-full justify-start rounded-none border-b bg-transparent p-0">
					<TabsTrigger
						className="rounded-none border-transparent border-b-2 px-4 py-2 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
						value="new"
					>
						New Consultation
					</TabsTrigger>
					<TabsTrigger
						className="rounded-none border-transparent border-b-2 px-4 py-2 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
						value="history"
					>
						Case History
					</TabsTrigger>
				</TabsList>

				<TabsContent className="mt-0" value="new">
					<div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
						{/* Left Column: Input Flow */}
						<div className="space-y-6">
							<Card className="bg-white">
								<CardHeader className="pb-3">
									<CardTitle className="font-medium text-gray-900 text-lg">
										1. Patient Identification
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="space-y-2">
										<label
											className="font-medium text-muted-foreground text-xs uppercase tracking-wider"
											htmlFor="existingPatient"
										>
											Quick Select
										</label>
										<div className="flex gap-2 overflow-x-auto pb-2">
											{directoryPatients.map((patient) => (
												<button
													className="flex-shrink-0 rounded-full border bg-gray-50 px-3 py-1 font-medium text-xs transition-colors hover:bg-blue-50 hover:text-blue-700"
													key={patient.name}
													onClick={() => handleDirectoryImport(patient)}
													type="button"
												>
													+ {patient.name}
												</button>
											))}
										</div>
										<select
											className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
											id="existingPatient"
											onChange={(e) =>
												e.target.value &&
												handleExistingPatientSelect(
													e.target.value as Id<"patients">,
												)
											}
											value={selectedPatientId ?? ""}
										>
											<option value="">Select from database...</option>
											{patients.map((patient) => (
												<option
													key={patient._id as string}
													value={patient._id as string}
												>
													{patient.name} ({patient.insurer})
												</option>
											))}
										</select>
									</div>

									<div className="grid grid-cols-2 gap-4 border-t pt-2">
										<div className="space-y-1.5">
											<label
												className="font-medium text-sm"
												htmlFor="patientName"
											>
												Name
											</label>
											<Input
												className="bg-gray-50/50"
												id="patientName"
												onChange={(e) =>
													setPatientForm((prev) => ({
														...prev,
														name: e.target.value,
													}))
												}
												placeholder="Full Name"
												value={patientForm.name}
											/>
										</div>
										<div className="space-y-1.5">
											<label
												className="font-medium text-sm"
												htmlFor="patientInsurer"
											>
												Insurer
											</label>
											<select
												className="flex h-9 w-full rounded-md border border-input bg-gray-50/50 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
												id="patientInsurer"
												onChange={(e) =>
													setPatientForm((prev) => ({
														...prev,
														insurer: e.target.value,
													}))
												}
												value={patientForm.insurer}
											>
												<option value="AIA">AIA</option>
												<option value="Prudential">Prudential</option>
												<option value="Allianz">Allianz</option>
												<option value="Great Eastern">Great Eastern</option>
											</select>
										</div>
									</div>

									<Button
										className="w-full"
										disabled={
											patientStatus.tone === "loading" || !!selectedPatientId
										}
										onClick={persistPatient}
										size="sm"
										variant="outline"
									>
										{patientStatus.tone === "loading"
											? "Saving..."
											: selectedPatientId
												? "Patient Selected"
												: "Confirm Patient Details"}
									</Button>

									{patientStatus.message && (
										<p
											className={cn(
												"text-xs",
												patientStatus.tone === "error"
													? "text-red-500"
													: "text-green-600",
											)}
										>
											{patientStatus.message}
										</p>
									)}
								</CardContent>
							</Card>

							<Card className="bg-white">
								<CardHeader className="pb-3">
									<CardTitle className="font-medium text-gray-900 text-lg">
										2. Clinical Assessment
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="space-y-1.5">
										<label
											className="font-medium text-sm"
											htmlFor="workingDiagnosis"
										>
											Working Diagnosis
										</label>
										<Input
											className="font-medium"
											id="workingDiagnosis"
											onChange={(e) =>
												setDiagnosisForm((prev) => ({
													...prev,
													diagnosis: e.target.value,
												}))
											}
											placeholder="e.g. Acute Appendicitis"
											value={diagnosisForm.diagnosis}
										/>
									</div>

									<div className="grid grid-cols-1 gap-4">
										<div className="space-y-1.5">
											<label
												className="font-medium text-muted-foreground text-sm"
												htmlFor="symptoms"
											>
												Subjective (Symptoms)
											</label>
											<textarea
												className="min-h-[80px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
												id="symptoms"
												onChange={(e) =>
													setDiagnosisForm((prev) => ({
														...prev,
														symptoms: e.target.value,
													}))
												}
												placeholder="History of presenting illness..."
												value={diagnosisForm.symptoms}
											/>
										</div>
										<div className="space-y-1.5">
											<label
												className="font-medium text-muted-foreground text-sm"
												htmlFor="findings"
											>
												Objective (Findings)
											</label>
											<textarea
												className="min-h-[80px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
												id="findings"
												onChange={(e) =>
													setDiagnosisForm((prev) => ({
														...prev,
														findings: e.target.value,
													}))
												}
												placeholder="Physical exam findings..."
												value={diagnosisForm.findings}
											/>
										</div>
										<div className="space-y-1.5">
											<label
												className="font-medium text-muted-foreground text-sm"
												htmlFor="labs"
											>
												Labs / Imaging
											</label>
											<textarea
												className="min-h-[60px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
												id="labs"
												onChange={(e) =>
													setDiagnosisForm((prev) => ({
														...prev,
														labs: e.target.value,
													}))
												}
												placeholder="Relevant values..."
												value={diagnosisForm.labs}
											/>
										</div>
										<div className="space-y-1.5">
											<label
												className="font-medium text-muted-foreground text-sm"
												htmlFor="plan"
											>
												Plan
											</label>
											<textarea
												className="min-h-[80px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
												id="plan"
												onChange={(e) =>
													setDiagnosisForm((prev) => ({
														...prev,
														plan: e.target.value,
													}))
												}
												placeholder="Treatment plan..."
												value={diagnosisForm.plan}
											/>
										</div>
									</div>

									<div className="space-y-4 border-t pt-4">
										<div className="grid grid-cols-2 gap-4">
											<div className="space-y-1.5">
												<label
													className="font-medium text-sm"
													htmlFor="estCost"
												>
													Est. Cost (RM)
												</label>
												<Input
													id="estCost"
													onChange={(e) =>
														setDiagnosisForm((prev) => ({
															...prev,
															estimatedCost: e.target.value,
														}))
													}
													placeholder="0.00"
													type="number"
													value={diagnosisForm.estimatedCost}
												/>
											</div>
										</div>
										<div className="space-y-1.5">
											<label className="font-medium text-sm" htmlFor="notes">
												Private Notes / Context
											</label>
											<textarea
												className="min-h-[60px] w-full rounded-md border bg-gray-50/50 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
												id="notes"
												onChange={(e) =>
													setDiagnosisForm((prev) => ({
														...prev,
														notes: e.target.value,
													}))
												}
												placeholder="Internal notes for coordinator..."
												value={diagnosisForm.notes}
											/>
										</div>
									</div>
								</CardContent>
							</Card>
						</div>

						{/* Right Column: AI & Actions */}
						<div className="space-y-6">
							<Card className="flex h-full flex-col border-blue-100 bg-blue-50/50">
								<CardHeader className="pb-3">
									<div className="flex items-center justify-between">
										<CardTitle className="font-medium text-blue-900 text-lg">
											3. AI Report Generator
										</CardTitle>
										<Button
											className="bg-blue-600 text-white hover:bg-blue-700"
											disabled={aiStatus.tone === "loading"}
											onClick={handleGenerateDraft}
											size="sm"
										>
											{aiStatus.tone === "loading"
												? "Generating..."
												: "Generate Draft"}
										</Button>
									</div>
									<CardDescription className="text-blue-700/80">
										Creates a structured clinical abstract for insurance
										submission.
									</CardDescription>
								</CardHeader>
								<CardContent className="flex flex-1 flex-col gap-4">
									{aiStatus.message && (
										<div
											className={cn(
												"rounded bg-white/50 p-2 text-xs",
												aiStatus.tone === "error"
													? "text-red-600"
													: "text-blue-700",
											)}
										>
											{aiStatus.message}
										</div>
									)}
									<textarea
										className="min-h-[400px] w-full flex-1 rounded-md border border-blue-200 bg-white px-4 py-3 font-mono text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-400"
										onChange={(e) => setAiDraft(e.target.value)}
										placeholder="Generated report will appear here..."
										value={aiDraft}
									/>

									<div className="border-blue-200 border-t pt-4">
										<Button
											className="h-12 w-full text-base shadow-md"
											disabled={diagnosisStatus.tone === "loading"}
											onClick={handleSaveDiagnosis}
										>
											{diagnosisStatus.tone === "loading"
												? "Submitting Case..."
												: "Submit Case to Coordinator"}
										</Button>
										{diagnosisStatus.message && (
											<p
												className={cn(
													"mt-2 text-center text-xs",
													diagnosisStatus.tone === "error"
														? "text-red-600"
														: "text-green-600",
												)}
											>
												{diagnosisStatus.message}
											</p>
										)}
									</div>
								</CardContent>
							</Card>
						</div>
					</div>
				</TabsContent>

				<TabsContent value="history">
					<Card>
						<CardHeader>
							<CardTitle>Recent Cases</CardTitle>
							<CardDescription>
								History of cases submitted for coordination.
							</CardDescription>
						</CardHeader>
						<CardContent>
							{!isLoading && doctorCases.length === 0 ? (
								<div className="py-12 text-center text-muted-foreground">
									No cases found. Start a new consultation.
								</div>
							) : (
								<div className="space-y-4">
									{doctorCases.map((c) => (
										<div
											className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50"
											key={c._id as string}
										>
											<div className="space-y-1">
												<p className="font-medium text-base">{c.patientName}</p>
												<div className="flex items-center gap-2 text-muted-foreground text-sm">
													<span>{c.insurerName}</span>
													<span>•</span>
													<span>{c.diagnosis}</span>
												</div>
											</div>
											<div className="text-right">
												<div className="inline-flex items-center rounded-full border border-transparent bg-secondary px-2.5 py-0.5 font-semibold text-secondary-foreground text-xs transition-colors hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
													{c.status ?? "DOCTOR_DRAFT"}
												</div>
											</div>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
