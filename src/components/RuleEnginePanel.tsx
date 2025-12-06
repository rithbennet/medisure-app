"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { parsePdfAction } from "@/app/actions/parse-pdf";

// ============== TYPES ==============

interface PdfMetadata {
	fileName: string;
	fileSize: number;
	numPages: number | string;
	textLength: number;
	parseTimeMs: number;
	method?: "unpdf" | "gemini-ocr";
}

interface Signal {
	ruleId: string;
	severity: "Blocker" | "Warning" | "Info";
	message: string;
	clauseId?: string;
	clauseText?: string;
	evidence?: Record<string, unknown>;
	suggestedAction?: string;
}

interface MissingItem {
	type: string;
	key: string;
	reason: string;
}

interface RuleEngineResult {
	scoreBucket: "Low" | "Medium" | "High";
	approvalProbability: number;
	signals: Signal[];
	missingItems: MissingItem[];
	suggestedActions: string[];
}

interface FinalReport {
	case_id: string;
	score_bucket: "Low" | "Medium" | "High";
	approval_probability: number;
	narrative_summary: string;
	rule_explanations?: Array<{
		rule_id: string;
		explanation: string;
		clause_reference?: string;
	}>;
	financial_exposure?: {
		uncovered_amounts: Array<{ category: string; amount: number }>;
		total_uncovered: number;
	};
	pec_concerns?: string[];
	missing_items_summary?: string;
	coordinator_actions: string[];
}

interface CaseIntake {
	diagnosis: string;
	diagnosisCode?: string;
	symptomStartDate: string;
	policyStartDate: string;
	estimatedCost: number;
	patientName?: string;
	encounterType?: string;
	panelStatus?: string;
	estimateBreakdown?: Array<{ category: string; amount: number }>;
}

// ============== COMPONENT ==============

interface RuleEnginePanelProps {
	glId?: string;
	policyId?: string;
}

