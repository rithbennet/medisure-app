"use client";

import {
	Building2,
	FilePlus2,
	FileText,
	History,
	LayoutDashboard,
	Stethoscope,
	Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type NavItem = {
	label: string;
	href: string;
	icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

type SidebarNavProps = {
	navRole?: "coordinator" | "doctor";
	heading?: string;
	items?: NavItem[];
};

const navByRole: Record<NonNullable<SidebarNavProps["navRole"]>, NavItem[]> = {
	coordinator: [
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
	],
	doctor: [
		{
			label: "Patients",
			href: "/doctor#patients",
			icon: Users,
		},
		{
			label: "Diagnosis",
			href: "/doctor#diagnosis",
			icon: Stethoscope,
		},
		{
			label: "Reports",
			href: "/doctor#reports",
			icon: FileText,
		},
	],
};

export function SidebarNav({
	navRole = "coordinator",
	heading,
	items,
}: SidebarNavProps) {
	const pathname = usePathname();
	const [hash, setHash] = useState<string>("");

	useEffect(() => {
		setHash(window.location.hash);
		const onHashChange = () => setHash(window.location.hash);
		window.addEventListener("hashchange", onHashChange);
		return () => window.removeEventListener("hashchange", onHashChange);
	}, []);

	const navItems = items ?? navByRole[navRole] ?? [];
	const headingText =
		heading ?? (navRole === "doctor" ? "Doctor" : "Coordinator");

	return (
		<nav className="flex flex-1 flex-col gap-1 text-sm">
			<p className="mb-2 px-2 font-medium text-[11px] text-muted-foreground uppercase tracking-[0.2em]">
				{headingText}
			</p>
			<ul className="space-y-1">
				{navItems.map((item) => {
					const [itemPath, itemHash] = item.href.split("#");
					const isHashLink = item.href.startsWith("#") || Boolean(itemHash);
					const isActive =
						(isHashLink && hash === `#${itemHash ?? ""}`) ||
						pathname === itemPath ||
						(pathname &&
							itemPath &&
							pathname.startsWith(itemPath) &&
							itemPath !== "/");

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
		</nav>
	);
}
