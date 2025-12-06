'use client';

import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from 'convex/react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { parsePdfAction } from '@/app/actions/parse-pdf';

// ============== TYPES ==============

type FormValues = {
  patientName: string;
  insurerName: string;
  diagnosis: string;
  diagnosisCode: string;
  estimatedCost: string;
  symptomStartDate: string;
  policyStartDate: string;
  encounterType: 'inpatient' | 'outpatient' | 'ed' | 'day_surgery';
  panelStatus: 'panel' | 'non_panel' | 'unknown';
  policyId: string;
};

type SubmitState = {
  status: 'idle' | 'submitting' | 'parsing_policy' | 'extracting_clauses' | 'analyzing' | 'success' | 'error';
  message?: string;
};

// Document types as per I-4.3
type DocumentType = 'doctor_report' | 'itemized_estimate' | 'imaging' | 'lab_result' | 'referral_letter' | 'other';

interface UploadedDocument {
  id: string;
  file: File;
  type: DocumentType;
  uploadedAt: Date;
}

// Policy parsing types
interface ParsedClause {
  clause_id: string;
  type: string;
  tags: string[];
  text: string;
  page_ref?: string;
  waiting_period_days?: number;
  sublimit_amount?: number;
  sublimit_category?: string;
}

interface PolicyParseResult {
  success: boolean;
  text?: string;
  metadata?: {
    fileName: string;
    fileSize: number;
    numPages: number | string;
    textLength: number;
    parseTimeMs: number;
    method?: string;
  };
  error?: string;
}

interface ClauseExtractionResult {
  success: boolean;
  clauses?: ParsedClause[];
  config?: {
    waiting_periods?: Array<{ condition_tag: string; days: number }>;
    exclusions_general?: Array<{ tag: string; description: string }>;
    sublimits?: Array<{ category: string; amount: number; currency: string }>;
    annual_max?: number;
  };
  error?: string;
}

// AI Analysis Types (from businessRules.MD)
interface Signal {
  ruleId: string;
  severity: 'Blocker' | 'Warning' | 'Info';
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
  scoreBucket: 'Low' | 'Medium' | 'High';
  approvalProbability: number;
  signals: Signal[];
  missingItems: MissingItem[];
  suggestedActions: string[];
}

// ============== DOCUMENT TYPE CONFIG ==============

const DOCUMENT_TYPES: { value: DocumentType; label: string; description: string; icon: string }[] = [
  { value: 'doctor_report', label: "Doctor's Report", description: 'Clinical notes, diagnosis, treatment plan', icon: '🩺' },
  { value: 'itemized_estimate', label: 'Itemized Cost Estimate', description: 'Detailed breakdown of expected costs', icon: '💰' },
  { value: 'imaging', label: 'Imaging Report', description: 'X-ray, MRI, CT scan, ultrasound', icon: '📷' },
  { value: 'lab_result', label: 'Lab Results', description: 'Blood tests, pathology reports', icon: '🔬' },
  { value: 'referral_letter', label: 'Referral Letter', description: 'Specialist referral from GP', icon: '📝' },
  { value: 'other', label: 'Other Document', description: 'Any other supporting document', icon: '📄' },
];

// ============== TEST CASE TEMPLATES ==============

