import { ConvexHttpClient } from "convex/browser";
import { env } from "@/env";

/**
 * Create a Convex HTTP client for server-side API routes
 * This client is used to call Convex functions from Next.js API routes
 */
export function getConvexClient(): ConvexHttpClient {
	return new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL);
}
