# Medisure — GL Pre‑Approval Business Rules

Purpose
- Define the end‑to‑end business rules governing GL pre‑approval intake,
  analysis, packaging, submission, and status tracking.
- Ensure the coordinator can validate cases fully before submission to reduce
  RFIs and speed up approvals.
- Scope: We do not issue GLs. We pre‑check, package, and submit into existing
  insurer/TPA systems, and track responses.

Non‑Goals
- Final claims adjudication
- Medical underwriting or binding coverage decisions
- Replacing insurer/TPA GL issuance

Disclaimer
- Policy interpretation is payer/plan‑specific. These rules provide decision
  support with source‑cited clauses. Final decisions remain with the payer.
- This document is implementation‑first and compliance‑ready (PDPA, audit,
  and data retention to be layered on).



## 1) Roles and Permissions

R‑1.1 Coordinator
- Create/edit cases, upload documents, view risk, submit packages, respond to
  RFIs, update status.

R‑1.2 Doctor
- Enter clinical details, review/approve AI‑drafted letters, sign off on
  narratives.

R‑1.3 Admin
- Configure payers/plans, clause mappings, rule thresholds, submission channels,
  and manage overrides.

R‑1.4 Read‑Only
- View dashboards, cases, and audit logs; no edits.

Rule severity for permission violations
- Blocker: Prevents action.
- Warning: Action allowed; user informed.
- Info: For awareness; no impact.



## 2) Case Lifecycle and Statuses

C‑2.1 Statuses (allowed transitions in parentheses)
- Draft (→ Risked, Archived)
- Risked (→ ReadyToSubmit, Draft)
- ReadyToSubmit (→ Submitted, Draft)
- Submitted (→ Pending, RFI, Approved, Rejected, Withdrawn)
- Pending (→ RFI, Approved, Rejected)
- RFI (→ Resubmitted, Withdrawn)
- Resubmitted (→ Pending, RFI, Approved, Rejected)
- Approved (→ Closed)
- Rejected (→ Closed, Resubmitted)
- Withdrawn (→ Closed)
- Closed (terminal)

C‑2.2 State Guards
- Move to ReadyToSubmit only if no Blockers and required docs present per payer.
- Submission requires clinician approval of any AI‑generated narrative if risk
  is Medium/High.



## 3) Rule Evaluation Semantics

E‑3.1 Severity
- Blocker: Must be fixed before advancing.
- Warning: Highlight to user; can proceed.
- Info: Context only.

E‑3.2 Evidence
- Every fired rule must carry machine‑readable evidence: clause_id, page_ref,
  text_snippet, source (policy/rider), and data fields used.

E‑3.3 Explainability
- Risk outputs must list the specific rules that fired and the clauses used.

E‑3.4 Configuration
- Thresholds, mappings, and requirements are per payer/plan and editable by
  Admin without code deploy.



## 4) Inbound Intake Rules

I‑4.1 Required Fields (Blocker if missing)
- Patient: anonymized_id, full_name, date_of_birth, id_type, id_number.
- Coverage: payer_name, plan_code, policy_number, policy_start_date.
- Encounter: diagnosis_icd10[], symptom_start_date, procedure_code(s) if known,
  encounter_type (inpatient/outpatient/ED/day_surgery), planned_date (if
  elective), emergency_flag.
- Provider: facility_name, facility_type, panel_status (panel/non‑panel),
  attending_doctor.
- Financial: currency, total_estimate, estimate_breakdown[].
- Consent: data_sharing_consent = true (or captured artifact).
- Attachments: doctor_report OR clinical_note.

I‑4.2 Field Validations (Blocker unless stated)
- ICD‑10 codes must be valid from current code list (Blocker).
- Dates must be ISO‑8601, not in the future except planned_date (Blocker).
- Currency must be supported (MYR, SGD, etc.) (Blocker).
- estimate_breakdown categories must sum to total_estimate (Warning if diff
  ≤ 1%; Blocker if > 1%).
- panel_status must be correct per configured provider registry (Warning if
  unknown).