const TEST_CASES = {
  appendicitis: {
    patientName: 'Ahmad bin Ismail',
    diagnosis: '24-hour history of peri-umbilical pain migrating to RLQ, nausea, low-grade fever. RLQ tenderness with guarding. WBC 14.2 x10^9/L. Ultrasound: non-compressible 7mm tubular structure with peri-appendiceal fat stranding. Impression: acute appendicitis. Planned: Laparoscopic appendectomy under GA. Expected LOS: 2 days.',
    diagnosisCode: 'K35.80',
    estimatedCost: '18000',
    symptomStartDate: '2024-10-28',
    policyStartDate: '2024-01-01',
    encounterType: 'inpatient' as const,
    panelStatus: 'panel' as const,
  },
  dengue: {
    patientName: 'Tan Mei Ling',
    diagnosis: 'NS1 positive dengue fever day 3, myalgia, retro-orbital pain. Platelets 98 x10^9/L, HCT up 8% from baseline. Warning signs absent. Plan: close monitoring, IV hydration, serial FBC/HCT, daily clinical review. Expected LOS: 2-3 days.',
    diagnosisCode: 'A90',
    estimatedCost: '8000',
    symptomStartDate: '2024-11-05',
    policyStartDate: '2024-06-01',
    encounterType: 'inpatient' as const,
    panelStatus: 'panel' as const,
  },
  meniscus: {
    patientName: 'Raj Kumar',
    diagnosis: 'Medial joint line pain, locking, positive McMurray test. MRI: complex tear posterior horn medial meniscus. Plan: Knee arthroscopy with partial medial meniscectomy under spinal anesthesia. Same-day discharge expected.',
    diagnosisCode: 'S83.2',
    estimatedCost: '12000',
    symptomStartDate: '2024-09-20',
    policyStartDate: '2024-01-01',
    encounterType: 'day_surgery' as const,
    panelStatus: 'panel' as const,
  },
  preExisting: {
    patientName: 'Wong Siew Mei',
    diagnosis: 'Type 2 diabetes with poor glycemic control requiring insulin optimization. HbA1c 9.2%. Plan: inpatient stabilization and diabetes education.',
    diagnosisCode: 'E11.9',
    estimatedCost: '5000',
    symptomStartDate: '2023-06-15', // BEFORE policy start - triggers PEC
    policyStartDate: '2024-01-01',
    encounterType: 'inpatient' as const,
    panelStatus: 'panel' as const,
  },
  outpatient: {
    patientName: 'Siti Aminah',
    diagnosis: 'Routine follow-up for hypertension. BP well controlled on current medication. ECG normal.',
    diagnosisCode: 'I10',
    estimatedCost: '500',
    symptomStartDate: '2024-10-01',
    policyStartDate: '2024-01-01',
    encounterType: 'outpatient' as const,
    panelStatus: 'panel' as const,
  },
};

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
        className={`flex h-5 w-5 items-center justify-center rounded text-xs font-medium ${
          checked
            ? 'bg-emerald-100 text-emerald-600'
            : 'bg-red-100 text-red-500'
        }`}
      >
        {checked ? '✓' : '○'}
      </span>
      <span className={checked ? 'text-gray-700' : 'text-gray-500'}>
        {label}
      </span>
      <span className="font-mono text-gray-400 text-xs">({ruleId})</span>
    </div>
  );
}

