/**
 * Rules Engine Module
 * Implements deterministic business rules for GL pre-approval analysis
 * Based on .cursor/businessRules.MD sections I-4.*, EL-5.*, RS-6.*
 */

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation, internalQuery } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

// ============== TYPE DEFINITIONS ==============

export type Severity = "Blocker" | "Warning" | "Info";
export type RiskBucket = "Low" | "Medium" | "High";

export interface Signal {
	ruleId: string;
	severity: Severity;
	message: string;
	clauseId?: string;
	clauseText?: string;
	evidence?: Record<string, unknown>;
	suggestedAction?: string;
}

export interface MissingItem {
	type: "field" | "attachment" | "doc";
	key: string;
	reason: string;
}

export interface RuleEngineResult {
	signals: Signal[];
	missingItems: MissingItem[];
	scoreBucket: RiskBucket;
	approvalProbability: number;
	suggestedActions: string[];
}

export interface CaseIntake {
	caseId?: string;
	diagnosis: string;
	diagnosisCode?: string;
	symptomStartDate: string;
	policyStartDate: string;
	estimatedCost: number;
	patientName?: string;
	encounterType?: "inpatient" | "outpatient" | "ed" | "day_surgery";
	plannedDate?: string;
	emergencyFlag?: boolean;
	accidentFlag?: boolean;
	panelStatus?: "panel" | "non_panel" | "unknown";
	estimateBreakdown?: Array<{ category: string; amount: number }>;
	attachments?: Array<{ type: string; fileName: string }>;
}

export interface PayerConfig {
	waitingPeriods?: Array<{ conditionTag: string; days: number; clauseId?: string }>;
	exclusionsGeneral?: Array<{ tag: string; description: string; clauseId?: string }>;
	exclusionsSpecific?: Array<{ code: string; codeType: string; description: string; clauseId?: string }>;
	sublimits?: Array<{ category: string; amount: number; currency: string; clauseId?: string }>;
	annualMax?: number;
	lifetimeMax?: number;
	currency?: string;
	requiredDocs?: Array<{ encounterType: string; docTypes: string[]; conditionTags?: string[] }>;
	electiveLeadTimeDays?: number;
	edNotificationHours?: number;
	panelRequired?: boolean;
}

export interface PolicyClause {
	clauseId: string;
	type: string;
	tags: string[];
	text: string;
	pageRef?: string;
	waitingPeriodDays?: number;
	sublimitAmount?: number;
	sublimitCategory?: string;
}

export interface ClinicalFindings {
	diagnoses?: string[];
	procedures?: string[];
	symptomDates?: string[];
	medicalHistory?: string[];
	pecIndicators?: string[];
	relevantTags?: string[];
}

// ============== UTILITY FUNCTIONS ==============

/**
 * Calculate days between two ISO date strings
 */
