'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from 'convex/react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '../../../convex/_generated/api';

type FormValues = {
  patientName: string;
  insurerName: string;
  diagnosis: string;
  estimatedCost?: string;
};

type SubmitState = {
  status: 'idle' | 'submitting' | 'success' | 'error';
  message?: string;
};

export function GlForm() {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      patientName: '',
      insurerName: 'AIA',
      diagnosis: '',
      estimatedCost: '',
    },
  });

  const insurerName = watch('insurerName');

  const demoPolicies = useQuery(api.policies.listDemoPolicies, {});
  const createGL = useMutation(api.glRequests.createGLRequest);

  const [submitState, setSubmitState] = useState<SubmitState>({
    status: 'idle',
  });

  const matchedPolicy = useMemo(
    () => demoPolicies?.find((p) => p.insurerName === insurerName) ?? null,
    [demoPolicies, insurerName],
  );

  async function onSubmit(values: FormValues) {
    try {
      setSubmitState({ status: 'submitting' });

      const estimatedCost = values.estimatedCost
        ? Number.parseFloat(values.estimatedCost)
        : undefined;

      await createGL({
        patientName: values.patientName,
        insurerName: values.insurerName,
        diagnosis: values.diagnosis,
        estimatedCost,
      });

      // Reset form to prevent duplicate submissions
      reset();

      setSubmitState({
        status: 'success',
        message: 'GL draft created and auto-linked to a demo policy.',
      });
    } catch (error) {
      console.error(error);
      setSubmitState({
        status: 'error',
        message: 'Something went wrong creating this GL. Please try again.',
      });
    }
  }

  return (
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
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-gray-900 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="AIA">AIA</option>
            <option value="Prudential">Prudential</option>
            <option value="Allianz">Allianz</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-900">
          Diagnosis &amp; procedure
        </label>
        <textarea
          {...register('diagnosis', { required: true })}
          className="flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-gray-900 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Short description of diagnosis, symptom onset, and planned procedure."
        />
        {errors.diagnosis && (
          <p className="text-xs text-red-600">
            Please describe the diagnosis or planned procedure.
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-900">
            Estimated cost (RM)
          </label>
          <Input
            {...register('estimatedCost')}
            inputMode="decimal"
            placeholder="e.g. 18000"
          />
        </div>

        <div className="space-y-2 text-sm">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Policy auto lookup
          </p>
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm">
            {matchedPolicy ? (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
                  Demo Policy
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {matchedPolicy.productName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Plan type: {matchedPolicy.planType}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  This GL will be analysed against the indexed clauses for this
                  policy.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-900">
                  No indexed policy available.
                </p>
                <p className="text-xs text-muted-foreground">
                  For this insurer we don&apos;t yet have a demo policy. In the
                  full version, you&apos;ll be able to upload a PDF here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
        {submitState.status === 'success' ? (
          <>
            <Button
              className="w-full sm:w-auto"
              type="button"
              onClick={() => setSubmitState({ status: 'idle' })}
            >
              Create another GL
            </Button>
            <p className="text-xs text-green-600">{submitState.message}</p>
          </>
        ) : (
          <>
            <Button
              className="w-full sm:w-auto"
              disabled={submitState.status === 'submitting'}
              type="submit"
            >
              {submitState.status === 'submitting' ? 'Saving...' : 'Analyze risk'}
            </Button>
            <Button
              className="w-full sm:w-auto"
              disabled={submitState.status === 'submitting'}
              type="button"
              variant="outline"
            >
              Save draft
            </Button>
            {submitState.status === 'error' && submitState.message && (
              <p className="text-xs text-red-600">{submitState.message}</p>
            )}
          </>
        )}
      </div>
    </form>
  );
}