I‑4.3 Attachments (Blocker if required by payer)
- doctor_report: required for surgical/day‑surgery inpatient.
- itemized_estimate: required if total_estimate ≥ payer.threshold_itemized.
- imaging/labs: required if diagnosis/procedure falls under imaging‑dependent
  conditions (e.g., ortho MRI for meniscal repair).
- referral_letter: required if payer mandates referral for specialist care.
- accident_report: required if accident_flag = true and payer requires it.
- pregnancy_documentation: required for maternity‑related requests.
- implant_quote: required if implants/prosthesis present in estimate_breakdown.

I‑4.4 Document Constraints
- Allowed file types: pdf, jpg, png, docx (configurable).
- Max single file size: 10 MB (configurable).
- Naming convention: <caseId>_<docType>_<yyyymmdd>.<ext>.



## 5) Eligibility and Risk Rules

General
- The engine uses deterministic checks first; LLM‑assisted reasoning only for
  gray areas and must cite clause_id + page_ref.
- Each rule produces: rule_id, severity, message, suggested_action,
  clause evidence (if policy‑based), and data evidence.

Eligibility Core

EL‑5.1 Policy Effective Window
- If symptom_start_date < policy_start_date → Blocker, High risk
  Suggested: “Consider self‑pay or exception request.”
- If elective planned_date < policy_start_date → Blocker.

EL‑5.2 Waiting Period
- For each diagnosis/procedure, find waiting_period_days (by plan).
- If (symptom_start_date − policy_start_date) < waiting_period_days
  → Blocker or Warning per payer policy.
- Evidence: waiting_period clause.

EL‑5.3 Pre‑Existing Condition (PEC) Definition
- If clinical_note or history fields indicate prior diagnosis/symptoms for the
  same condition before policy_start_date → High risk Warning at minimum; may
  be Blocker if plan’s PEC exclusion applies.
- Evidence: PEC definition clause + extracted history anchor.

EL‑5.4 General Exclusions (examples, plan‑specific)
- Cosmetic, fertility, congenital (unless covered), obesity surgery, dental
  (non‑accident), preventive screening, experimental, robotic surgery,
  mental health (if excluded), occupational injuries (if excluded).
- If matched to diagnosis/procedure tags → Blocker.
- Evidence: general_exclusion clauses.

EL‑5.5 Specific Exclusions
- If the plan lists condition/procedure‑specific exclusions (e.g., LASIK) and
  ICD/procedure matches → Blocker.

EL‑5.6 Sublimits and Caps
- Compute per category (room/board, ICU per‑diem, surgical fee, anesthetist,
  OT, implants, prosthesis, drugs).
- If estimate_breakdown[category] > plan.sublimit[category] → Warning with
  expected uncovered_amount; escalate to Blocker if payer rejects overages.
- Evidence: sublimit clause.

EL‑5.7 Annual/Lifetime Maximums
- If coverage_used_ytd and plan.annual_max known:
  - If coverage_used_ytd + total_estimate > annual_max → Warning/Blocker per
    payer rule. If unknown usage, mark Info: “Unknown remaining annual limit.”

EL‑5.8 Age/Gender Rules
- Maternity coverage only if plan.maternity_enabled = true and within
  waiting_period_maternity; otherwise Blocker.
- Newborn coverage rules per plan (e.g., coverage starts at 15 days) → Blocker
  if violated.

EL‑5.9 Panel/Network Rules
- If panel_status = non‑panel and plan requires panel → Warning or Blocker
  per payer rule. Suggested: “Route to panel provider or seek exception.”

EL‑5.10 Accident vs Illness Routing
- If accident_flag = true and employer/SOCSO is primary for occupational
  injuries → Warning: “Route to SOCSO; payer may decline.”

EL‑5.11 Bed Class Mismatch
- If requested bed_class exceeds plan bed_class → Warning with estimated
  copayment.

EL‑5.12 ICU/High‑Dependency
- If ICU expected and plan ICU per‑diem < estimate → Warning with uncovered
  delta; escalate if payer rejects overage.