function daysBetween(date1: string, date2: string): number {
	const d1 = new Date(date1);
	const d2 = new Date(date2);
	const diffMs = d1.getTime() - d2.getTime();
	return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Check if a date is valid ISO-8601 format
 */
function isValidISODate(dateStr: string): boolean {
	const date = new Date(dateStr);
	return !Number.isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(dateStr);
}

/**
 * Check if a date is in the future
 */
function isFutureDate(dateStr: string): boolean {
	return new Date(dateStr) > new Date();
}

// ============== RULE IMPLEMENTATIONS ==============

/**
 * I-4.1 Required Fields Check
 */
function checkRequiredFields(intake: CaseIntake): Signal[] {
	const signals: Signal[] = [];
	const requiredFields = [
		{ key: "diagnosis", label: "Diagnosis" },
		{ key: "symptomStartDate", label: "Symptom Start Date" },
		{ key: "policyStartDate", label: "Policy Start Date" },
		{ key: "estimatedCost", label: "Estimated Cost" },
	];

	for (const field of requiredFields) {
		const value = intake[field.key as keyof CaseIntake];
		if (value === undefined || value === null || value === "") {
			signals.push({
				ruleId: "I-4.1",
				severity: "Blocker",
				message: `Required field missing: ${field.label}`,
				evidence: { field: field.key },
				suggestedAction: `Provide ${field.label}`,
			});
		}
	}

	return signals;
}

/**
 * I-4.2 Field Validations
 */
function checkFieldValidations(intake: CaseIntake): Signal[] {
	const signals: Signal[] = [];

	// Date format validations
	if (intake.symptomStartDate && !isValidISODate(intake.symptomStartDate)) {
		signals.push({
			ruleId: "I-4.2",
			severity: "Blocker",
			message: "Symptom start date must be valid ISO-8601 format (YYYY-MM-DD)",
			evidence: { field: "symptomStartDate", value: intake.symptomStartDate },
		});
	}

	if (intake.policyStartDate && !isValidISODate(intake.policyStartDate)) {
		signals.push({
			ruleId: "I-4.2",
			severity: "Blocker",
			message: "Policy start date must be valid ISO-8601 format (YYYY-MM-DD)",
			evidence: { field: "policyStartDate", value: intake.policyStartDate },
		});
	}

	// Future date check (symptom start shouldn't be in future)
	if (intake.symptomStartDate && isFutureDate(intake.symptomStartDate)) {
		signals.push({
			ruleId: "I-4.2",
			severity: "Blocker",
			message: "Symptom start date cannot be in the future",
			evidence: { field: "symptomStartDate", value: intake.symptomStartDate },
		});
	}

	// Cost validation
	if (intake.estimatedCost !== undefined && intake.estimatedCost <= 0) {
		signals.push({
			ruleId: "I-4.2",
			severity: "Blocker",
			message: "Estimated cost must be a positive number",
			evidence: { field: "estimatedCost", value: intake.estimatedCost },
		});
	}

	// Estimate breakdown sum validation (if provided)
	if (intake.estimateBreakdown && intake.estimateBreakdown.length > 0) {
		const breakdownSum = intake.estimateBreakdown.reduce((sum, item) => sum + item.amount, 0);
		const diff = Math.abs(breakdownSum - intake.estimatedCost);
		const diffPercent = (diff / intake.estimatedCost) * 100;

		if (diffPercent > 1) {
			signals.push({
				ruleId: "I-4.2",
				severity: "Blocker",
				message: `Estimate breakdown sum (${breakdownSum}) differs from total (${intake.estimatedCost}) by ${diffPercent.toFixed(1)}%`,
				evidence: { breakdownSum, totalEstimate: intake.estimatedCost, diffPercent },
			});
		} else if (diffPercent > 0) {
			signals.push({
				ruleId: "I-4.2",
				severity: "Warning",
				message: `Estimate breakdown sum (${breakdownSum}) differs slightly from total (${intake.estimatedCost})`,
				evidence: { breakdownSum, totalEstimate: intake.estimatedCost, diffPercent },
			});
		}
	}

	return signals;
}

/**
 * I-4.3 Attachment Requirements
 */
function checkAttachmentRequirements(
	intake: CaseIntake,
	config?: PayerConfig,
): { signals: Signal[]; missing: MissingItem[] } {
	const signals: Signal[] = [];
	const missing: MissingItem[] = [];

	const attachmentTypes = new Set(intake.attachments?.map((a) => a.type) || []);

	// Doctor report required for surgical/day_surgery/inpatient
	const requiresDoctorReport = ["inpatient", "day_surgery"].includes(intake.encounterType || "");
	if (requiresDoctorReport && !attachmentTypes.has("doctor_report")) {
		missing.push({
			type: "attachment",
			key: "doctor_report",
			reason: `Doctor report required for ${intake.encounterType} encounters`,
		});
		signals.push({
			ruleId: "I-4.3",
			severity: "Blocker",
			message: "Doctor report is required for this encounter type",
			evidence: { encounterType: intake.encounterType },
			suggestedAction: "Upload doctor report",
		});
	}

	// Itemized estimate if cost exceeds threshold
	const itemizedThreshold = 10000; // Default threshold
	if (intake.estimatedCost >= itemizedThreshold && !attachmentTypes.has("itemized_estimate")) {
		missing.push({
			type: "attachment",
			key: "itemized_estimate",
			reason: `Itemized estimate required for costs ≥ ${itemizedThreshold}`,
		});
		signals.push({
			ruleId: "I-4.3",
			severity: "Warning",
			message: `Itemized estimate recommended for costs ≥ ${itemizedThreshold}`,
			evidence: { estimatedCost: intake.estimatedCost, threshold: itemizedThreshold },
			suggestedAction: "Upload itemized estimate",
		});
	}

	// Check payer-specific required docs
	if (config?.requiredDocs) {
		const reqForEncounter = config.requiredDocs.find(
			(r) => r.encounterType === intake.encounterType,
		);
		if (reqForEncounter) {
			for (const docType of reqForEncounter.docTypes) {
				if (!attachmentTypes.has(docType)) {
					missing.push({
						type: "attachment",
						key: docType,
						reason: `Required by payer for ${intake.encounterType}`,
					});
				}
			}
		}
	}

	return { signals, missing };
}

/**
 * EL-5.1 Policy Effective Window
 */
function checkPolicyEffectiveWindow(intake: CaseIntake): Signal[] {
	const signals: Signal[] = [];

	if (intake.symptomStartDate && intake.policyStartDate) {
		const daysAfterPolicy = daysBetween(intake.symptomStartDate, intake.policyStartDate);

		if (daysAfterPolicy < 0) {
			signals.push({
				ruleId: "EL-5.1",
				severity: "Blocker",
				message: `Symptoms started ${Math.abs(daysAfterPolicy)} days BEFORE policy start date - potential pre-existing condition`,
				evidence: {
					symptomStartDate: intake.symptomStartDate,
					policyStartDate: intake.policyStartDate,
					daysBeforePolicy: Math.abs(daysAfterPolicy),
				},
				suggestedAction: "Consider self-pay or exception request",
			});
		}
	}

	// Elective planned date check
	if (intake.plannedDate && intake.policyStartDate) {
		const plannedDaysAfterPolicy = daysBetween(intake.plannedDate, intake.policyStartDate);
		if (plannedDaysAfterPolicy < 0) {
			signals.push({
				ruleId: "EL-5.1",
				severity: "Blocker",
				message: "Elective procedure planned before policy start date",
				evidence: {
					plannedDate: intake.plannedDate,
					policyStartDate: intake.policyStartDate,
				},
			});
		}
	}

	return signals;
}

/**
 * EL-5.2 Waiting Period Check
 */
function checkWaitingPeriod(
	intake: CaseIntake,
	clauses: PolicyClause[],
	config?: PayerConfig,
): Signal[] {
	const signals: Signal[] = [];

	// Find applicable waiting periods
	const waitingPeriodClauses = clauses.filter((c) => c.type === "waiting_period");

	// Default waiting period check (30 days for most conditions)
	const defaultWaitingDays = 30;
	const daysAfterPolicy = daysBetween(intake.symptomStartDate, intake.policyStartDate);

	// Check if any waiting period clause applies
	for (const clause of waitingPeriodClauses) {
		const waitingDays = clause.waitingPeriodDays || defaultWaitingDays;

		if (daysAfterPolicy < waitingDays) {
			signals.push({
				ruleId: "EL-5.2",
				severity: "Warning",
				message: `Waiting period not met. Required: ${waitingDays} days, Actual: ${daysAfterPolicy} days`,
				clauseId: clause.clauseId,
				clauseText: clause.text,
				evidence: {
					waitingPeriodDays: waitingDays,
					actualDays: daysAfterPolicy,
					pageRef: clause.pageRef,
				},
				suggestedAction: "Verify if waiting period exemption applies",
			});
		}
	}

	// Check config-based waiting periods
	if (config?.waitingPeriods) {
		for (const wp of config.waitingPeriods) {
			if (daysAfterPolicy < wp.days) {
				signals.push({
					ruleId: "EL-5.2",
					severity: "Warning",
					message: `Waiting period for ${wp.conditionTag}: ${wp.days} days required, ${daysAfterPolicy} days elapsed`,
					clauseId: wp.clauseId,
					evidence: { conditionTag: wp.conditionTag, required: wp.days, actual: daysAfterPolicy },
				});
			}
		}
	}

	return signals;
}

/**
 * EL-5.3 Pre-Existing Condition Check
 */
function checkPreExistingCondition(
	intake: CaseIntake,
	clauses: PolicyClause[],
	clinicalFindings?: ClinicalFindings,
): Signal[] {
	const signals: Signal[] = [];

	// Check for PEC indicators in clinical findings
	if (clinicalFindings?.pecIndicators && clinicalFindings.pecIndicators.length > 0) {
		signals.push({
			ruleId: "EL-5.3",
			severity: "Warning",
			message: `Pre-existing condition indicators found: ${clinicalFindings.pecIndicators.join(", ")}`,
			evidence: { pecIndicators: clinicalFindings.pecIndicators },
			suggestedAction: "Review medical history for PEC determination",
		});
	}

	// Check if symptoms started before policy
	const daysAfterPolicy = daysBetween(intake.symptomStartDate, intake.policyStartDate);
	if (daysAfterPolicy < 0) {
		// Find PEC definition clause
		const pecClause = clauses.find((c) => c.type === "pec_definition");
		signals.push({
			ruleId: "EL-5.3",
			severity: "Blocker",
			message: "High risk: Condition existed before policy inception",
			clauseId: pecClause?.clauseId,
			clauseText: pecClause?.text,
			evidence: {
				symptomStartDate: intake.symptomStartDate,
				policyStartDate: intake.policyStartDate,
				daysBeforePolicy: Math.abs(daysAfterPolicy),
			},
			suggestedAction: "Consider self-pay or exception request with medical justification",
		});
	}

	return signals;
}

/**
 * EL-5.6 Sublimits and Caps Check
 */
function checkSublimits(
	intake: CaseIntake,
	clauses: PolicyClause[],
	config?: PayerConfig,
): Signal[] {
	const signals: Signal[] = [];

	if (!intake.estimateBreakdown || !config?.sublimits) {
		return signals;
	}

	for (const item of intake.estimateBreakdown) {
		const sublimit = config.sublimits.find((s) => s.category === item.category);

		if (sublimit && item.amount > sublimit.amount) {
			const overage = item.amount - sublimit.amount;
			const sublimitClause = clauses.find(
				(c) => c.type === "sublimit" && c.sublimitCategory === item.category,
			);

			signals.push({
				ruleId: "EL-5.6",
				severity: "Warning",
				message: `${item.category} exceeds sublimit by ${sublimit.currency} ${overage.toLocaleString()}`,
				clauseId: sublimitClause?.clauseId || sublimit.clauseId,
				clauseText: sublimitClause?.text,
				evidence: {
					category: item.category,
					estimated: item.amount,
					sublimit: sublimit.amount,
					uncoveredAmount: overage,
					currency: sublimit.currency,
				},
				suggestedAction: "Inform patient of potential uncovered amount",
			});
		}
	}

	return signals;
}

/**
 * EL-5.7 Annual/Lifetime Maximum Check
 */
function checkMaximums(intake: CaseIntake, config?: PayerConfig): Signal[] {
	const signals: Signal[] = [];

	// Note: In a real system, we'd have coverage_used_ytd from the payer
	// For now, just flag if we're approaching limits

	if (config?.annualMax && intake.estimatedCost > config.annualMax * 0.8) {
		signals.push({
			ruleId: "EL-5.7",
			severity: "Info",
			message: `Estimated cost is ${Math.round((intake.estimatedCost / config.annualMax) * 100)}% of annual maximum`,
			evidence: {
				estimatedCost: intake.estimatedCost,
				annualMax: config.annualMax,
			},
			suggestedAction: "Verify remaining annual coverage with payer",
		});
	}

	return signals;
}

/**
 * EL-5.9 Panel/Network Rules
 */
function checkPanelStatus(intake: CaseIntake, config?: PayerConfig): Signal[] {
	const signals: Signal[] = [];

	if (config?.panelRequired && intake.panelStatus === "non_panel") {
		signals.push({
			ruleId: "EL-5.9",
			severity: "Warning",
			message: "Provider is non-panel but plan requires panel providers",
			evidence: { panelStatus: intake.panelStatus, panelRequired: true },
			suggestedAction: "Route to panel provider or seek exception",
		});
	}

	if (intake.panelStatus === "unknown") {
		signals.push({
			ruleId: "EL-5.9",
			severity: "Info",
			message: "Panel status unknown - verify with provider registry",
			evidence: { panelStatus: intake.panelStatus },
		});
	}

	return signals;
}

/**
 * EL-5.4/5.5 Exclusions Check
 */
function checkExclusions(
	intake: CaseIntake,
	clauses: PolicyClause[],
	config?: PayerConfig,
): Signal[] {
	const signals: Signal[] = [];

	// Check general exclusions
	const exclusionClauses = clauses.filter(
		(c) => c.type === "exclusion_general" || c.type === "exclusion_specific",
	);

	for (const clause of exclusionClauses) {
		// Simple tag matching - in production would use more sophisticated matching
		const diagnosisTags = intake.diagnosis.toLowerCase().split(/\s+/);

		for (const tag of clause.tags) {
			if (diagnosisTags.some((dt) => dt.includes(tag.toLowerCase()))) {
				signals.push({
					ruleId: clause.type === "exclusion_general" ? "EL-5.4" : "EL-5.5",
					severity: "Blocker",
					message: `Potential exclusion match: ${clause.text.substring(0, 100)}...`,
					clauseId: clause.clauseId,
					clauseText: clause.text,
					evidence: { matchedTag: tag, diagnosis: intake.diagnosis, pageRef: clause.pageRef },
					suggestedAction: "Review exclusion clause applicability",
				});
			}
		}
	}

	// Check config-based specific exclusions by ICD code
	if (config?.exclusionsSpecific && intake.diagnosisCode) {
		for (const excl of config.exclusionsSpecific) {
			if (excl.codeType === "icd10" && intake.diagnosisCode.startsWith(excl.code)) {
				signals.push({
					ruleId: "EL-5.5",
					severity: "Blocker",
					message: `Specific exclusion: ${excl.description}`,
					clauseId: excl.clauseId,
					evidence: { code: intake.diagnosisCode, exclusionCode: excl.code },
				});
			}
		}
	}

	return signals;
}

// ============== MAIN RULE ENGINE FUNCTION ==============

/**
 * Main rule engine evaluation function
 * Runs all deterministic rules and returns structured results
 */
export function evaluateRules(
	intake: CaseIntake,
	clauses: PolicyClause[] = [],
	config?: PayerConfig,
	clinicalFindings?: ClinicalFindings,
): RuleEngineResult {
	const allSignals: Signal[] = [];
	const allMissing: MissingItem[] = [];

	// I-4.* Intake Rules
	allSignals.push(...checkRequiredFields(intake));
	allSignals.push(...checkFieldValidations(intake));

	const attachmentResult = checkAttachmentRequirements(intake, config);
	allSignals.push(...attachmentResult.signals);
	allMissing.push(...attachmentResult.missing);

	// EL-5.* Eligibility Rules
	allSignals.push(...checkPolicyEffectiveWindow(intake));
	allSignals.push(...checkWaitingPeriod(intake, clauses, config));
	allSignals.push(...checkPreExistingCondition(intake, clauses, clinicalFindings));
	allSignals.push(...checkSublimits(intake, clauses, config));
	allSignals.push(...checkMaximums(intake, config));
	allSignals.push(...checkPanelStatus(intake, config));
	allSignals.push(...checkExclusions(intake, clauses, config));

	// RS-6.* Risk Scoring
	const { scoreBucket, approvalProbability } = calculateRiskScore(allSignals, allMissing);

	// Generate suggested actions
	const suggestedActions = generateSuggestedActions(allSignals, allMissing, scoreBucket);

	return {
		signals: allSignals,
		missingItems: allMissing,
		scoreBucket,
		approvalProbability,
		suggestedActions,
	};
}

/**
 * RS-6.1/6.2 Risk Scoring Calculation
 */
function calculateRiskScore(
	signals: Signal[],
	missingItems: MissingItem[],
): { scoreBucket: RiskBucket; approvalProbability: number } {
	// Start at 0.85 per RS-6.2
	let probability = 0.85;

	const blockers = signals.filter((s) => s.severity === "Blocker");
	const warnings = signals.filter((s) => s.severity === "Warning");

	// Subtract for blockers
	probability -= blockers.length * 0.5;

	// Subtract for specific warning types
	for (const signal of warnings) {
		if (signal.ruleId === "EL-5.3") {
			probability -= 0.2; // PEC Warning
		} else if (signal.ruleId === "EL-5.2") {
			probability -= 0.15; // Waiting period
		} else if (signal.ruleId.startsWith("EL-5.4") || signal.ruleId.startsWith("EL-5.5")) {
			probability -= 0.1; // Exclusion warnings
		} else {
			probability -= 0.05; // Other warnings
		}
	}

	// Subtract for missing items
	probability -= missingItems.length * 0.05;

	// Clip to [0.01, 0.98]
	probability = Math.max(0.01, Math.min(0.98, probability));

	// Determine risk bucket per RS-6.1
	let scoreBucket: RiskBucket;
	if (blockers.length > 0) {
		scoreBucket = "High";
	} else if (warnings.length >= 2 || signals.some((s) => s.ruleId === "EL-5.6")) {
		scoreBucket = "Medium";
	} else {
		scoreBucket = "Low";
	}

	return { scoreBucket, approvalProbability: Math.round(probability * 100) / 100 };
}

/**
 * Generate suggested actions based on signals and missing items
 */
function generateSuggestedActions(
	signals: Signal[],
	missingItems: MissingItem[],
	scoreBucket: RiskBucket,
): string[] {
	const actions: string[] = [];

	// Add actions from signals
	for (const signal of signals) {
		if (signal.suggestedAction && !actions.includes(signal.suggestedAction)) {
			actions.push(signal.suggestedAction);
		}
	}

	// Add actions for missing items
	for (const item of missingItems) {
		const action = `Upload ${item.key.replace(/_/g, " ")}`;
		if (!actions.includes(action)) {
			actions.push(action);
		}
	}

	// Add general action based on risk
	if (scoreBucket === "High") {
		actions.push("Consider escalation to supervisor before submission");
	} else if (scoreBucket === "Low") {
		actions.push("Proceed with submission");
	}

	return actions;
}

// ============== CONVEX QUERIES AND MUTATIONS ==============

/**
 * Internal query to get policy clauses for a policy
 */
export const getPolicyClausesInternal = internalQuery({
	args: { policyId: v.id("policyDocuments") },
	handler: async (ctx, args): Promise<PolicyClause[]> => {
		const clauses = await ctx.db
			.query("policyClauses")
			.withIndex("by_policy", (q) => q.eq("policyId", args.policyId))
			.collect();

		return clauses.map((c) => ({
			clauseId: c.clauseId,
			type: c.type,
			tags: c.tags,
			text: c.text,
			pageRef: c.pageRef,
			waitingPeriodDays: c.waitingPeriodDays,
			sublimitAmount: c.sublimitAmount,
			sublimitCategory: c.sublimitCategory,
		}));
	},
});

/**
 * Internal query to get payer config for a policy
 */
export const getPayerConfigInternal = internalQuery({
	args: { policyId: v.id("policyDocuments") },
	handler: async (ctx, args): Promise<PayerConfig | null> => {
		const config = await ctx.db
			.query("payerPlanConfig")
			.withIndex("by_policy", (q) => q.eq("policyId", args.policyId))
			.first();

		if (!config) return null;

		return {
			waitingPeriods: config.waitingPeriods as PayerConfig["waitingPeriods"],
			exclusionsGeneral: config.exclusionsGeneral as PayerConfig["exclusionsGeneral"],
			exclusionsSpecific: config.exclusionsSpecific as PayerConfig["exclusionsSpecific"],
			sublimits: config.sublimits as PayerConfig["sublimits"],
			annualMax: config.annualMax,
			lifetimeMax: config.lifetimeMax,
			currency: config.currency,
			requiredDocs: config.requiredDocs as PayerConfig["requiredDocs"],
			electiveLeadTimeDays: config.electiveLeadTimeDays,
			edNotificationHours: config.edNotificationHours,
			panelRequired: config.panelRequired,
		};
	},
});

/**
 * Internal query to get clinical findings for a GL request
 */
export const getClinicalFindingsInternal = internalQuery({
	args: { glRequestId: v.id("glRequests") },
	handler: async (ctx, args): Promise<ClinicalFindings | null> => {
		const docs = await ctx.db
			.query("clinicalDocuments")
			.withIndex("by_gl_request", (q) => q.eq("glRequestId", args.glRequestId))
			.collect();

		if (docs.length === 0) return null;

		// Merge findings from all clinical documents
		const merged: ClinicalFindings = {
			diagnoses: [],
			procedures: [],
			symptomDates: [],
			medicalHistory: [],
			pecIndicators: [],
			relevantTags: [],
		};

		for (const doc of docs) {
			if (doc.parsedFindings) {
				const f = doc.parsedFindings;
				if (f.diagnoses) merged.diagnoses!.push(...f.diagnoses);
				if (f.procedures) merged.procedures!.push(...f.procedures);
				if (f.symptomDates) merged.symptomDates!.push(...f.symptomDates);
				if (f.medicalHistory) merged.medicalHistory!.push(...f.medicalHistory);
				if (f.pecIndicators) merged.pecIndicators!.push(...f.pecIndicators);
				if (f.relevantTags) merged.relevantTags!.push(...f.relevantTags);
			}
		}

		return merged;
	},
});

/**
 * Internal mutation to update GL request with rule results
 */
export const updateGlWithRuleResults = internalMutation({
	args: {
		glId: v.id("glRequests"),
		signals: v.array(v.any()),
		missingItems: v.array(v.any()),
		scoreBucket: v.union(v.literal("Low"), v.literal("Medium"), v.literal("High")),
		approvalProbability: v.number(),
		suggestedActions: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.glId, {
			signals: args.signals,
			missingItems: args.missingItems,
			scoreBucket: args.scoreBucket,
			approvalProbability: args.approvalProbability,
			suggestedActions: args.suggestedActions,
			riskScore: Math.round((1 - args.approvalProbability) * 100),
			rulesEvaluatedAt: Date.now(),
		});
	},
});

