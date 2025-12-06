import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ============== SHARED VALUE TYPES ==============

// Clause types per CL-16.1
const clauseType = v.union(
	v.literal("waiting_period"),
	v.literal("exclusion_general"),
	v.literal("exclusion_specific"),
	v.literal("sublimit"),
	v.literal("coverage"),
	v.literal("doc_requirement"),
	v.literal("pec_definition"),
);

// Severity levels per E-3.1
const severityLevel = v.union(
	v.literal("Blocker"),
	v.literal("Warning"),
	v.literal("Info"),
);

// Risk bucket per RS-6.1
const riskBucket = v.union(
	v.literal("Low"),
	v.literal("Medium"),
	v.literal("High"),
);

// GL status
const glStatus = v.union(
	v.literal("pending"),
	v.literal("approved"),
	v.literal("denied"),
	v.literal("review"),
);

// Doctor status for GL workflow
const doctorStatus = v.union(
	v.literal("PENDING"),
	v.literal("DIAGNOSING"),
	v.literal("REPORT_DRAFT"),
	v.literal("SUBMITTED"),
);

// Medical report status
const reportStatus = v.union(v.literal("DRAFT"), v.literal("SUBMITTED"));

// Ingestion status
const ingestionStatus = v.union(
	v.literal("pending"),
	v.literal("processing"),
	v.literal("completed"),
	v.literal("failed"),
);

