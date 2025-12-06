"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	Building2,
	FilePlus2,
	FileText,
	History,
	LayoutDashboard,
} from "lucide-react";

import { cn } from "@/lib/utils";

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

export function SidebarNav() {
	const pathname = usePathname();

	return (
		<nav className="flex flex-1 flex-col gap-1 text-sm">
			<p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
				Coordinator
			</p>
			<ul className="space-y-1">
				{coordinatorNavItems.map((item) => {
					const isActive =
						pathname === item.href ||
						(pathname?.startsWith(item.href) && item.href !== "/");

					const Icon = item.icon;

					return (
						<li key={item.href}>
							<Link
								href={item.href}
								className={cn(
									"group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all duration-150 hover:bg-gray-100",
									isActive &&
										"border border-gray-200 bg-white text-gray-900 shadow-soft"
								)}
							>
								<span
									className={cn(
										"flex h-8 w-8 items-center justify-center rounded-lg border border-transparent bg-gray-50 text-gray-500 transition-all duration-150 group-hover:bg-white group-hover:text-gray-900",
										isActive &&
											"border-blue-100 bg-blue-50 text-blue-600 group-hover:border-blue-200"
									)}
								>
									<Icon className="h-4 w-4" aria-hidden="true" />
								</span>
								<span className="font-medium">{item.label}</span>
							</Link>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}


