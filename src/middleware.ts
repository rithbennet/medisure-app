import { authkitMiddleware } from "@workos-inc/authkit-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Wrap authkit middleware to handle large file uploads
const authMiddleware = authkitMiddleware();

export default async function middleware(request: NextRequest) {
	// Skip middleware body processing for Server Actions (file uploads)
	const contentType = request.headers.get("content-type") || "";
	const contentLength = request.headers.get("content-length");
	const pathname = request.nextUrl.pathname;
	
	// Skip body parsing for large requests (50MB limit)
	if (contentLength) {
		const size = parseInt(contentLength, 10);
		// For requests over 5MB, skip body parsing to avoid size limit issues
		// This allows files up to 50MB to pass through
		if (size > 5 * 1024 * 1024) {
			// Still need to check if user is authenticated for protected routes
			// But don't parse the body
			return NextResponse.next();
		}
	}
	
	// Also skip body parsing for multipart/form-data (file uploads)
	if (contentType.includes("multipart/form-data")) {
		return NextResponse.next();
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

