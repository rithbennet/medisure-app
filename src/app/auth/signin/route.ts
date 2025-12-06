import { getSignInUrl, getWorkOS, withAuth } from "@workos-inc/authkit-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function GET() {
	const cookieStore = await cookies();

	// Check if user has an existing session
	let sessionId: string | undefined;
	try {
		const auth = await withAuth();
		sessionId = auth.sessionId;
	} catch {
		// No session, continue
	}

	// Clear local cookies
	cookieStore.getAll().forEach((cookie) => {
		if (cookie.name.startsWith("wos-")) {
			cookieStore.delete(cookie.name);
		}
	});

	// If there's an active session, sign out from WorkOS first
	// The logout URL will redirect back to sign-in
	if (sessionId) {
		const signInUrl = await getSignInUrl();
		const logoutUrl = getWorkOS().userManagement.getLogoutUrl({
			sessionId,
			returnTo: signInUrl,
		});
		redirect(logoutUrl);
	}

	// No active session, go directly to sign-in
	const signInUrl = await getSignInUrl();
	redirect(signInUrl);
}
