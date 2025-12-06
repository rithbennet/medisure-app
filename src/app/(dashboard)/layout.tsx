import type { ReactNode } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

type DashboardLayoutProps = {
	children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<header className="flex h-14 shrink-0 items-center gap-2 border-b border-gray-200 bg-white/80 backdrop-blur-sm transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
					<div className="flex items-center gap-2 px-4">
						<SidebarTrigger className="-ml-1" />
						<Separator orientation="vertical" className="mr-2 h-4" />
						<div className="flex items-center gap-2">
							<span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground md:hidden">
								Medisure
							</span>
							<span className="hidden text-sm text-gray-500 md:inline">
								Guarantee Letters
							</span>
						</div>
					</div>
					<div className="ml-auto flex items-center gap-3 px-4">
						<span className="hidden text-xs text-muted-foreground sm:inline">
							My role:
						</span>
						<span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-900 shadow-soft">
							Coordinator
						</span>
					</div>
				</header>
				<main className="flex-1">
					<div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
						{children}
					</div>
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
