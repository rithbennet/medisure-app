"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
	throw new Error("NEXT_PUBLIC_CONVEX_URL environment variable is not set");
}
const convex = new ConvexReactClient(convexUrl);

export function Providers({ children }: { children: ReactNode }) {
	return (
		<ConvexProvider client={convex}>
			<ToastProvider>{children}</ToastProvider>
		</ConvexProvider>
	);
}