export default defineSchema({
	// ============== USER MANAGEMENT (from HEAD) ==============

	// Users table - stores registered user data
	users: defineTable({
		email: v.string(), // Email address
		password: v.optional(v.string()), // Hashed password (optional for WorkOS users)
		fullName: v.string(), // User's full name
		icNumber: v.optional(v.string()), // Identification card number (optional until profile complete)
		role: v.union(
			v.literal("coordinator"), // Admin role
			v.literal("patient"),
			v.literal("doctor"),
			v.literal("insurance_agent"),
		),
		workosId: v.optional(v.string()), // WorkOS user ID for OAuth users
		profileComplete: v.optional(v.boolean()), // Whether the user has completed their profile (added IC) - defaults to true for existing users
		createdAt: v.number(), // Timestamp
		updatedAt: v.number(), // Timestamp
	})
		.index("by_email", ["email"])
		.index("by_icNumber", ["icNumber"])
		.index("by_workosId", ["workosId"]),

	// Session tokens table - stores active sessions
	sessionTokens: defineTable({
		userId: v.id("users"), // Reference to user
		token: v.string(), // Session token
		expiresAt: v.number(), // Expiration timestamp
		createdAt: v.number(), // Timestamp
	})
		.index("by_token", ["token"])
		.index("by_userId", ["userId"]),

	// ============== PATIENTS (from HEAD) ==============

	// Patients table
	patients: defineTable({
		name: v.string(),
		insurer: v.string(),
		policyId: v.optional(v.id("policies")),
		createdAt: v.number(),
	}),

	// ============== POLICIES (from HEAD) ==============

	// Policies table
	policies: defineTable({
		// New schema fields
		insurerName: v.optional(v.string()),
		productName: v.optional(v.string()),
		planType: v.optional(v.string()),
		ragIndexId: v.optional(v.string()),
		isDemo: v.optional(v.boolean()),
		createdAt: v.optional(v.number()),
		// Legacy fields (from previous data)
		name: v.optional(v.string()),
		insurer: v.optional(v.string()),
		extractedText: v.optional(v.string()),
	}),

	// ============== POLICY DOCUMENTS (from feature branch) ==============

	// Policy documents - insurance policy files
	policyDocuments: defineTable({
		insurerName: v.string(),
		productName: v.string(),
		planType: v.optional(v.string()),
		fileUrl: v.optional(v.string()),
		// Extended fields for document ingestion
		rawText: v.optional(v.string()),
		parsedMetadata: v.optional(
			v.object({
				totalPages: v.optional(v.number()),
				extractedDate: v.optional(v.string()),
				documentType: v.optional(v.string()),
				version: v.optional(v.string()),
			}),
		),
		ingestionStatus: v.optional(ingestionStatus),
		indexed: v.boolean(),
		createdAt: v.number(),
	}).index("by_insurer", ["insurerName"]),

	// Policy chunks with embeddings for vector search
	policyChunks: defineTable({
		policyId: v.id("policyDocuments"),
		text: v.string(),
		embedding: v.array(v.float64()),
		chunkIndex: v.number(),
	})
		.index("by_policy", ["policyId"])
		.vectorIndex("by_embedding", {
			vectorField: "embedding",
			dimensions: 768, // Google's text-embedding-004 uses 768 dimensions
			filterFields: ["policyId"],
		}),

	// ============== POLICY CLAUSES (CL-16.1) ==============

	// Normalized policy clauses extracted by Gemini
	policyClauses: defineTable({
		policyId: v.id("policyDocuments"),
		clauseId: v.string(), // unique within payer/plan e.g., "WP-001", "EX-GEN-003"
		type: clauseType,
		tags: v.array(v.string()), // e.g., ["cardiac", "surgery", "waiting"]
		text: v.string(), // clause text
		pageRef: v.optional(v.string()), // e.g., "p.14"
		effectiveDate: v.optional(v.string()), // ISO-8601
		sourceFile: v.optional(v.string()),
		// Extracted rule parameters
		waitingPeriodDays: v.optional(v.number()),
		sublimitAmount: v.optional(v.number()),
		sublimitCategory: v.optional(v.string()),
		createdAt: v.number(),
	})
		.index("by_policy", ["policyId"])
		.index("by_type", ["type"])
		.index("by_clause_id", ["clauseId"]),

	// ============== PAYER/PLAN CONFIG (CFG-14.1/14.2) ==============

	// Payer plan configuration - editable by Admin
	payerPlanConfig: defineTable({
		policyId: v.id("policyDocuments"),
		payerName: v.string(),
		planCode: v.string(),
		// Waiting periods by condition/procedure tags
		waitingPeriods: v.optional(
			v.array(
				v.object({
					conditionTag: v.string(),
					days: v.number(),
					clauseId: v.optional(v.string()),
				}),
			),
		),
		// General exclusions with tags
		exclusionsGeneral: v.optional(
			v.array(
				v.object({
					tag: v.string(),
					description: v.string(),
					clauseId: v.optional(v.string()),
				}),
			),
		),
		// Specific exclusions (ICD-10 or procedure codes)
		exclusionsSpecific: v.optional(
			v.array(
				v.object({
					code: v.string(),
					codeType: v.union(v.literal("icd10"), v.literal("procedure")),
					description: v.string(),
					clauseId: v.optional(v.string()),
				}),
			),
		),
		// Sublimits per category
		sublimits: v.optional(
			v.array(
				v.object({
					category: v.string(), // e.g., "room_board", "surgical_fee", "icu"
					amount: v.number(),
					currency: v.string(),
					period: v.optional(v.string()), // "per_admission", "per_day", "annual"
					clauseId: v.optional(v.string()),
				}),
			),
		),
		// Annual/lifetime maximums
		annualMax: v.optional(v.number()),
		lifetimeMax: v.optional(v.number()),
		currency: v.optional(v.string()),
		// Required fields/docs matrix (by encounter type)
		requiredDocs: v.optional(
			v.array(
				v.object({
					encounterType: v.string(),
					docTypes: v.array(v.string()),
					conditionTags: v.optional(v.array(v.string())),
				}),
			),
		),
		// Notification windows
		electiveLeadTimeDays: v.optional(v.number()),
		edNotificationHours: v.optional(v.number()),
		// Panel policy
		panelRequired: v.optional(v.boolean()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_policy", ["policyId"])
		.index("by_payer_plan", ["payerName", "planCode"]),

	// ============== CLINICAL DOCUMENTS ==============

	// Clinical documents (doctor reports, estimates) linked to GL requests
	clinicalDocuments: defineTable({
		glRequestId: v.optional(v.id("glRequests")),
		policyId: v.optional(v.id("policyDocuments")),
		docType: v.union(
			v.literal("doctor_report"),
			v.literal("clinical_note"),
			v.literal("itemized_estimate"),
			v.literal("imaging"),
			v.literal("lab_result"),
			v.literal("referral_letter"),
			v.literal("other"),
		),
		fileName: v.optional(v.string()),
		rawText: v.string(),
		// Parsed findings from Gemini
		parsedFindings: v.optional(
			v.object({
				diagnoses: v.optional(v.array(v.string())),
				procedures: v.optional(v.array(v.string())),
				symptomDates: v.optional(v.array(v.string())),
				medicalHistory: v.optional(v.array(v.string())),
				pecIndicators: v.optional(v.array(v.string())), // Pre-existing condition hints
				relevantTags: v.optional(v.array(v.string())),
			}),
		),
		ingestionStatus: ingestionStatus,
		createdAt: v.number(),
	})
		.index("by_gl_request", ["glRequestId"])
		.index("by_policy", ["policyId"]),

	// ============== GL REQUESTS (from HEAD - gl_requests table) ==============

	// GL (Guarantee Letter) requests table
	gl_requests: defineTable({
		patientId: v.optional(v.id("patients")),
		patientName: v.string(),
		insurerName: v.string(),
		// String to accommodate mock policy IDs (e.g. "demo_policy_aia_2025")
		policyId: v.optional(v.string()),
		status: v.string(),
		diagnosis: v.string(),
		estimatedCost: v.optional(v.number()),
		riskBand: v.optional(v.string()),
		riskExplanation: v.optional(v.string()),
		// Doctor assignment and workflow fields
		assignedDoctorId: v.optional(v.string()),
		doctorStatus: v.optional(doctorStatus),
		// Diagnosis fields (filled by doctor)
		primaryDiagnosis: v.optional(v.string()),
		secondaryDiagnoses: v.optional(v.string()),
		clinicalNotes: v.optional(v.string()),
		hasDoctorReport: v.optional(v.boolean()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_assignedDoctor", ["assignedDoctorId"])
		.index("by_doctorStatus", ["doctorStatus"]),

	// ============== GL REQUESTS (Extended - from feature branch) ==============

	// GL (Guarantee Letter) requests for insurance analysis
	glRequests: defineTable({
		// Basic case info
		caseId: v.optional(v.string()), // e.g., "MS-2025-000123"
		diagnosis: v.optional(v.string()),
		diagnosisCode: v.optional(v.string()),
		diagnosisDescription: v.optional(v.string()), // Legacy field
		symptomStartDate: v.optional(v.string()),
		policyStartDate: v.optional(v.string()),
		estimatedCost: v.optional(v.number()),
		policyId: v.optional(v.id("policyDocuments")),
		policyNumber: v.optional(v.string()), // Legacy field
		patientName: v.optional(v.string()),
		patientId: v.optional(v.string()), // Legacy field
		providerId: v.optional(v.string()),
		insurer: v.optional(v.string()), // Legacy field - use policyId instead
		procedureCode: v.optional(v.string()), // Legacy field
		notes: v.optional(v.string()), // Legacy field
		// Extended case intake fields (15.1 schema partial)
		encounterType: v.optional(
			v.union(
				v.literal("inpatient"),
				v.literal("outpatient"),
				v.literal("ed"),
				v.literal("day_surgery"),
			),
		),
		admissionType: v.optional(v.string()), // Legacy field - use encounterType instead
		plannedDate: v.optional(v.string()),
		emergencyFlag: v.optional(v.boolean()),
		accidentFlag: v.optional(v.boolean()),
		panelStatus: v.optional(
			v.union(v.literal("panel"), v.literal("non_panel"), v.literal("unknown")),
		),
		estimateBreakdown: v.optional(
			v.array(
				v.object({
					category: v.string(),
					amount: v.number(),
				}),
			),
		),
		attachments: v.optional(
			v.array(
				v.object({
					type: v.string(),
					fileName: v.string(),
					docId: v.optional(v.id("clinicalDocuments")),
				}),
			),
		),
		// Status and risk
		status: v.optional(glStatus),
		riskScore: v.optional(v.number()),
		scoreBucket: v.optional(riskBucket),
		riskBand: v.optional(v.string()), // Legacy field - use scoreBucket instead
		riskExplanation: v.optional(v.string()), // Legacy field - use aiExplanation instead
		approvalProbability: v.optional(v.number()),
		simulatedOutcome: v.optional(v.string()), // Legacy field
		// Rule evaluation results
		signals: v.optional(
			v.array(
				v.object({
					ruleId: v.string(),
					severity: severityLevel,
					message: v.string(),
					clauseId: v.optional(v.string()),
					clauseText: v.optional(v.string()),
					evidence: v.optional(v.any()),
				}),
			),
		),
		missingItems: v.optional(
			v.array(
				v.object({
					type: v.string(),
					key: v.string(),
					reason: v.string(),
				}),
			),
		),
		suggestedActions: v.optional(v.array(v.string())),
		// AI outputs
		aiExplanation: v.optional(v.string()),
		finalReportNarrative: v.optional(v.string()),
		// Timestamps
		createdAt: v.optional(v.number()),
		rulesEvaluatedAt: v.optional(v.number()),
		finalReportGeneratedAt: v.optional(v.number()),
	})
		.index("by_policy", ["policyId"])
		.index("by_status", ["status"])
		.index("by_case_id", ["caseId"]),

	// ============== POLICY CHUNKS (from HEAD) ==============

	// Policy chunks table for RAG/embeddings
	policy_chunks: defineTable({
		policyId: v.id("policies"),
		embedding: v.array(v.number()),
		text: v.string(),
	}).index("by_policy", ["policyId"]),

	// ============== MEDICAL REPORTS (Doctor Portal) ==============

	// Medical reports created by doctors for GL requests
	medical_reports: defineTable({
		glRequestId: v.id("gl_requests"),
		doctorId: v.string(),
		status: reportStatus,
		// Report body content (structured JSON)
		bodyJson: v.optional(
			v.object({
				clinicalSummary: v.optional(v.string()),
				history: v.optional(v.string()),
				investigations: v.optional(v.string()),
				treatmentPlan: v.optional(v.string()),
				opinion: v.optional(v.string()),
			}),
		),
		// Internal note for coordinator (not in insurer-facing PDF)
		internalNote: v.optional(v.string()),
		submittedAt: v.optional(v.number()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_glRequest", ["glRequestId"])
		.index("by_doctor", ["doctorId"])
		.index("by_status", ["status"]),

	// ============== ACTIVITY LOGS (from HEAD) ==============

	// Activity logs table
	activity_logs: defineTable({
		type: v.string(),
		message: v.string(),
		glId: v.optional(v.string()),
		createdAt: v.number(),
	}),

	// ============== AUDIT & SNAPSHOTS (AU-12.*) ==============

	// Immutable evaluation snapshots
	evaluationSnapshots: defineTable({
		glRequestId: v.id("glRequests"),
		version: v.number(),
		// Inputs snapshot
		inputs: v.object({
			caseIntake: v.any(), // Full case intake JSON
			policyClauses: v.array(v.any()),
			clinicalFindings: v.optional(v.any()),
			payerConfig: v.optional(v.any()),
		}),
		// Deterministic rule outputs
		ruleOutputs: v.object({
			signals: v.array(v.any()),
			missingItems: v.array(v.any()),
			scoreBucket: riskBucket,
			approvalProbability: v.number(),
		}),
		// AI model outputs
		aiOutputs: v.optional(
			v.object({
				model: v.string(),
				provider: v.string(),
				narrative: v.optional(v.string()),
				structuredResult: v.optional(v.any()),
				latencyMs: v.optional(v.number()),
			}),
		),
		createdAt: v.number(),
	})
		.index("by_gl_request", ["glRequestId"])
		.index("by_version", ["glRequestId", "version"]),

	// Audit event log
	auditLogs: defineTable({
		glRequestId: v.optional(v.id("glRequests")),
		policyId: v.optional(v.id("policyDocuments")),
		actor: v.string(), // "system", "demo_user", or user ID
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
		timestamp: v.number(),
	})
		.index("by_gl_request", ["glRequestId"])
		.index("by_policy", ["policyId"])
		.index("by_action", ["action"])
		.index("by_timestamp", ["timestamp"]),
});
