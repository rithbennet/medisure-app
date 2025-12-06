"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	Building2,
	FilePlus2,
	FileText,
	History,
	LayoutDashboard,
	ChevronRight,
} from "lucide-react";

import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from "@/components/ui/sidebar";

type NavItem = {
	label: string;
	href: string;
	icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const coordinatorNavItems: NavItem[] = [
	{
		label: "Dashboard",
		href: "/dashboard",
		icon: LayoutDashboard,
	},
	{
		label: "New GL Request",
		href: "/gl/new",
		icon: FilePlus2,
	},
	{
		label: "Policy Library",
		href: "/policies",
		icon: FileText,
	},
	{
		label: "Insurer Review",
		href: "/insurer/gls",
		icon: Building2,
	},
	{
		label: "Activity Log",
		href: "/activity",
		icon: History,
	},
];

export function AppSidebar() {
	const pathname = usePathname();

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader className="border-b border-sidebar-border">
				<div className="flex items-center gap-2 px-2 py-2">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
						<span className="text-sm font-bold">M</span>
					</div>
					<div className="flex flex-col group-data-[collapsible=icon]:hidden">
						<span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/70">
							Medisure
						</span>
						<span className="text-sm font-semibold text-sidebar-foreground">
							Coordinator Portal
						</span>
					</div>
				</div>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>
						<span className="text-[10px] uppercase tracking-[0.15em]">
							Navigation
						</span>
					</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{coordinatorNavItems.map((item) => {
								const isActive =
									pathname === item.href ||
									(pathname?.startsWith(item.href) && item.href !== "/");

								const Icon = item.icon;

								return (
									<SidebarMenuItem key={item.href}>
										<SidebarMenuButton
											asChild
											isActive={isActive}
											tooltip={item.label}
										>
											<Link href={item.href}>
												<Icon className="h-4 w-4" />
												<span>{item.label}</span>
												{isActive && (
													<ChevronRight className="ml-auto h-4 w-4 opacity-50" />
												)}
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								);
							})}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter className="border-t border-sidebar-border">
				<div className="flex items-center gap-2 px-2 py-2">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
						<span className="text-xs font-medium">C</span>
					</div>
					<div className="flex flex-col group-data-[collapsible=icon]:hidden">
						<span className="text-[10px] uppercase tracking-[0.15em] text-sidebar-foreground/70">
							Role
						</span>
						<span className="text-sm font-medium text-sidebar-foreground">
							Coordinator
						</span>
					</div>
				</div>
			</SidebarFooter>

			<SidebarRail />
		</Sidebar>
	);
}

