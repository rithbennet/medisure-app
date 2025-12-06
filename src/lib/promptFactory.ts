/**
 * Prompt Factory for AI Brain
 * Builds structured prompts for risk analysis and Q&A interactions
 * Extended for Phase 3: Rule-adherent risk engine with Gemini + Claude
 */

export interface GlRequestData {
	diagnosis: string;
	diagnosisCode?: string;
	symptomStartDate: string;
	policyStartDate: string;
	estimatedCost: number;
	patientName?: string;
}

export interface RiskAnalysisResult {
	risk: "low" | "medium" | "high";
	score: number;
	explanation: string;
	factors: string[];
	recommendation: string;
}

// ============== PHASE 3 TYPES ==============

export interface ParsedClause {
	clause_id: string;
	type:
		| "waiting_period"
		| "exclusion_general"
		| "exclusion_specific"
		| "sublimit"
		| "coverage"
		| "doc_requirement"
		| "pec_definition";
	tags: string[];
	text: string;
	page_ref?: string;
	waiting_period_days?: number;
	sublimit_amount?: number;
	sublimit_category?: string;
}

export interface ExtractedPolicyConfig {
	waiting_periods?: Array<{ condition_tag: string; days: number }>;
	exclusions_general?: Array<{ tag: string; description: string }>;
	sublimits?: Array<{ category: string; amount: number; currency: string }>;
	annual_max?: number;
	lifetime_max?: number;
}

export interface ClinicalFindings {
	diagnoses?: string[];
	procedures?: string[];
	symptom_dates?: string[];
	medical_history?: string[];
	pec_indicators?: string[];
	relevant_tags?: string[];
}

export interface RuleSignal {
	rule_id: string;
	severity: "Blocker" | "Warning" | "Info";
	message: string;
	clause_id?: string;
	clause_text?: string;
	evidence?: Record<string, unknown>;
}

