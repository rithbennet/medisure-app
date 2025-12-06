import type { ReactNode } from "react";

import { SidebarNav } from "@/components/layout/sidebar-nav";

type DashboardLayoutProps = {
	children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
	return (
		<div className="flex min-h-screen bg-[rgb(var(--background))] text-foreground">
			<aside className="hidden border-gray-200 border-r bg-gray-50/80 px-4 py-6 md:flex md:w-64 lg:w-72">
				<div className="flex h-full w-full flex-col">
					<div className="mb-8 px-1">
						<p className="font-semibold text-[11px] text-muted-foreground uppercase tracking-[0.3em]">
							Medisure
						</p>
						<p className="mt-2 font-semibold text-gray-900 text-sm">
							Coordinator Portal
						</p>
					</div>
					<SidebarNav />
					<div className="mt-auto pt-6">
						<div className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-muted-foreground text-xs shadow-soft">
							<p className="text-[10px] text-gray-500 uppercase tracking-[0.25em]">
								Role
							</p>
							<p className="mt-1 font-medium text-gray-900 text-sm">
								Coordinator
							</p>
						</div>
					</div>
				</div>
			</aside>
			<div className="flex min-h-screen flex-1 flex-col">
				<header className="border-gray-200 border-b bg-white/80 backdrop-blur-sm">
					<div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
						<div className="flex items-center gap-2">
							<span className="font-semibold text-[11px] text-muted-foreground uppercase tracking-[0.3em]">
								Medisure
							</span>
							<span className="hidden text-gray-500 text-sm sm:inline">
								Guarantee Letters
							</span>
						</div>
						<div className="flex items-center gap-3">
							<span className="hidden text-muted-foreground text-xs sm:inline">
								My role:
							</span>
							<span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-gray-900 text-xs shadow-soft">
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