Completeness (RFI Prevention)

EL‑5.20 Required Fields Matrix (per payer/plan)
- For each payer/plan, require specific fields/attachments by encounter_type
  and diagnosis/procedure tags. Missing → Blocker.

EL‑5.21 Time Windows
- If elective, require submission lead time (e.g., ≥ 3 business days) →
  Warning/Blocker per payer.
- If ED admission, require notification within window (e.g., 24–48 hours) →
  Warning and suggest immediate notify.

EL‑5.22 Estimates
- Require itemized estimate when thresholds met; ensure surgeon vs
  anesthetist vs OT fees are broken out for surgical cases (Blocker if absent).

EL‑5.23 Identity and Eligibility
- If name/ID mismatch between patient and policy holder without dependent
  mapping → Blocker or Warning per payer dependent rules.



## 6) Risk Scoring and Approval Likelihood

RS‑6.1 Risk Bucket
- Low: No Blockers; ≤ 1 moderate Warning; no exclusion/waiting/PEC hits.
- Medium: No Blockers; ≥ 2 Warnings or any financial sublimit exposures.
- High: Any exclusion/waiting/PEC Blocker or multiple severe Warnings.

RS‑6.2 Probability Model
- Phase 1 (rules‑based): Start at 0.85; subtract weights:
  - −0.50 for any Blocker
  - −0.20 PEC Warning
  - −0.15 waiting_period Warning
  - −0.10 general_exclusion Warning
  - −0.05 per missing required doc
  - −min(0.20, uncovered_amount / total_estimate × 0.5)
- Clip to [0.01, 0.98].
- Phase 2 (data‑driven): Train logistic model on labeled outcomes with Platt
  or isotonic calibration.

RS‑6.3 Output (stored and displayed)
- score_bucket, approval_probability
- signals[] with rule_id, severity, message, clause evidence
- missing_items[] with payer_field/doc_type and reason
- suggested_actions[]



## 7) Doctor Letter Generation

DL‑7.1 Preconditions
- Generate only if risk Medium/High or if coordinator requests.

DL‑7.2 Content Rules
- Ground strictly to intake fields; no fabrication.
- Include brief medical necessity, clinical timeline, and alternatives tried,
  when relevant.
- Cite policy clauses by clause_id and page_ref for exceptions/clarifications.

DL‑7.3 Approval
- Must be reviewed and approved by a Doctor before inclusion in any bundle
  (Blocker if unapproved and risk > Low).



## 8) Pre‑Submit Gate (Coordinator Checklist)

PS‑8.1 Eligibility Gate (Blockers must be zero)
- No Blockers present in current rule evaluation.

PS‑8.2 Completeness Gate
- All required payer fields present.
- Mandatory docs uploaded per matrix.
- Doctor letter approved if required.

PS‑8.3 Consistency Gate
- estimate_breakdown sums to total.
- Panel status verified or exception pathway selected.
- Dates sane and within required notification windows.

PS‑8.4 Final Snapshot
- Freeze version (inputs, outputs, clause citations, artifacts) before submit.



## 9) Output Packaging Rules

OP‑9.1 Submission Bundle (standardized)
- data.json: normalized clinical/coverage/financial fields.
- letter.pdf: approved doctor letter (if any).
- summary.pdf: risk summary with clause quotes and missing‑items resolved.
- attachments/: supporting artifacts as per payer matrix.

OP‑9.2 File Naming
- <payer>_<plan>_<caseId>_<artifact>_<yyyymmdd>.<ext>

OP‑9.3 Form Mapping
- Map internal fields to payer form fields with validation (types, required,
  enumerations). Missing mapped required → Blocker.

OP‑9.4 Size and Format
- Respect payer max email/portal size; split intelligently if needed.



## 10) Outbound Submission Rules

OB‑10.1 Channel Selection
- Use payer‑preferred integration in priority order:
  - API → Portal automation (RPA) → Secure email
- Channel is configured per payer/plan.

OB‑10.2 API
- Validate against payer schema; on 4xx, parse errors and return to RFI flow
  (Warning or Blocker per error type).

