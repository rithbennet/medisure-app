"use client";

import type { ReactNode } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

import { env } from "@/env";

const convexClient = new ConvexReactClient(env.NEXT_PUBLIC_CONVEX_URL);

type ConvexClientProviderProps = {
	children: ReactNode;
};

export function ConvexClientProvider({ children }: ConvexClientProviderProps) {
	return <ConvexProvider client={convexClient}>{children}</ConvexProvider>;
}


