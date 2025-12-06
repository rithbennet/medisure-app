import { query } from "./_generated/server";

import { getAllDemoPolicies, type PolicyMetadata } from "./utils/policyLookup";

export const listDemoPolicies = query({
	args: {},
	async handler(): Promise<PolicyMetadata[]> {
		return getAllDemoPolicies();
	},
});


