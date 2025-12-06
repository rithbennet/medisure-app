import { useMutation, useQuery } from "convex/react";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export type PatientPayload = {
	name: string;
	insurer: string;
	policyId?: Id<"policies">;
};

export type DoctorCasePayload = {
	patientId?: Id<"patients">;
	patientName: string;
	insurerName: string;
	diagnosis: string;
	notes?: string;
	estimatedCost?: number;
	// Structured clinical fields
	symptoms?: string;
	findings?: string;
	labs?: string;
	plan?: string;
};

export function useDoctorData() {
	const patients = useQuery(api.doctor.listPatients, {});
	const doctorCases = useQuery(api.doctor.listDoctorCases, {});

	const isLoading = patients === undefined || doctorCases === undefined;

	return {
		patients: patients ?? [],
		doctorCases: doctorCases ?? [],
		isLoading,
	};
}

export function useDoctorActions() {
	const createPatientMutation = useMutation(api.doctor.createPatient);
	const createCaseMutation = useMutation(api.doctor.createDoctorCase);

	return {
		createPatient: (payload: PatientPayload) => createPatientMutation(payload),
		createDoctorCase: (payload: DoctorCasePayload) =>
			createCaseMutation(payload),
	};
}
