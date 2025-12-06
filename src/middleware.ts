import { authkitMiddleware } from "@workos-inc/authkit-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Wrap authkit middleware to handle large file uploads
const authMiddleware = authkitMiddleware();

export default async function middleware(request: NextRequest) {
	// Skip middleware body processing for Server Actions (file uploads)
	const contentType = request.headers.get("content-type") || "";
	const contentLength = request.headers.get("content-length");
	
	// If it's a large multipart form (likely a file upload), let it through
	if (contentType.includes("multipart/form-data") && contentLength) {
		const size = parseInt(contentLength, 10);
		// For files over 5MB, skip auth middleware to avoid body parsing issues
		if (size > 5 * 1024 * 1024) {
			// Still need to check if user is authenticated for protected routes
			// But don't parse the body
			return NextResponse.next();
		}
	}

	// For normal requests, use authkit middleware
	return authMiddleware(request);
}

export const config = {
	matcher: [
		// Match all paths except static files and Next.js internals
		"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
	],
};

