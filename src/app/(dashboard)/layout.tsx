import type { ReactNode } from "react";

import { SidebarNav } from "@/components/layout/sidebar-nav";

type DashboardLayoutProps = {
	children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
	return (
		<div className="flex min-h-screen bg-[rgb(var(--background))] text-foreground">
			<aside className="hidden border-r border-gray-200 bg-gray-50/80 px-4 py-6 md:flex md:w-64 lg:w-72">
				<div className="flex h-full w-full flex-col">
					<div className="mb-8 px-1">
						<p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
							Medisure
						</p>
						<p className="mt-2 text-sm font-semibold text-gray-900">
							Coordinator Portal
						</p>
					</div>
					<SidebarNav />
					<div className="mt-auto pt-6">
						<div className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-xs text-muted-foreground shadow-soft">
							<p className="text-[10px] uppercase tracking-[0.25em] text-gray-500">
								Role
							</p>
							<p className="mt-1 text-sm font-medium text-gray-900">
								Coordinator
							</p>
						</div>
					</div>
				</div>
			</aside>
			<div className="flex min-h-screen flex-1 flex-col">
				<header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
					<div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
						<div className="flex items-center gap-2">
							<span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
								Medisure
							</span>
							<span className="hidden text-sm text-gray-500 sm:inline">
								Guarantee Letters
							</span>
						</div>
						<div className="flex items-center gap-3">
							<span className="hidden text-xs text-muted-foreground sm:inline">
								My role:
							</span>
							<span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-900 shadow-soft">
								Coordinator
							</span>
						</div>
					</div>
				</header>
				<main className="flex-1">
					<div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
						{children}
					</div>
				</main>
			</div>
		</div>
	);
}