export interface FinalRiskReport {
	case_id: string;
	score_bucket: "Low" | "Medium" | "High";
	approval_probability: number;
	narrative_summary: string;
	rule_explanations: Array<{
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

/**
 * Build a risk analysis prompt for GL request evaluation
 * @param gl - The guarantee letter request data
 * @param policyText - Concatenated relevant policy text chunks
 * @returns Formatted prompt string for AI analysis
 */
export function buildRiskPrompt(gl: GlRequestData, policyText: string): string {
	const preExistingDays = calculateDaysBetween(
		gl.symptomStartDate,
		gl.policyStartDate,
	);
	const isPreExisting = preExistingDays < 0;

	return `You are an expert insurance claims analyst. Analyze this Guarantee Letter (GL) request against the insurance policy and provide a risk assessment.

## GL Request Details
- **Diagnosis**: ${gl.diagnosis}${gl.diagnosisCode ? ` (Code: ${gl.diagnosisCode})` : ""}
- **Symptom Start Date**: ${gl.symptomStartDate}
- **Policy Start Date**: ${gl.policyStartDate}
- **Days Between Policy Start and Symptoms**: ${Math.abs(preExistingDays)} days ${isPreExisting ? "(BEFORE policy - potential pre-existing condition)" : "(AFTER policy start)"}
- **Estimated Cost**: $${gl.estimatedCost.toLocaleString()}
${gl.patientName ? `- **Patient**: ${gl.patientName}` : ""}

## Insurance Policy Context
${policyText || "No specific policy text available. Use general insurance principles."}

## Analysis Instructions
Evaluate this GL request considering:
1. Pre-existing condition rules (typically conditions existing before policy start are excluded)
2. Waiting periods for specific conditions
3. Coverage limits and exclusions
4. Medical necessity and appropriateness of treatment
5. Cost reasonableness

Respond with a JSON object containing:
- **risk**: "low", "medium", or "high" - the risk level for approving this claim
- **score**: A number from 0-100 where 0 is lowest risk and 100 is highest risk
- **explanation**: A clear explanation of your assessment (2-3 sentences)
- **factors**: An array of key factors influencing your decision
- **recommendation**: A brief recommended action ("approve", "review", or "deny" with reason)

Respond ONLY with the JSON object, no additional text.`;
}

/**
 * Build a Q&A prompt for policy questions
 * @param question - The user's question about the policy
 * @param context - Relevant policy text chunks from vector search
 * @returns Formatted prompt string for AI response
 */
export function buildQnAPrompt(question: string, context: string): string {
	return `You are a helpful insurance policy assistant. Answer the user's question based on the provided policy context.

## Policy Context
${context || "No specific policy context available. Provide a general answer and note that you're speaking generally about insurance policies."}

## User Question
${question}

## Instructions
- Answer the question directly and concisely
- Quote specific policy terms when relevant
- If the policy context doesn't contain enough information, say so clearly
- Use plain language that a policyholder would understand
- If the question asks about coverage, be specific about what is and isn't covered
- Never make up policy details that aren't in the provided context

Provide a helpful, accurate response:`;
}

/**
 * Build a prompt for generating embeddings-optimized text
 * Used when preparing policy text for chunking
 */
export function buildChunkOptimizationPrompt(rawText: string): string {
	return `Extract and clean the following insurance policy text for semantic search indexing. 
Remove headers, footers, page numbers, and formatting artifacts. 
Keep all substantive policy content about coverage, exclusions, limits, and conditions.
Output clean, searchable text:

${rawText}`;
}

/**
 * Calculate days between two dates
 * @param date1 - First date string (YYYY-MM-DD format)
 * @param date2 - Second date string (YYYY-MM-DD format)
 * @returns Number of days (positive if date1 is after date2, negative if before)
 */
function calculateDaysBetween(date1: string, date2: string): number {
	const d1 = new Date(date1);
	const d2 = new Date(date2);
	const diffTime = d1.getTime() - d2.getTime();
	return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Combine multiple policy chunks into a single context string
 * @param chunks - Array of policy chunk texts
 * @param maxLength - Maximum total length (default 4000 chars)
 * @returns Combined context string
 */
export function combineChunksToContext(
	chunks: string[],
	maxLength = 4000,
): string {
	let combined = "";
	for (const chunk of chunks) {
		if (combined.length + chunk.length + 4 > maxLength) {
			break;
		}
		combined += (combined ? "\n\n" : "") + chunk;
	}
	return combined;
}

// ============== PHASE 3: GEMINI DOCUMENT PARSING PROMPTS ==============

/**
 * Build a prompt for Gemini to parse policy document into clauses
 * @param rawText - Raw policy document text
 * @param insurerName - Name of the insurer for context
 * @returns Formatted prompt string
 */
export function buildPolicyParsingPrompt(
	rawText: string,
	insurerName: string,
): string {
	return `You are an expert insurance policy analyst. Parse the following insurance policy document and extract structured clause information.

## Policy Document
Insurer: ${insurerName}

${rawText}

## Extraction Instructions
Extract all relevant clauses into a structured JSON format. For each clause, identify:

1. **clause_id**: Generate a unique ID like "WP-001" (waiting period), "EX-GEN-001" (general exclusion), "EX-SPEC-001" (specific exclusion), "SUB-001" (sublimit), "COV-001" (coverage), "DOC-001" (doc requirement), "PEC-001" (PEC definition)

2. **type**: One of:
   - "waiting_period" - clauses about waiting periods before coverage
   - "exclusion_general" - general exclusions (cosmetic, experimental, etc.)
   - "exclusion_specific" - specific condition/procedure exclusions
   - "sublimit" - coverage limits by category
   - "coverage" - what is covered
   - "doc_requirement" - documentation requirements
   - "pec_definition" - pre-existing condition definitions

3. **tags**: Relevant tags like ["cardiac", "surgery", "maternity", "mental_health", etc.]

4. **text**: The exact clause text (keep it concise but complete)

5. **page_ref**: Page reference if identifiable (e.g., "p.14")

6. For waiting_period type, include **waiting_period_days** (integer)
7. For sublimit type, include **sublimit_amount** (number) and **sublimit_category** (string like "surgical_fee", "room_board", "icu", "drugs")

Also extract a **config** object with:
- waiting_periods: array of {condition_tag, days}
- exclusions_general: array of {tag, description}
- sublimits: array of {category, amount, currency}
- annual_max: number (if found)
- lifetime_max: number (if found)

## Response Format
Respond with a JSON object:
{
  "clauses": [...],
  "config": {...},
  "metadata": {
    "total_clauses": number,
    "document_type": string,
    "version": string (if found)
  }
}

Respond ONLY with the JSON object, no additional text.`;
}

/**
 * Build a prompt for Gemini to parse clinical documents
 * @param rawText - Raw clinical document text
 * @param docType - Type of clinical document
 * @returns Formatted prompt string
 */
export function buildClinicalParsingPrompt(
	rawText: string,
	docType: string,
): string {
	return `You are a medical document analyst. Extract key clinical information from the following ${docType}.

## Document Content
${rawText}

## Extraction Instructions
Extract and structure the following information:

1. **diagnoses**: List of diagnoses mentioned (include ICD-10 codes if present)
2. **procedures**: List of procedures mentioned or recommended
3. **symptom_dates**: Any dates when symptoms first appeared (ISO format YYYY-MM-DD)
4. **medical_history**: Relevant prior conditions, treatments, or hospitalizations
5. **pec_indicators**: Any indicators of pre-existing conditions, such as:
   - Mentions of "previously diagnosed"
   - "History of"
   - "Long-standing"
   - "Chronic"
   - Prior treatments for similar conditions
6. **relevant_tags**: Medical tags like ["cardiac", "orthopedic", "surgical", "chronic", etc.]

## Response Format
Respond with a JSON object:
{
  "diagnoses": [...],
  "procedures": [...],
  "symptom_dates": [...],
  "medical_history": [...],
  "pec_indicators": [...],
  "relevant_tags": [...]
}

Be thorough but only include information explicitly stated or clearly implied in the document.
Respond ONLY with the JSON object, no additional text.`;
}

// ============== PHASE 3: CLAUDE FINAL RISK REPORT PROMPT ==============

export interface CaseIntakeForReport {
	case_id?: string;
	diagnosis: string;
	diagnosis_code?: string;
	symptom_start_date: string;
	policy_start_date: string;
	estimated_cost: number;
	patient_name?: string;
	encounter_type?: string;
	panel_status?: string;
	estimate_breakdown?: Array<{ category: string; amount: number }>;
}

export interface RuleEngineOutput {
	signals: RuleSignal[];
	missing_items: Array<{ type: string; key: string; reason: string }>;
	score_bucket: "Low" | "Medium" | "High";
	approval_probability: number;
	suggested_actions: string[];
}

/**
 * Build the final risk report prompt for Claude
 * @param intake - Case intake data
 * @param ruleOutput - Deterministic rule engine output
 * @param clauses - Relevant policy clauses
 * @returns Formatted prompt string
 */
export function buildFinalRiskReportPrompt(
	intake: CaseIntakeForReport,
	ruleOutput: RuleEngineOutput,
	clauses: ParsedClause[],
): string {
	const blockers = ruleOutput.signals.filter((s) => s.severity === "Blocker");
	const warnings = ruleOutput.signals.filter((s) => s.severity === "Warning");

	return `You are an expert insurance claims analyst providing decision support for GL (Guarantee Letter) pre-approval.

## IMPORTANT CONSTRAINTS
- You are providing decision support only, NOT making final coverage decisions
- Policy interpretation belongs to the payer; you explain and highlight concerns
- DO NOT override or contradict the deterministic rule engine outputs
- Reference specific rule IDs and clause IDs when explaining concerns
- Never guarantee coverage or approval

## Case Intake
${JSON.stringify(intake, null, 2)}

## Deterministic Rule Engine Results
**Risk Bucket**: ${ruleOutput.score_bucket}
**Approval Probability**: ${(ruleOutput.approval_probability * 100).toFixed(0)}%

**Blockers (${blockers.length})**:
${blockers.map((b) => `- [${b.rule_id}] ${b.message}${b.clause_id ? ` (Clause: ${b.clause_id})` : ""}`).join("\n") || "None"}

**Warnings (${warnings.length})**:
${warnings.map((w) => `- [${w.rule_id}] ${w.message}${w.clause_id ? ` (Clause: ${w.clause_id})` : ""}`).join("\n") || "None"}

**Missing Items**:
${ruleOutput.missing_items.map((m) => `- ${m.key}: ${m.reason}`).join("\n") || "None"}

## Relevant Policy Clauses
${clauses.map((c) => `[${c.clause_id}] (${c.type}): ${c.text.substring(0, 200)}${c.text.length > 200 ? "..." : ""}`).join("\n\n")}

## Your Task
Generate a comprehensive risk report that:

1. **Explains** each rule engine finding in plain language a coordinator can understand
2. **Highlights** any pre-existing condition concerns with specific evidence
3. **Calculates** financial exposure (uncovered amounts due to sublimits)
4. **Summarizes** missing documentation and why it matters
5. **Provides** clear, actionable coordinator guidance

## Response Format
Respond with a JSON object matching this structure:
{
  "case_id": "${intake.case_id || "UNKNOWN"}",
  "score_bucket": "${ruleOutput.score_bucket}",
  "approval_probability": ${ruleOutput.approval_probability},
  "narrative_summary": "A 2-3 paragraph summary explaining the risk assessment in plain language...",
  "rule_explanations": [
    {
      "rule_id": "EL-5.1",
      "explanation": "Plain language explanation of this rule's finding...",
      "clause_reference": "WP-001 p.14" // if applicable
    }
  ],
  "financial_exposure": {
    "uncovered_amounts": [{"category": "surgical_fee", "amount": 1000}],
    "total_uncovered": 1000
  },
  "pec_concerns": ["List any pre-existing condition concerns here"],
  "missing_items_summary": "Summary of what documents are missing and why they're needed",
  "coordinator_actions": [
    "Action 1: ...",
    "Action 2: ..."
  ]
}

Respond ONLY with the JSON object, no additional text.`;
}

/**
 * Build a simpler narrative prompt for cases with Low risk
 */
export function buildSimpleNarrativePrompt(
	intake: CaseIntakeForReport,
	ruleOutput: RuleEngineOutput,
): string {
	return `Generate a brief, positive risk summary for this GL pre-approval case.

## Case
- Diagnosis: ${intake.diagnosis}
- Estimated Cost: $${intake.estimated_cost.toLocaleString()}
- Risk: ${ruleOutput.score_bucket}
- Approval Probability: ${(ruleOutput.approval_probability * 100).toFixed(0)}%

## Findings
${ruleOutput.signals.length === 0 ? "No significant concerns identified." : ruleOutput.signals.map((s) => `- ${s.message}`).join("\n")}

Write a 2-3 sentence summary suitable for a coordinator review. Be concise and professional.
This is decision support only - do not guarantee approval.`;
}