export function RuleEnginePanel({ glId, policyId }: RuleEnginePanelProps) {
	// Debug: Log props to console
	console.log("[RuleEnginePanel] Props:", { glId, policyId });

	// Refs for file inputs
	const policyFileRef = useRef<HTMLInputElement>(null);
	const clinicalFileRef = useRef<HTMLInputElement>(null);

	// State for document ingestion
	const [policyText, setPolicyText] = useState("");
	const [clinicalText, setClinicalText] = useState("");
	const [isParsingPolicy, setIsParsingPolicy] = useState(false);
	const [isParsingClinical, setIsParsingClinical] = useState(false);
	const [isUploadingPolicyPdf, setIsUploadingPolicyPdf] = useState(false);
	const [isUploadingClinicalPdf, setIsUploadingClinicalPdf] = useState(false);
	const [policyPdfMeta, setPolicyPdfMeta] = useState<PdfMetadata | null>(null);
	const [clinicalPdfMeta, setClinicalPdfMeta] = useState<PdfMetadata | null>(null);
	const [policyParseResult, setPolicyParseResult] = useState<{
		clauseCount: number;
		configExtracted: boolean;
	} | null>(null);
	const [clinicalParseResult, setClinicalParseResult] = useState<{
		pecIndicators: string[];
	} | null>(null);

	// State for case intake
	const [caseIntake, setCaseIntake] = useState<CaseIntake>({
		diagnosis: "Acute appendicitis",
		diagnosisCode: "K35.80",
		symptomStartDate: "2024-10-28",
		policyStartDate: "2024-06-01",
		estimatedCost: 18000,
		patientName: "Jane Doe",
		encounterType: "inpatient",
		panelStatus: "panel",
		estimateBreakdown: [
			{ category: "surgical_fee", amount: 8000 },
			{ category: "anesthetist_fee", amount: 2000 },
			{ category: "ot_charges", amount: 4000 },
			{ category: "room_board", amount: 2000 },
			{ category: "drugs", amount: 2000 },
		],
	});

	// State for rule evaluation
	const [isEvaluating, setIsEvaluating] = useState(false);
	const [ruleResult, setRuleResult] = useState<RuleEngineResult | null>(null);

	// State for final report
	const [isGeneratingReport, setIsGeneratingReport] = useState(false);
	const [finalReport, setFinalReport] = useState<FinalReport | null>(null);

	const [error, setError] = useState<string | null>(null);

	// ============== HANDLERS ==============

	const handlePolicyPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setIsUploadingPolicyPdf(true);
		setError(null);
		setPolicyPdfMeta(null);

		try {
			const formData = new FormData();
			formData.append("file", file);

			console.log("[PDF Upload] Uploading file:", file.name, file.size, "bytes");

			// Use Server Action for larger file support (up to 50MB)
			const data = await parsePdfAction(formData);
			console.log("[PDF Upload] Response:", data);

			if (!data.success) {
				throw new Error(data.error || "Failed to parse PDF");
			}

			// Check if text was extracted
			if (!data.text || data.text.trim().length === 0) {
				throw new Error("No text could be extracted from this PDF. It might be a scanned image or have no readable text.");
			}

			console.log("[PDF Upload] Extracted text length:", data.text.length);

			// Set the extracted text
			setPolicyText(data.text);
			setPolicyPdfMeta({
				fileName: data.metadata!.fileName,
				fileSize: data.metadata!.fileSize,
				numPages: data.metadata!.numPages,
				textLength: data.metadata!.textLength,
				parseTimeMs: data.metadata!.parseTimeMs,
				method: data.metadata!.method,
			});

			console.log("[PDF Upload] Text set successfully, method:", data.metadata!.method);
		} catch (err) {
			console.error("[PDF Upload] Error:", err);
			setError(err instanceof Error ? err.message : "Failed to parse PDF");
		} finally {
			setIsUploadingPolicyPdf(false);
			// Reset file input
			if (policyFileRef.current) {
				policyFileRef.current.value = "";
			}
		}
	};

	const handleClinicalPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setIsUploadingClinicalPdf(true);
		setError(null);
		setClinicalPdfMeta(null);

		try {
			const formData = new FormData();
			formData.append("file", file);

			// Use Server Action for larger file support (up to 50MB)
			const data = await parsePdfAction(formData);

			if (!data.success) {
				throw new Error(data.error || "Failed to parse PDF");
			}

			// Set the extracted text
			setClinicalText(data.text!);
			setClinicalPdfMeta({
				fileName: data.metadata!.fileName,
				fileSize: data.metadata!.fileSize,
				numPages: data.metadata!.numPages,
				textLength: data.metadata!.textLength,
				parseTimeMs: data.metadata!.parseTimeMs,
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to parse PDF");
		} finally {
			setIsUploadingClinicalPdf(false);
			// Reset file input
			if (clinicalFileRef.current) {
				clinicalFileRef.current.value = "";
			}
		}
	};

	const handleParsePolicy = async () => {
		if (!policyText.trim() || !policyId) return;

		setIsParsingPolicy(true);
		setError(null);

		try {
			const res = await fetch("/api/ai/parse-policy", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					policyId,
					rawText: policyText,
					insurerName: "Demo Insurance",
				}),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || "Failed to parse policy");
			}

			setPolicyParseResult({
				clauseCount: data.clauses?.length || 0,
				configExtracted: !!data.config,
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unknown error");
		} finally {
			setIsParsingPolicy(false);
		}
	};

	const handleParseClinical = async () => {
		if (!clinicalText.trim()) return;

		setIsParsingClinical(true);
		setError(null);

		try {
			const res = await fetch("/api/ai/parse-clinical", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					rawText: clinicalText,
					docType: "doctor_report",
				}),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || "Failed to parse clinical doc");
			}

			setClinicalParseResult({
				pecIndicators: data.findings?.pecIndicators || [],
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unknown error");
		} finally {
			setIsParsingClinical(false);
		}
	};

	const handleEvaluateRules = async () => {
		if (!glId) {
			setError("Please create demo data first");
			return;
		}

		setIsEvaluating(true);
		setError(null);

		try {
			const res = await fetch("/api/ai/evaluate-rules", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ glId }),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || "Failed to evaluate rules");
			}

			setRuleResult(data.result);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unknown error");
		} finally {
			setIsEvaluating(false);
		}
	};

	const handleGenerateFinalReport = async () => {
		if (!glId) {
			setError("Please create demo data first");
			return;
		}

		if (!ruleResult) {
			setError("Please evaluate rules first");
			return;
		}

		setIsGeneratingReport(true);
		setError(null);

		try {
			const res = await fetch("/api/ai/final-report", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ glId }),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || "Failed to generate report");
			}

			setFinalReport(data.report);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unknown error");
		} finally {
			setIsGeneratingReport(false);
		}
	};

	// ============== RENDER HELPERS ==============

	const getSeverityColor = (severity: Signal["severity"]) => {
		switch (severity) {
			case "Blocker":
				return "bg-red-100 text-red-800 border-red-200";
			case "Warning":
				return "bg-amber-100 text-amber-800 border-amber-200";
			case "Info":
				return "bg-blue-100 text-blue-800 border-blue-200";
		}
	};

	const getRiskBucketColor = (bucket: RuleEngineResult["scoreBucket"]) => {
		switch (bucket) {
			case "High":
				return "bg-red-500";
			case "Medium":
				return "bg-amber-500";
			case "Low":
				return "bg-green-500";
		}
	};

	// ============== RENDER ==============

	return (
		<div className="space-y-6">
			{/* Step 1: Document Ingestion */}
			<Card className="shadow-soft">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 font-mono text-blue-700 text-xs">
							1
						</span>
						Document Ingestion
					</CardTitle>
					<CardDescription>
						Upload PDF documents or paste text for Gemini-powered extraction
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Debug info */}
					<div className="rounded-lg bg-gray-100 p-2 font-mono text-xs text-gray-600">
						<span className="font-semibold">Debug:</span>{" "}
						policyId={policyId ? `"${policyId}"` : "undefined"},{" "}
						glId={glId ? `"${glId}"` : "undefined"}
					</div>

					{/* Warning banner when no policyId */}
					{!policyId && (
						<div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800 text-sm">
							<svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
								<path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
							</svg>
							<span>
								<strong>Create demo data first</strong> (above) to enable clause extraction and rule evaluation.
								You can still upload/parse PDFs to preview text.
							</span>
						</div>
					)}
					{/* Policy Document */}
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<label className="font-medium text-gray-700 text-sm">
								Policy Document
							</label>
							{policyPdfMeta && (
								<span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700 text-xs">
									{policyPdfMeta.fileName} ({policyPdfMeta.numPages} pages)
								</span>
							)}
						</div>

						{/* PDF Upload */}
						<div className="flex items-center gap-3">
							<input
								accept=".pdf"
								className="hidden"
								disabled={isUploadingPolicyPdf}
								onChange={handlePolicyPdfUpload}
								ref={policyFileRef}
								type="file"
							/>
							<Button
								disabled={isUploadingPolicyPdf}
								onClick={() => policyFileRef.current?.click()}
								size="sm"
								variant="outline"
								className="border-dashed"
							>
								{isUploadingPolicyPdf ? (
									<span className="flex items-center gap-2">
										<span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
										Extracting text...
									</span>
								) : (
									<>
										<svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
										</svg>
										Upload Policy PDF
									</>
								)}
							</Button>
							<span className="text-gray-400 text-xs">or paste text below</span>
						</div>

						{/* PDF Metadata */}
						{policyPdfMeta && (
							<div className="space-y-2">
								<div className="flex flex-wrap gap-3 rounded-lg bg-blue-50 p-2 text-xs text-blue-700">
									<span>📄 {(policyPdfMeta.fileSize / 1024).toFixed(1)} KB</span>
									<span>📃 {policyPdfMeta.numPages} pages</span>
									<span>📝 {policyPdfMeta.textLength.toLocaleString()} chars</span>
									<span>⏱️ {policyPdfMeta.parseTimeMs}ms</span>
									{policyPdfMeta.method && (
										<span className={`rounded px-1.5 py-0.5 ${
											policyPdfMeta.method === "gemini-ocr" 
												? "bg-purple-200 text-purple-800" 
												: "bg-green-200 text-green-800"
										}`}>
											{policyPdfMeta.method === "gemini-ocr" ? "🤖 Gemini OCR" : "📖 Native"}
										</span>
									)}
								</div>
								{policyPdfMeta.textLength === 0 && (
									<div className="rounded-lg bg-red-50 p-2 text-xs text-red-700">
										⚠️ No text extracted! This PDF might be corrupted or completely empty.
									</div>
								)}
							</div>
						)}

						{/* Text Area */}
						<textarea
							className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							disabled={isParsingPolicy || isUploadingPolicyPdf}
							onChange={(e) => setPolicyText(e.target.value)}
							placeholder="Paste insurance policy text here or upload a PDF above..."
							rows={4}
							value={policyText}
						/>
						<div className="flex flex-wrap items-center gap-3">
							<Button
								disabled={!policyText.trim() || !policyId || isParsingPolicy}
								onClick={handleParsePolicy}
								size="sm"
							>
								{isParsingPolicy ? (
									<span className="flex items-center gap-2">
										<span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
										Parsing with Gemini...
									</span>
								) : (
									"Extract Clauses (Gemini)"
								)}
							</Button>
							{policyParseResult && (
								<span className="text-green-600 text-xs">
									✓ Extracted {policyParseResult.clauseCount} clauses
								</span>
							)}
							{!policyId && policyText && (
								<span className="rounded-md bg-amber-100 px-2 py-1 text-amber-700 text-xs">
									⚠️ Create demo data first to enable clause extraction
								</span>
							)}
							{policyId && policyText && !policyParseResult && (
								<span className="text-gray-400 text-xs">
									{policyText.length.toLocaleString()} characters ready
								</span>
							)}
						</div>
					</div>

					{/* Divider */}
					<div className="relative">
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-gray-200 border-t" />
						</div>
						<div className="relative flex justify-center">
							<span className="bg-white px-2 text-gray-400 text-xs">Clinical Documents (Optional)</span>
						</div>
					</div>

					{/* Clinical Document */}
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<label className="font-medium text-gray-700 text-sm">
								Doctor's Report / Clinical Notes
							</label>
							{clinicalPdfMeta && (
								<span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700 text-xs">
									{clinicalPdfMeta.fileName}
								</span>
							)}
						</div>

						{/* PDF Upload */}
						<div className="flex items-center gap-3">
							<input
								accept=".pdf"
								className="hidden"
								disabled={isUploadingClinicalPdf}
								onChange={handleClinicalPdfUpload}
								ref={clinicalFileRef}
								type="file"
							/>
							<Button
								disabled={isUploadingClinicalPdf}
								onClick={() => clinicalFileRef.current?.click()}
								size="sm"
								variant="outline"
								className="border-dashed"
							>
								{isUploadingClinicalPdf ? (
									<span className="flex items-center gap-2">
										<span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
										Extracting text...
									</span>
								) : (
									<>
										<svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
										</svg>
										Upload Clinical PDF
									</>
								)}
							</Button>
							<span className="text-gray-400 text-xs">or paste text below</span>
						</div>

						{/* PDF Metadata */}
						{clinicalPdfMeta && (
							<div className="flex gap-4 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-700">
								<span>📄 {(clinicalPdfMeta.fileSize / 1024).toFixed(1)} KB</span>
								<span>📃 {clinicalPdfMeta.numPages} pages</span>
								<span>📝 {clinicalPdfMeta.textLength.toLocaleString()} chars</span>
							</div>
						)}

						{/* Text Area */}
						<textarea
							className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							disabled={isParsingClinical || isUploadingClinicalPdf}
							onChange={(e) => setClinicalText(e.target.value)}
							placeholder="Paste doctor's report or clinical notes here, or upload a PDF..."
							rows={3}
							value={clinicalText}
						/>
						<div className="flex items-center gap-3">
							<Button
								disabled={!clinicalText.trim() || isParsingClinical}
								onClick={handleParseClinical}
								size="sm"
								variant="outline"
							>
								{isParsingClinical ? (
									<span className="flex items-center gap-2">
										<span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
										Parsing...
									</span>
								) : (
									"Extract Findings (Gemini)"
								)}
							</Button>
							{clinicalParseResult && (
								<span className="text-green-600 text-xs">
									✓ Found {clinicalParseResult.pecIndicators.length} PEC indicators
								</span>
							)}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Step 2: Case Intake Preview */}
			<Card className="shadow-soft">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 font-mono text-blue-700 text-xs">
							2
						</span>
						Case Intake
					</CardTitle>
					<CardDescription>
						GL request data (using demo data or loaded from Convex)
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="rounded-lg bg-gray-50 p-4">
						<pre className="overflow-auto font-mono text-xs text-gray-700">
							{JSON.stringify(caseIntake, null, 2)}
						</pre>
					</div>
					{!glId && (
						<p className="mt-2 text-amber-600 text-xs">
							⚠️ No GL ID - create demo data first
						</p>
					)}
				</CardContent>
			</Card>

			{/* Step 3: Rule Evaluation */}
			<Card className="shadow-soft">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 font-mono text-blue-700 text-xs">
							3
						</span>
						Deterministic Rule Evaluation
					</CardTitle>
					<CardDescription>
						Run business rules (I-4.*, EL-5.*, RS-6.*)
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<Button
						disabled={!glId || isEvaluating}
						onClick={handleEvaluateRules}
					>
						{isEvaluating ? (
							<span className="flex items-center gap-2">
								<span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
								Evaluating Rules...
							</span>
						) : (
							"Run Rule Engine"
						)}
					</Button>

					{ruleResult && (
						<div className="space-y-4">
							{/* Risk Summary */}
							<div className="flex items-center gap-4 rounded-lg border p-4">
								<div
									className={`flex h-16 w-16 items-center justify-center rounded-full text-white ${getRiskBucketColor(ruleResult.scoreBucket)}`}
								>
									<span className="font-bold text-xl">
										{Math.round(ruleResult.approvalProbability * 100)}%
									</span>
								</div>
								<div>
									<p className="font-semibold text-gray-900">
										Risk Bucket:{" "}
										<span
											className={`${ruleResult.scoreBucket === "High" ? "text-red-600" : ruleResult.scoreBucket === "Medium" ? "text-amber-600" : "text-green-600"}`}
										>
											{ruleResult.scoreBucket}
										</span>
									</p>
									<p className="text-gray-500 text-sm">
										Approval Probability:{" "}
										{(ruleResult.approvalProbability * 100).toFixed(0)}%
									</p>
								</div>
							</div>

							{/* Signals */}
							<div className="space-y-2">
								<h4 className="font-medium text-gray-700 text-sm">
									Signals ({ruleResult.signals.length})
								</h4>
								{ruleResult.signals.length === 0 ? (
									<p className="text-gray-500 text-sm">No issues found</p>
								) : (
									<div className="space-y-2">
										{ruleResult.signals.map((signal, idx) => (
											<div
												className={`rounded-lg border p-3 ${getSeverityColor(signal.severity)}`}
												key={`${signal.ruleId}-${idx}`}
											>
												<div className="flex items-start justify-between">
													<div>
														<span className="font-mono text-xs opacity-70">
															{signal.ruleId}
														</span>
														<span
															className={`ml-2 rounded px-1.5 py-0.5 text-xs ${signal.severity === "Blocker" ? "bg-red-200" : signal.severity === "Warning" ? "bg-amber-200" : "bg-blue-200"}`}
														>
															{signal.severity}
														</span>
													</div>
												</div>
												<p className="mt-1 text-sm">{signal.message}</p>
												{signal.clauseId && (
													<p className="mt-1 font-mono text-xs opacity-70">
														Clause: {signal.clauseId}
													</p>
												)}
											</div>
										))}
									</div>
								)}
							</div>

							{/* Missing Items */}
							{ruleResult.missingItems.length > 0 && (
								<div className="space-y-2">
									<h4 className="font-medium text-gray-700 text-sm">
										Missing Items ({ruleResult.missingItems.length})
									</h4>
									<ul className="list-inside list-disc space-y-1 text-gray-600 text-sm">
										{ruleResult.missingItems.map((item, idx) => (
											<li key={`${item.key}-${idx}`}>
												<span className="font-medium">{item.key}</span>:{" "}
												{item.reason}
											</li>
										))}
									</ul>
								</div>
							)}

							{/* Checklist (PS-8.*) */}
							<div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
								<h4 className="mb-2 font-medium text-gray-700 text-sm">
									Pre-Submit Checklist
								</h4>
								<div className="space-y-1.5 text-sm">
									<ChecklistItem
										checked={
											ruleResult.signals.filter(
												(s) => s.severity === "Blocker",
											).length === 0
										}
										label="No Blockers remaining"
										ruleId="PS-8.1"
									/>
									<ChecklistItem
										checked={ruleResult.missingItems.length === 0}
										label="All required documents uploaded"
										ruleId="PS-8.2"
									/>
									<ChecklistItem
										checked={
											!ruleResult.signals.some((s) => s.ruleId === "I-4.2")
										}
										label="Estimate sums correctly"
										ruleId="PS-8.3"
									/>
									<ChecklistItem
										checked={
											!ruleResult.signals.some((s) => s.ruleId === "EL-5.9")
										}
										label="Panel status verified"
										ruleId="PS-8.3"
									/>
								</div>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Step 4: Final Report */}
			<Card className="shadow-soft">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 font-mono text-purple-700 text-xs">
							4
						</span>
						Final Risk Report (Claude)
					</CardTitle>
					<CardDescription>
						AI-generated narrative analysis grounded in rule engine results
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<Button
						disabled={!glId || !ruleResult || isGeneratingReport}
						onClick={handleGenerateFinalReport}
						variant={ruleResult ? "default" : "outline"}
					>
						{isGeneratingReport ? (
							<span className="flex items-center gap-2">
								<span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
								Generating with Claude...
							</span>
						) : (
							"Generate Final Report (Claude)"
						)}
					</Button>

					{finalReport && (
						<div className="space-y-4">
							{/* Narrative Summary */}
							<div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
								<h4 className="mb-2 font-medium text-purple-800 text-sm">
									Narrative Summary
								</h4>
								<p className="whitespace-pre-wrap text-gray-700 text-sm">
									{finalReport.narrative_summary}
								</p>
							</div>

							{/* Rule Explanations */}
							{finalReport.rule_explanations &&
								finalReport.rule_explanations.length > 0 && (
									<div className="space-y-2">
										<h4 className="font-medium text-gray-700 text-sm">
											Rule Explanations
										</h4>
										{finalReport.rule_explanations.map((exp, idx) => (
											<div
												className="rounded-lg border bg-white p-3"
												key={`${exp.rule_id}-${idx}`}
											>
												<span className="font-mono text-gray-500 text-xs">
													{exp.rule_id}
												</span>
												{exp.clause_reference && (
													<span className="ml-2 text-gray-400 text-xs">
														({exp.clause_reference})
													</span>
												)}
												<p className="mt-1 text-gray-700 text-sm">
													{exp.explanation}
												</p>
											</div>
										))}
									</div>
								)}

							{/* Financial Exposure */}
							{finalReport.financial_exposure &&
								finalReport.financial_exposure.total_uncovered > 0 && (
									<div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
										<h4 className="mb-2 font-medium text-amber-800 text-sm">
											Financial Exposure
										</h4>
										<p className="font-semibold text-amber-900">
											Total Uncovered: $
											{finalReport.financial_exposure.total_uncovered.toLocaleString()}
										</p>
										<ul className="mt-2 space-y-1 text-amber-800 text-sm">
											{finalReport.financial_exposure.uncovered_amounts.map(
												(item, idx) => (
													<li key={`${item.category}-${idx}`}>
														{item.category}: ${item.amount.toLocaleString()}
													</li>
												),
											)}
										</ul>
									</div>
								)}

							{/* PEC Concerns */}
							{finalReport.pec_concerns &&
								finalReport.pec_concerns.length > 0 && (
									<div className="rounded-lg border border-red-200 bg-red-50 p-4">
										<h4 className="mb-2 font-medium text-red-800 text-sm">
											Pre-Existing Condition Concerns
										</h4>
										<ul className="list-inside list-disc space-y-1 text-red-700 text-sm">
											{finalReport.pec_concerns.map((concern, idx) => (
												<li key={idx}>{concern}</li>
											))}
										</ul>
									</div>
								)}

							{/* Coordinator Actions */}
							<div className="rounded-lg border border-green-200 bg-green-50 p-4">
								<h4 className="mb-2 font-medium text-green-800 text-sm">
									Coordinator Actions
								</h4>
								<ul className="list-inside list-decimal space-y-1 text-green-700 text-sm">
									{finalReport.coordinator_actions.map((action, idx) => (
										<li key={idx}>{action}</li>
									))}
								</ul>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Error Display */}
			{error && (
				<Card className="border-red-200 shadow-soft">
					<CardContent className="pt-6">
						<p className="text-red-600 text-sm">{error}</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

// ============== SUB-COMPONENTS ==============

function ChecklistItem({
	label,
	checked,
	ruleId,
}: {
	label: string;
	checked: boolean;
	ruleId: string;
}) {
	return (
		<div className="flex items-center gap-2">
			<span
				className={`flex h-5 w-5 items-center justify-center rounded ${checked ? "bg-green-100 text-green-600" : "bg-gray-200 text-gray-400"}`}
			>
				{checked ? "✓" : "○"}
			</span>
			<span className={checked ? "text-gray-700" : "text-gray-500"}>
				{label}
			</span>
			<span className="font-mono text-gray-400 text-xs">({ruleId})</span>
		</div>
	);
}

