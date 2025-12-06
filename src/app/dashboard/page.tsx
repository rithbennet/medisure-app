import { withAuth } from "@workos-inc/authkit-nextjs";
import { ConvexHttpClient } from "convex/browser";
import { redirect } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { DashboardContent } from "./dashboard-content";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
	throw new Error("NEXT_PUBLIC_CONVEX_URL environment variable is not set");
}
const convex = new ConvexHttpClient(convexUrl);

export default async function DashboardPage() {
	const { user, sessionId } = await withAuth();

	// If not logged in, redirect to home
	if (!user) {
		redirect("/");
	}

	// Store session token in database if not already stored
	if (sessionId) {
		try {
			// Get or create user in Convex database
			const fullName =
				`${user.firstName || ""} ${user.lastName || ""}`.trim() ||
				user.email ||
				"";
			const userResult = await convex.mutation(
				api.users.getOrCreateWorkosUser,
				{
					workosId: user.id,
					email: user.email || "",
					fullName,
				},
			);

			// Check if session already exists for this user and sessionId
			// If not, create it
			await convex.mutation(api.users.createWorkosSession, {
				userId: userResult.user.id,
				workosSessionId: sessionId,
			});
		} catch (error) {
			// Log error but don't block the user from accessing the dashboard
			console.error("Error storing session token:", error);
		}
	}

	return (
		<DashboardContent
			email={user.email || ""}
			fullName={
				`${user.firstName || ""} ${user.lastName || ""}`.trim() ||
				user.email ||
				""
			}
			workosId={user.id}
		/>
	);
}
