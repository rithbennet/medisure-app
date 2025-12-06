export type PolicyMetadata = {
	id: string;
	insurerName: string;
	productName: string;
	planType: string;
	ragIndexId: string;
};

const DEMO_POLICIES: Record<string, PolicyMetadata> = {
	AIA: {
		id: "demo_policy_aia_2025",
		insurerName: "AIA",
		productName: "AIA CorporateCare 2025",
		planType: "Platinum",
		ragIndexId: "rag_aia_demo",
	},
	Prudential: {
		id: "demo_policy_pru_2025",
		insurerName: "Prudential",
		productName: "PRUValue Med",
		planType: "Gold",
		ragIndexId: "rag_pru_demo",
	},
	Allianz: {
		id: "demo_policy_allianz_medi",
		insurerName: "Allianz",
		productName: "Allianz MediCover",
		planType: "Silver",
		ragIndexId: "rag_allianz_demo",
	},
};

export function lookupPolicyForUser(
	insurerName: string,
): PolicyMetadata | null {
	return DEMO_POLICIES[insurerName] ?? null;
}

export function getAllDemoPolicies(): PolicyMetadata[] {
	return Object.values(DEMO_POLICIES);
}


