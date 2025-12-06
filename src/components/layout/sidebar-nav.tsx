"use client";

import {
	Building2,
	FileCheck,
	FilePlus2,
	FileText,
	History,
	LayoutDashboard,
	Stethoscope,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

const doctorNavItems: NavItem[] = [
	{
		label: "My Cases",
		href: "/doctor/cases",
		icon: Stethoscope,
	},
	{
		label: "My Reports",
		href: "/doctor/reports",
		icon: FileCheck,
	},
];

export function SidebarNav() {
	const pathname = usePathname();

	return (
		<nav className="flex flex-1 flex-col gap-1 text-sm">
			<p className="mb-2 px-2 font-medium text-[11px] text-muted-foreground uppercase tracking-[0.2em]">
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
								className={cn(
									"group flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground text-sm transition-all duration-150 hover:bg-gray-100",
									isActive &&
										"border border-gray-200 bg-white text-gray-900 shadow-soft",
								)}
								href={item.href}
							>
								<span
									className={cn(
										"flex h-8 w-8 items-center justify-center rounded-lg border border-transparent bg-gray-50 text-gray-500 transition-all duration-150 group-hover:bg-white group-hover:text-gray-900",
										isActive &&
											"border-blue-100 bg-blue-50 text-blue-600 group-hover:border-blue-200",
									)}
								>
									<Icon aria-hidden="true" className="h-4 w-4" />
								</span>
								<span className="font-medium">{item.label}</span>
							</Link>
						</li>
					);
				})}
			</ul>

			{/* Doctor Section */}
			<p className="mt-6 mb-2 px-2 font-medium text-[11px] text-muted-foreground uppercase tracking-[0.2em]">
				Doctor
			</p>
			<ul className="space-y-1">
				{doctorNavItems.map((item) => {
					const isActive =
						pathname === item.href ||
						(pathname?.startsWith(item.href) && item.href !== "/");

					const Icon = item.icon;

					return (
						<li key={item.label}>
							<Link
								className={cn(
									"group flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground text-sm transition-all duration-150 hover:bg-gray-100",
									isActive &&
										"border border-gray-200 bg-white text-gray-900 shadow-soft",
								)}
								href={item.href}
							>
								<span
									className={cn(
										"flex h-8 w-8 items-center justify-center rounded-lg border border-transparent bg-gray-50 text-gray-500 transition-all duration-150 group-hover:bg-white group-hover:text-gray-900",
										isActive &&
											"border-emerald-100 bg-emerald-50 text-emerald-600 group-hover:border-emerald-200",
									)}
								>
									<Icon aria-hidden="true" className="h-4 w-4" />
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