/**
 * Create audit log entry
 */
export const createAuditLog = internalMutation({
	args: {
		glRequestId: v.optional(v.id("glRequests")),
		policyId: v.optional(v.id("policyDocuments")),
		actor: v.string(),
		action: v.union(
			v.literal("case_created"),
			v.literal("doc_ingested"),
			v.literal("doc_parsed"),
			v.literal("rules_evaluated"),
			v.literal("final_report_generated"),
			v.literal("status_changed"),
			v.literal("snapshot_created"),
		),
		details: v.optional(v.any()),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("auditLogs", {
			...args,
			timestamp: Date.now(),
		});
	},
});

// ============== CONVEX ACTION ==============

/**
 * Evaluate rules for a GL request (main action)
 */
export const evaluateRulesForGlRequest = action({
	args: {
		glId: v.id("glRequests"),
	},
	handler: async (ctx, args): Promise<RuleEngineResult> => {
		// Get the GL request
		const gl = await ctx.runQuery(internal.glRequests.getInternal, { glId: args.glId });
		if (!gl) {
			throw new Error(`GL request not found: ${args.glId}`);
		}

		// Build case intake from GL request
		const intake: CaseIntake = {
			caseId: gl.caseId,
			diagnosis: gl.diagnosis,
			diagnosisCode: gl.diagnosisCode,
			symptomStartDate: gl.symptomStartDate,
			policyStartDate: gl.policyStartDate,
			estimatedCost: gl.estimatedCost,
			patientName: gl.patientName,
			encounterType: gl.encounterType,
			plannedDate: gl.plannedDate,
			emergencyFlag: gl.emergencyFlag,
			accidentFlag: gl.accidentFlag,
			panelStatus: gl.panelStatus,
			estimateBreakdown: gl.estimateBreakdown,
			attachments: gl.attachments,
		};

		// Get policy clauses
		const clauses = await ctx.runQuery(internal.rulesEngine.getPolicyClausesInternal, {
			policyId: gl.policyId,
		});

		// Get payer config
		const config = await ctx.runQuery(internal.rulesEngine.getPayerConfigInternal, {
			policyId: gl.policyId,
		});

		// Get clinical findings
		const clinicalFindings = await ctx.runQuery(
			internal.rulesEngine.getClinicalFindingsInternal,
			{ glRequestId: args.glId },
		);

		// Run rule evaluation
		const result = evaluateRules(
			intake,
			clauses,
			config || undefined,
			clinicalFindings || undefined,
		);

		// Update GL request with results
		await ctx.runMutation(internal.rulesEngine.updateGlWithRuleResults, {
			glId: args.glId,
			signals: result.signals,
			missingItems: result.missingItems,
			scoreBucket: result.scoreBucket,
			approvalProbability: result.approvalProbability,
			suggestedActions: result.suggestedActions,
		});

		// Create audit log
		await ctx.runMutation(internal.rulesEngine.createAuditLog, {
			glRequestId: args.glId,
			actor: "system",
			action: "rules_evaluated",
			details: {
				scoreBucket: result.scoreBucket,
				approvalProbability: result.approvalProbability,
				signalCount: result.signals.length,
				blockerCount: result.signals.filter((s) => s.severity === "Blocker").length,
			},
		});

		return result;
	},
});