OB‑10.3 Portal Automation
- Use resilient selectors; on change detection, fall back to manual submit and
  flag Admin (Warning with action “Update adapter”).

OB‑10.4 Email
- Subject: “Pre‑Auth Request | <payer> | <policy_number> | <caseId>”
- Body includes summary, risk bucket, and contact.
- Attach bundle files; ensure required docs included.

OB‑10.5 De‑Duplication
- Prevent duplicate submissions:
  - Same payer + policy_number + planned_date + diagnosis hash within 48 hours
    → Warning with require user confirmation to proceed.

OB‑10.6 After Submit
- Record external reference (if provided), timestamps, and channel used.
- Transition status to Submitted or Pending per channel behavior.



## 11) Status Tracking and RFI Handling

ST‑11.1 Inbound Status Sources
- API webhooks, portal polling, or email parsing.

ST‑11.2 Mapping
- Normalize external statuses to: Pending, RFI, Approved, Rejected.

ST‑11.3 RFI Triage
- Extract requested items; map to fields/docs.
- Provide one‑click “Respond to RFI” with pre‑filled artifacts.

ST‑11.4 SLAs
- Configurable per payer:
  - RFI response target (e.g., 24–48 hours).
  - Escalation reminders at T+24h and T+48h.

ST‑11.5 Closure
- Approved/Rejected → Closed with final artifact attached (PDF/email).



## 12) Audit, Logging, and Versioning

AU‑12.1 Immutable Snapshots
- Store inputs, retrieved clauses (with page image), fired rules, outputs,
  letters, submission artifacts, and external refs per version.

AU‑12.2 Timeline
- Action log with actor, timestamp, and action (create, edit, run risk, approve
  letter, submit, RFI respond, close).

AU‑12.3 Overrides
- Manual clause/decision overrides require reason and are highlighted in audit.

AU‑12.4 Retention
- Configurable retention; default 24 months for case artifacts.



## 13) Error Handling and Fallbacks

ER‑13.1 Missing Policy Docs
- Warning: “Policy document not loaded; using payer defaults.”
- Encourage Admin to upload plan docs; block for final submit if payer requires
  clause citations.

ER‑13.2 Unparseable Docs
- Attempt OCR; if still failing, allow manual clause tagging (Admin).

ER‑13.3 Adapter Failure
- Fall back to next channel (API → Portal → Email) and flag Admin.

ER‑13.4 LLM Failure/Timeout
- Return deterministic results; mark narrative unavailable (Warning).



## 14) Configuration Model (Admin)

CFG‑14.1 Payer/Plan
- waiting_periods by condition/procedure
- exclusions (general/specific) with tags
- sublimits per category
- required_fields and required_docs matrices
- notification windows (elective/ED)
- channel configuration (API/Portal/Email)
- panel policy and provider registry

CFG‑14.2 Mappings
- ICD‑10/Procedure to benefit tags
- Estimate categories to sublimits
- Field map to payer form schemas



## 15) JSON Schemas (for validation)

15.1 Case Intake (data.json)
```json
{
  "case_id": "MS-2025-000123",
  "patient": {
    "anonymized_id": "P-9f3a2c",
    "full_name": "Jane Doe",
    "date_of_birth": "1989-05-12",
    "id_type": "MYKAD",
    "id_number": "890512-10-1234"
  },
  "coverage": {
    "payer_name": "Acme Insurance",
    "plan_code": "ACME-A",
    "policy_number": "ACME-12345",
    "policy_start_date": "2024-06-01"
  },
  "encounter": {
    "encounter_type": "inpatient",
    "diagnosis_icd10": ["K35.80"],
    "procedure_codes": ["0DTJ4ZZ"],
    "symptom_start_date": "2024-10-28",
    "planned_date": "2024-11-02",
    "emergency_flag": false,
    "accident_flag": false,
    "maternity_flag": false,
    "icu_expected": false,
    "bed_class": "standard"
  },
  "provider": {
    "facility_name": "City Hospital",
    "facility_type": "hospital",
    "panel_status": "panel",
    "attending_doctor": "Dr. Smith"
  },
  "financial": {
    "currency": "MYR",
    "total_estimate": 18000,
    "estimate_breakdown": [
      { "category": "surgical_fee", "amount": 8000 },
      { "category": "anesthetist_fee", "amount": 2000 },
      { "category": "ot_charges", "amount": 4000 },
      { "category": "room_board", "amount": 2000 },
      { "category": "drugs", "amount": 2000 }
    ]
  },
  "attachments": [
    {
      "type": "doctor_report",
      "file_name": "MS-2025-000123_doctor_report_20241101.pdf"
    },
    {
      "type": "itemized_estimate",
      "file_name": "MS-2025-000123_estimate_20241101.pdf"
    }
  ],
  "consent": { "data_sharing_consent": true }
}
```

