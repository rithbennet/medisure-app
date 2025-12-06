import { signOut } from "@workos-inc/authkit-nextjs";

export async function GET() {
	// Use WorkOS's signOut which properly terminates the session on WorkOS's servers
	// and clears the local cookies
	await signOut({ returnTo: "/" });
}