function SignalCard({ signal }: { signal: Signal }) {
  const severityStyles = {
    Blocker: 'bg-red-50 border-red-200 text-red-800',
    Warning: 'bg-amber-50 border-amber-200 text-amber-800',
    Info: 'bg-sky-50 border-sky-200 text-sky-800',
  };

  const severityBadgeStyles = {
    Blocker: 'bg-red-200 text-red-800',
    Warning: 'bg-amber-200 text-amber-800',
    Info: 'bg-sky-200 text-sky-800',
  };

  return (
    <div className={`rounded-lg border p-3 ${severityStyles[signal.severity]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs opacity-70">{signal.ruleId}</span>
          <span
            className={`rounded px-1.5 py-0.5 text-xs font-medium ${severityBadgeStyles[signal.severity]}`}
          >
            {signal.severity}
          </span>
        </div>
      </div>
      <p className="mt-1 text-sm">{signal.message}</p>
      {signal.suggestedAction && (
        <p className="mt-2 text-xs opacity-70">
          💡 {signal.suggestedAction}
        </p>
      )}
      {signal.clauseId && (
        <p className="mt-1 font-mono text-xs opacity-60">
          Clause: {signal.clauseId}
        </p>
      )}
    </div>
  );
}

function RuleHint({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-1 inline-flex items-center rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-700">
      {children}
    </span>
  );
}

function DocumentCard({ 
  doc, 
  onRemove 
}: { 
  doc: UploadedDocument; 
  onRemove: () => void;
}) {
  const typeInfo = DOCUMENT_TYPES.find(t => t.value === doc.type);
  
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white">
      <span className="text-2xl">{typeInfo?.icon || '📄'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{doc.file.name}</p>
        <p className="text-xs text-gray-500">
          {typeInfo?.label} • {(doc.file.size / 1024).toFixed(1)} KB
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

function PolicyParsingStatus({
  status,
  policyText,
  extractedClauses,
  parsingError,
}: {
  status: 'idle' | 'parsing' | 'extracting' | 'done' | 'error';
  policyText?: string;
  extractedClauses?: ParsedClause[];
  parsingError?: string;
}) {
  if (status === 'idle') return null;

  return (
    <div className={`mt-3 rounded-lg p-3 text-sm ${
      status === 'error' ? 'bg-red-50 border border-red-200' :
      status === 'done' ? 'bg-green-50 border border-green-200' :
      'bg-blue-50 border border-blue-200'
    }`}>
      {status === 'parsing' && (
        <div className="flex items-center gap-2 text-blue-700">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span>Extracting text from PDF (OCR if needed)...</span>
        </div>
      )}
      {status === 'extracting' && (
        <div className="flex items-center gap-2 text-blue-700">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span>AI extracting clauses (waiting periods, exclusions, sublimits)...</span>
        </div>
      )}
      {status === 'done' && extractedClauses && (
        <div className="text-green-700">
          <p className="font-medium">✓ Policy parsed successfully!</p>
          <p className="text-xs mt-1">
            Extracted {policyText?.length.toLocaleString()} characters, {extractedClauses.length} clauses
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            {extractedClauses.slice(0, 5).map((clause, idx) => (
              <span key={idx} className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
                {clause.type.replace('_', ' ')}
              </span>
            ))}
            {extractedClauses.length > 5 && (
              <span className="text-xs text-green-600">+{extractedClauses.length - 5} more</span>
            )}
          </div>
        </div>
      )}
      {status === 'error' && (
        <div className="text-red-700">
          <p className="font-medium">✗ Policy parsing failed</p>
          <p className="text-xs mt-1">{parsingError}</p>
        </div>
      )}
    </div>
  );
}

// ============== MAIN COMPONENT ==============

export function GlForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<FormValues>({
    defaultValues: {
      patientName: '',
      insurerName: 'AIA',
      diagnosis: '',
      diagnosisCode: '',
      estimatedCost: '',
      symptomStartDate: new Date().toISOString().split('T')[0],
      policyStartDate: '2024-01-01',
      encounterType: 'inpatient',
      panelStatus: 'panel',
      policyId: '',
    },
  });

  // Watch values for conditional logic
  const selectedInsurer = watch('insurerName');
  const encounterType = watch('encounterType');
  const estimatedCost = watch('estimatedCost');

  // Fetch existing policies
  const policies = useQuery(api.policies.listPolicies);

  // Mutations
  const createComprehensiveGL = useMutation(api.glRequests.createComprehensive);
  const ensureDefaultPolicy = useMutation(api.glRequests.ensureDefaultPolicy);
  const createPolicy = useMutation(api.policies.createPolicy);

  const [submitState, setSubmitState] = useState<SubmitState>({
    status: 'idle',
  });

  // Document upload state
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>('doctor_report');
  const docFileInputRef = useRef<HTMLInputElement>(null);

  // Policy file state
  const [policyFile, setPolicyFile] = useState<File | null>(null);
  const policyFileInputRef = useRef<HTMLInputElement>(null);
  
  // Policy parsing state
  const [policyParseStatus, setPolicyParseStatus] = useState<'idle' | 'parsing' | 'extracting' | 'done' | 'error'>('idle');
  const [policyText, setPolicyText] = useState<string | undefined>();
  const [extractedClauses, setExtractedClauses] = useState<ParsedClause[] | undefined>();
  const [parsingError, setParsingError] = useState<string | undefined>();
  const [parsedPolicyId, setParsedPolicyId] = useState<string | null>(null);

  // AI Analysis State
  const [glId, setGlId] = useState<string | null>(null);
  const [policyId, setPolicyId] = useState<string | null>(null);
  const [ruleResult, setRuleResult] = useState<RuleEngineResult | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Handle document upload
  function handleDocUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newDocs: UploadedDocument[] = Array.from(files).map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      type: selectedDocType,
      uploadedAt: new Date(),
    }));

    setUploadedDocs(prev => [...prev, ...newDocs]);

    if (docFileInputRef.current) {
      docFileInputRef.current.value = '';
    }
  }

  function removeDocument(docId: string) {
    setUploadedDocs(prev => prev.filter(d => d.id !== docId));
  }

  // Max file size: 50MB
  const MAX_FILE_SIZE = 50 * 1024 * 1024;

  // Handle policy file change and trigger parsing
  async function handlePolicyFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.includes('pdf')) return;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setParsingError(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 50MB.`);
      setPolicyParseStatus('error');
      if (policyFileInputRef.current) {
        policyFileInputRef.current.value = '';
      }
      return;
    }

    setPolicyFile(file);
    setPolicyParseStatus('idle');
    setPolicyText(undefined);
    setExtractedClauses(undefined);
    setParsingError(undefined);
    setParsedPolicyId(null);

    // Automatically start parsing after file is set
    await parsePolicy(file);
  }

  // Parse policy PDF
  async function parsePolicy(fileToParse?: File) {
    const file = fileToParse || policyFile;
    if (!file) return;

    try {
      setPolicyParseStatus('parsing');
      setParsingError(undefined);

      // Step 1: Parse PDF to extract text using Server Action (supports up to 50MB)
      const formData = new FormData();
      formData.append('file', file);

      const parseData = await parsePdfAction(formData);

      if (!parseData.success) {
        throw new Error(parseData.error || 'Failed to parse PDF');
      }

      if (!parseData.text || parseData.text.trim().length < 50) {
        throw new Error('Could not extract sufficient text from PDF. Try uploading a different document.');
      }

      setPolicyText(parseData.text);
      console.log('[Policy Parse] Extracted', parseData.text.length, 'characters');

      // Step 2: Create a policy record in the database
      setPolicyParseStatus('extracting');
      
      const newPolicyId = await createPolicy({
        insurerName: selectedInsurer || 'Unknown Insurer',
        productName: file.name.replace('.pdf', ''),
        planType: 'Uploaded',
      });
      
      setParsedPolicyId(newPolicyId);

      // Step 3: Extract clauses using Gemini
      const extractRes = await fetch('/api/ai/parse-policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policyId: newPolicyId,
          rawText: parseData.text,
          insurerName: selectedInsurer || 'Unknown Insurer',
        }),
      });

      const extractData: ClauseExtractionResult = await extractRes.json();

      if (!extractRes.ok) {
        throw new Error(extractData.error || 'Failed to extract clauses');
      }

      setExtractedClauses(extractData.clauses || []);
      setPolicyParseStatus('done');
      
      // Auto-select the parsed policy
      setValue('policyId', newPolicyId);

      console.log('[Policy Parse] Extracted', extractData.clauses?.length || 0, 'clauses');

    } catch (error) {
      console.error('[Policy Parse] Error:', error);
      setParsingError(error instanceof Error ? error.message : 'Unknown error');
      setPolicyParseStatus('error');
    }
  }

  function handleRemovePolicyFile() {
    setPolicyFile(null);
    setPolicyParseStatus('idle');
    setPolicyText(undefined);
    setExtractedClauses(undefined);
    setParsingError(undefined);
    setParsedPolicyId(null);
    if (policyFileInputRef.current) {
      policyFileInputRef.current.value = '';
    }
  }

  // Load a test case
  function loadTestCase(caseName: keyof typeof TEST_CASES) {
    const testCase = TEST_CASES[caseName];
    setValue('patientName', testCase.patientName);
    setValue('diagnosis', testCase.diagnosis);
    setValue('diagnosisCode', testCase.diagnosisCode);
    setValue('estimatedCost', testCase.estimatedCost);
    setValue('symptomStartDate', testCase.symptomStartDate);
    setValue('policyStartDate', testCase.policyStartDate);
    setValue('encounterType', testCase.encounterType);
    setValue('panelStatus', testCase.panelStatus);
    setUploadedDocs([]);
  }

  // Run AI rule evaluation
  async function runRuleEvaluation(glRequestId: string) {
    const res = await fetch('/api/ai/evaluate-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ glId: glRequestId }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to evaluate rules');
    }

    return res.json();
  }

  async function onSubmit(values: FormValues) {
    try {
      setSubmitState({ status: 'submitting' });
      setRuleResult(null);
      setShowAnalysis(false);

      const estimatedCostNum = values.estimatedCost
        ? Number.parseFloat(values.estimatedCost)
        : 5000;

      // Step 1: Get or create policy
      let finalPolicyId: Id<"policyDocuments">;

      if (parsedPolicyId) {
        // Use the parsed policy
        finalPolicyId = parsedPolicyId as Id<"policyDocuments">;
      } else if (values.policyId) {
        finalPolicyId = values.policyId as Id<"policyDocuments">;
      } else {
        finalPolicyId = await ensureDefaultPolicy({
          insurerName: values.insurerName,
        });
      }

      setPolicyId(finalPolicyId);

      // Build attachments array from uploaded documents
      const attachments = uploadedDocs.map(doc => ({
        type: doc.type,
        fileName: doc.file.name,
      }));

      // Step 2: Create GL request
      const newGlId = await createComprehensiveGL({
        patientName: values.patientName,
        diagnosis: values.diagnosis,
        diagnosisCode: values.diagnosisCode || undefined,
        estimatedCost: estimatedCostNum,
        policyId: finalPolicyId,
        symptomStartDate: values.symptomStartDate,
        policyStartDate: values.policyStartDate,
        encounterType: values.encounterType,
        panelStatus: values.panelStatus,
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      setGlId(newGlId);

      setSubmitState({
        status: 'analyzing',
        message: 'GL created. Running AI risk analysis...',
      });

      // Step 3: Run rule evaluation
      const evalResult = await runRuleEvaluation(newGlId);
      setRuleResult(evalResult.result);
      setShowAnalysis(true);

      setSubmitState({
        status: 'success',
        message: 'GL created and risk analysis complete!',
      });
    } catch (error) {
      console.error(error);
      setSubmitState({
        status: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Something went wrong. Please try again.',
      });
    }
  }

  // Reset form and analysis
  function handleReset() {
    reset();
    setRuleResult(null);
    setShowAnalysis(false);
    setGlId(null);
    setPolicyId(null);
    setPolicyFile(null);
    setUploadedDocs([]);
    setPolicyParseStatus('idle');
    setPolicyText(undefined);
    setExtractedClauses(undefined);
    setParsedPolicyId(null);
    setSubmitState({ status: 'idle' });
  }

  // Get risk bucket styling
  const getRiskBucketColor = (bucket: RuleEngineResult['scoreBucket']) => {
    switch (bucket) {
      case 'High':
        return 'bg-red-500';
      case 'Medium':
        return 'bg-amber-500';
      case 'Low':
        return 'bg-emerald-500';
    }
  };

  const getRiskBucketTextColor = (bucket: RuleEngineResult['scoreBucket']) => {
    switch (bucket) {
      case 'High':
        return 'text-red-600';
      case 'Medium':
        return 'text-amber-600';
      case 'Low':
        return 'text-emerald-600';
    }
  };

  // Filter policies by selected insurer
  const filteredPolicies = policies?.filter(
    (p) => p.insurerName === selectedInsurer || !selectedInsurer
  );

  // Check document requirements
  const doctorReportRequired = ['inpatient', 'day_surgery'].includes(encounterType);
  const itemizedEstimateRecommended = Number(estimatedCost) >= 10000;
  const hasDoctorReport = uploadedDocs.some(d => d.type === 'doctor_report');
  const hasItemizedEstimate = uploadedDocs.some(d => d.type === 'itemized_estimate');

  // Group uploaded documents by type
  const docsByType = uploadedDocs.reduce((acc, doc) => {
    if (!acc[doc.type]) acc[doc.type] = [];
    acc[doc.type].push(doc);
    return acc;
  }, {} as Record<DocumentType, UploadedDocument[]>);

  const isProcessing = ['submitting', 'parsing_policy', 'extracting_clauses', 'analyzing'].includes(submitState.status);
  const isPolicyParsing = policyParseStatus === 'parsing' || policyParseStatus === 'extracting';

  return (
    <div className="space-y-6">
      {/* Test Case Buttons */}
      <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4">
        <h3 className="text-sm font-medium text-purple-900 mb-3">
          Quick Test Cases
        </h3>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => loadTestCase('appendicitis')}
            className="text-xs border-purple-300 hover:bg-purple-100"
          >
            🏥 Appendicitis (Inpatient)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => loadTestCase('dengue')}
            className="text-xs border-purple-300 hover:bg-purple-100"
          >
            🦟 Dengue (Medical)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => loadTestCase('meniscus')}
            className="text-xs border-purple-300 hover:bg-purple-100"
          >
            🦵 Knee Meniscus (Day Surgery)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => loadTestCase('preExisting')}
            className="text-xs border-red-300 hover:bg-red-100 text-red-700"
          >
            ⚠️ Pre-Existing Condition
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => loadTestCase('outpatient')}
            className="text-xs border-green-300 hover:bg-green-100 text-green-700"
          >
            ✓ Outpatient (Low Risk)
          </Button>
        </div>
        <p className="text-xs text-purple-600 mt-2">
          Click a test case to pre-fill the form, then upload documents as needed.
        </p>
      </div>

      {/* Main Form */}
      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">
              Patient name
            </label>
            <Input
              {...register('patientName', { required: true })}
              placeholder="e.g. Tan Mei Ling"
            />
            {errors.patientName && (
              <p className="text-xs text-red-600">
                Please enter the patient&apos;s name.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">Insurer</label>
            <select
              {...register('insurerName', { required: true })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-gray-900 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="AIA">AIA</option>
              <option value="Prudential">Prudential</option>
              <option value="Allianz">Allianz</option>
              <option value="Great Eastern">Great Eastern</option>
              <option value="MediSure Insurance Co.">MediSure Insurance Co.</option>
            </select>
          </div>
        </div>

        {/* Policy Upload with Parsing */}
        <div className="rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-blue-900">
              📋 Insurance Policy Document
              <span className="ml-2 text-xs font-normal text-blue-600">(Enables clause-based analysis)</span>
            </h4>
            {policyParseStatus === 'done' && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                ✓ Parsed
              </span>
            )}
          </div>
          
          {policyFile ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 rounded-lg border border-blue-200 bg-white">
                <svg className="h-8 w-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 18h12a2 2 0 002-2V6l-4-4H4a2 2 0 00-2 2v12a2 2 0 002 2zm8-14l4 4h-4V4zM6 10h8v2H6v-2zm0 4h5v2H6v-2z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{policyFile.name}</p>
                  <p className="text-xs text-gray-500">{(policyFile.size / 1024).toFixed(1)} KB</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRemovePolicyFile}
                    disabled={isPolicyParsing}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <PolicyParsingStatus
                status={policyParseStatus}
                policyText={policyText}
                extractedClauses={extractedClauses}
                parsingError={parsingError}
              />
            </div>
          ) : (
            <label className="block cursor-pointer">
              <input
                ref={policyFileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handlePolicyFileChange}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-2 py-6 text-center border border-blue-200 rounded-lg bg-white hover:bg-blue-50 transition-colors">
                <svg className="h-10 w-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-600 hover:text-blue-700">
                    Upload insurance policy PDF
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    AI will extract waiting periods, exclusions, and sublimits
                  </p>
                </div>
              </div>
            </label>
          )}

          {/* Or select existing policy */}
          {!policyFile && (
            <div className="pt-2">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="flex-1 border-t border-gray-200"></span>
                <span>or select existing policy</span>
                <span className="flex-1 border-t border-gray-200"></span>
              </div>
              <select
                {...register('policyId')}
                className="mt-2 flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Use default policy for insurer</option>
                {filteredPolicies?.map((policy) => (
                  <option key={policy._id} value={policy._id}>
                    {policy.productName} ({policy.insurerName}) {policy.planType ? `- ${policy.planType}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-900">
            Diagnosis &amp; procedure
          </label>
          <textarea
            {...register('diagnosis', { required: true })}
            className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-gray-900 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Include: symptoms, onset, clinical findings, diagnosis, planned procedure, expected LOS"
          />
          {errors.diagnosis && (
            <p className="text-xs text-red-600">
              Please describe the diagnosis or planned procedure.
            </p>
          )}
        </div>

        {/* Clinical Details */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">
              ICD-10 Code
              <RuleHint>EL-5.4/5.5</RuleHint>
            </label>
            <Input
              {...register('diagnosisCode')}
              placeholder="e.g. K35.80, A90, S83.2"
            />
            <p className="text-xs text-muted-foreground">
              Used for exclusion matching
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">
              Encounter type
              <RuleHint>I-4.3</RuleHint>
            </label>
            <select
              {...register('encounterType')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="inpatient">Inpatient (requires doctor report)</option>
              <option value="outpatient">Outpatient</option>
              <option value="day_surgery">Day Surgery (requires doctor report)</option>
              <option value="ed">Emergency</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">
              Symptom start date
              <RuleHint>EL-5.1/5.3</RuleHint>
            </label>
            <Input {...register('symptomStartDate')} type="date" />
            <p className="text-xs text-muted-foreground">
              If before policy start → PEC risk
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">
              Policy start date
              <RuleHint>EL-5.2</RuleHint>
            </label>
            <Input {...register('policyStartDate')} type="date" />
            <p className="text-xs text-muted-foreground">
              For waiting period calculation
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">
              Estimated cost (RM)
              <RuleHint>EL-5.6</RuleHint>
            </label>
            <Input
              {...register('estimatedCost')}
              inputMode="decimal"
              placeholder="e.g. 18000"
            />
            <p className="text-xs text-muted-foreground">
              {Number(estimatedCost) >= 10000 ? (
                <span className="text-amber-600">≥ RM10,000 requires itemized estimate</span>
              ) : (
                'Checked against sublimits'
              )}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">
              Panel status
              <RuleHint>EL-5.9</RuleHint>
            </label>
            <select
              {...register('panelStatus')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="panel">Panel Provider</option>
              <option value="non_panel">Non-Panel Provider (may require approval)</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
        </div>

        {/* Supporting Documents Section */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">
              Supporting Documents
              <span className="ml-2 text-xs font-normal text-muted-foreground">(I-4.3)</span>
            </h4>
            <span className="text-xs text-gray-500">
              {uploadedDocs.length} document{uploadedDocs.length !== 1 ? 's' : ''} uploaded
            </span>
          </div>

          {/* Document Requirements Alert */}
          {(doctorReportRequired && !hasDoctorReport) || (itemizedEstimateRecommended && !hasItemizedEstimate) ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
              <p className="font-medium text-amber-800 mb-1">Required Documents:</p>
              <ul className="list-disc list-inside text-amber-700 text-xs space-y-0.5">
                {doctorReportRequired && !hasDoctorReport && (
                  <li>Doctor&apos;s Report (required for {encounterType})</li>
                )}
                {itemizedEstimateRecommended && !hasItemizedEstimate && (
                  <li>Itemized Cost Estimate (recommended for costs ≥ RM10,000)</li>
                )}
              </ul>
            </div>
          ) : uploadedDocs.length > 0 && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm">
              <p className="text-green-700">✓ All required documents uploaded</p>
            </div>
          )}

          {/* Upload Controls */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-gray-700 block mb-1">
                Document Type
              </label>
              <select
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value as DocumentType)}
                className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <input
                ref={docFileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleDocUpload}
                multiple
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => docFileInputRef.current?.click()}
                className="h-10"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload File
              </Button>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Supported formats: PDF, JPG, PNG, DOC, DOCX • Multiple files allowed
          </p>

          {/* Uploaded Documents List */}
          {uploadedDocs.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-gray-200">
              {Object.entries(docsByType).map(([type, docs]) => (
                <div key={type} className="space-y-2">
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                    {DOCUMENT_TYPES.find(t => t.value === type)?.label || type}
                  </p>
                  {docs.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      doc={doc}
                      onRemove={() => removeDocument(doc.id)}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
          <Button
            className="w-full sm:w-auto"
            disabled={isProcessing || isPolicyParsing}
            type="submit"
          >
            {submitState.status === 'submitting' ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Creating GL...
              </span>
            ) : submitState.status === 'analyzing' ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Analyzing risk...
              </span>
            ) : (
              'Create & Analyze Risk'
            )}
          </Button>
          {showAnalysis && (
            <Button
              className="w-full sm:w-auto"
              type="button"
              variant="outline"
              onClick={handleReset}
            >
              New GL Request
            </Button>
          )}
          {submitState.message && (
            <p
              className={`text-xs ${
                submitState.status === 'error'
                  ? 'text-red-600'
                  : submitState.status === 'success'
                    ? 'text-emerald-600'
                    : 'text-muted-foreground'
              }`}
            >
              {submitState.message}
            </p>
          )}
        </div>
      </form>

      {/* AI Risk Analysis Results */}
      {showAnalysis && ruleResult && (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-linear-to-b from-gray-50/50 to-white p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Risk Analysis Results
            </h3>
            <button
              type="button"
              onClick={() => setShowAnalysis(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Policy Info */}
          {extractedClauses && extractedClauses.length > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-sm font-medium text-blue-800">
                📋 Analyzed against uploaded policy
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {extractedClauses.length} clauses extracted and used for evaluation
              </p>
            </div>
          )}

          {/* Risk Score Summary */}
          <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4">
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-full text-white ${getRiskBucketColor(ruleResult.scoreBucket)}`}
            >
              <span className="font-bold text-xl">
                {Math.round(ruleResult.approvalProbability * 100)}%
              </span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                Risk Bucket:{' '}
                <span className={getRiskBucketTextColor(ruleResult.scoreBucket)}>
                  {ruleResult.scoreBucket}
                </span>
              </p>
              <p className="text-gray-500 text-sm">
                Approval Probability: {(ruleResult.approvalProbability * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Based on rules RS-6.1/RS-6.2
              </p>
            </div>
          </div>

          {/* Documents Submitted */}
          {uploadedDocs.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h4 className="font-medium text-gray-700 text-sm mb-2">
                Documents Submitted ({uploadedDocs.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {uploadedDocs.map((doc) => {
                  const typeInfo = DOCUMENT_TYPES.find(t => t.value === doc.type);
                  return (
                    <span
                      key={doc.id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs"
                    >
                      {typeInfo?.icon} {typeInfo?.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Signals */}
          {ruleResult.signals.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700 text-sm flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-xs">
                  {ruleResult.signals.length}
                </span>
                Signals Detected
              </h4>
              <div className="space-y-2">
                {ruleResult.signals.map((signal, idx) => (
                  <SignalCard key={`${signal.ruleId}-${idx}`} signal={signal} />
                ))}
              </div>
            </div>
          )}

          {/* No Signals */}
          {ruleResult.signals.length === 0 && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
              <p className="text-green-700 font-medium">✓ No issues detected</p>
              <p className="text-green-600 text-sm">All eligibility checks passed</p>
            </div>
          )}

          {/* Missing Items */}
          {ruleResult.missingItems.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700 text-sm">
                Missing Items ({ruleResult.missingItems.length})
              </h4>
              <ul className="list-inside list-disc space-y-1 text-gray-600 text-sm rounded-lg bg-amber-50 border border-amber-200 p-3">
                {ruleResult.missingItems.map((item, idx) => (
                  <li key={`${item.key}-${idx}`}>
                    <span className="font-medium">{item.key.replace(/_/g, ' ')}</span>:{' '}
                    {item.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Pre-Submit Checklist */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h4 className="mb-3 font-medium text-gray-700 text-sm">
              Pre-Submit Checklist (PS-8.*)
            </h4>
            <div className="space-y-2">
              <ChecklistItem
                checked={ruleResult.signals.filter((s) => s.severity === 'Blocker').length === 0}
                label="No Blockers remaining"
                ruleId="PS-8.1"
              />
              <ChecklistItem
                checked={ruleResult.missingItems.length === 0}
                label="All required documents present"
                ruleId="PS-8.2"
              />
              <ChecklistItem
                checked={!ruleResult.signals.some((s) => s.ruleId === 'I-4.2')}
                label="Estimate breakdown valid"
                ruleId="PS-8.3"
              />
              <ChecklistItem
                checked={!ruleResult.signals.some((s) => s.ruleId === 'EL-5.9')}
                label="Panel status verified"
                ruleId="PS-8.3"
              />
              <ChecklistItem
                checked={!ruleResult.signals.some((s) => s.ruleId === 'EL-5.1')}
                label="Policy effective window OK"
                ruleId="EL-5.1"
              />
              <ChecklistItem
                checked={!ruleResult.signals.some((s) => s.ruleId === 'EL-5.3' && s.severity === 'Blocker')}
                label="No PEC blockers"
                ruleId="EL-5.3"
              />
            </div>
          </div>

          {/* Suggested Actions */}
          {ruleResult.suggestedActions.length > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h4 className="mb-2 font-medium text-blue-800 text-sm">
                Recommended Actions
              </h4>
              <ul className="list-inside list-decimal space-y-1 text-blue-700 text-sm">
                {ruleResult.suggestedActions.map((action, idx) => (
                  <li key={idx}>{action}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Ready to Submit Status */}
          {ruleResult.signals.filter((s) => s.severity === 'Blocker').length === 0 &&
            ruleResult.missingItems.length === 0 ? (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                <svg className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-emerald-800">Ready to Submit</p>
                <p className="text-emerald-600 text-sm">
                  All pre-submit checks passed. This GL can be submitted to the insurer.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <svg className="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-amber-800">Action Required</p>
                <p className="text-amber-600 text-sm">
                  Please resolve {ruleResult.signals.filter((s) => s.severity === 'Blocker').length} blocker(s) and {ruleResult.missingItems.length} missing item(s) before submission.
                </p>
              </div>
            </div>
          )}

          {/* GL Info */}
          {glId && (
            <div className="rounded-lg bg-gray-100 p-3 font-mono text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <span className="text-emerald-600">✓</span>
                <span>GL created: <code className="bg-gray-200 px-1 rounded">{glId}</code></span>
              </div>
              {policyId && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-emerald-600">✓</span>
                  <span>Policy: <code className="bg-gray-200 px-1 rounded">{policyId}</code></span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