15.2 Risk Result
```json
{
  "case_id": "MS-2025-000123",
  "score_bucket": "Medium",
  "approval_probability": 0.78,
  "signals": [
    {
      "rule_id": "EL-5.6",
      "severity": "Warning",
      "message": "Surgical fee exceeds sublimit by MYR 1,000",
      "clause": {
        "clause_id": "SUB-12",
        "page_ref": "p.14",
        "text_snippet": "Surgical fees capped at MYR 7,000 per admission."
      },
      "evidence": {
        "estimate_category": "surgical_fee",
        "amount": 8000,
        "sublimit": 7000
      }
    }
  ],
  "missing_items": [
    {
      "type": "attachment",
      "key": "imaging",
      "reason": "Required for surgical cases per payer matrix"
    }
  ],
  "suggested_actions": ["Upload imaging report", "Proceed with submission"]
}
```

15.3 Submission Bundle Manifest
```json
{
  "case_id": "MS-2025-000123",
  "channel": "email",
  "artifacts": [
    "data.json",
    "summary.pdf",
    "letter.pdf",
    "attachments/doctor_report.pdf",
    "attachments/itemized_estimate.pdf",
    "attachments/imaging.pdf"
  ],
  "payer_form_map": {
    "policyNumber": "ACME-12345",
    "memberName": "Jane Doe",
    "icd10": ["K35.80"],
    "procedureCodes": ["0DTJ4ZZ"],
    "admissionType": "inpatient"
  }
}
```



## 16) Clause and Rule Data Model (internal)

CL‑16.1 Clause Object
- clause_id: string (unique within payer/plan)
- type: waiting_period | exclusion_general | exclusion_specific |
  sublimit | coverage | doc_requirement | pec_definition
- tags: []
- text: string
- page_ref: string
- effective_date: string (optional)
- source_file: string

CL‑16.2 Rule Object (fired)
- rule_id: string
- severity: Blocker | Warning | Info
- message: string
- clause: Clause (optional)
- evidence: object
- suggested_action: string



## 17) Coordinator UX — Quick “Ready to Submit” Checklist

- No Blockers remaining.
- All required payer fields populated.
- Mandatory attachments present (matrix satisfied).
- Doctor letter approved if risk Medium/High.
- Panel status verified or exception path chosen.
- Estimate sums correctly; major sublimit exposures acknowledged.
- Notification window satisfied (or justification attached).
- Final snapshot taken; bundle generated without errors.



## 18) Adding a New Payer (Playbook)

- Upload plan PDFs/riders; run parser; verify sectioning.
- Configure:
  - waiting_periods
  - general/specific exclusions
  - sublimits by category
  - required_fields/docs by encounter_type and tags
  - notification windows
  - submission channel details
- Validate with 3–5 historical cases; reconcile differences.
- Pilot: monitor RFI reasons and refine within a week.



## 19) KPIs (for continuous improvement)

- RFI rate (% of submissions)
- Median time to approval (ReadyToSubmit → Approved)
- Top 5 missing items leading to RFIs
- False Blocker/Warning rate (over‑flagging)
- Submission adapter failure rate
- Coordinator satisfaction (survey)