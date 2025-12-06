"use client";

import { useQuery } from "convex/react";
import {
    Activity,
    ArrowRight,
    BadgeCheck,
    ClipboardList,
    Sparkles,
    Stethoscope,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { api } from "../../../../convex/_generated/api";

type StatusTone = {
    label: string;
    className: string;
};

function getStatusTone(status?: string): StatusTone {
    const normalized = (status ?? "Unknown").toUpperCase();

    switch (normalized) {
        case "DOCTOR_DRAFT":
            return {
                label: "Doctor handoff",
                className: "bg-amber-50 text-amber-700 border-amber-200",
            };
        case "DRAFT":
            return {
                label: "Draft",
                className: "bg-gray-50 text-gray-700 border-gray-200",
            };
        case "PENDING":
        case "REVIEW":
            return {
                label: "Pending review",
                className: "bg-blue-50 text-blue-700 border-blue-200",
            };
        case "APPROVED":
            return {
                label: "Approved",
                className: "bg-emerald-50 text-emerald-700 border-emerald-200",
            };
        case "REJECTED":
        case "DENIED":
            return {
                label: "Rejected",
                className: "bg-red-50 text-red-700 border-red-200",
            };
        default:
            return {
                label: normalized,
                className: "bg-slate-50 text-slate-700 border-slate-200",
            };
    }
}

function formatCurrency(amount?: number) {
    if (amount === undefined || amount === null) return "—";
    return new Intl.NumberFormat("en-MY", {
        style: "currency",
        currency: "MYR",
        maximumFractionDigits: 0,
    }).format(amount);
}

function formatShortDate(timestamp?: number) {
    if (!timestamp) return "—";
    return new Intl.DateTimeFormat("en-MY", {
        month: "short",
        day: "numeric",
    }).format(timestamp);
}

export default function CoordinatorDashboardPage() {
    const glRequests = useQuery(api.glRequests.getGLRequests, {});
    const activity = useQuery(api.activityLogs.listActivity, {});

    const gls = glRequests ?? [];
    const activityItems = activity ?? [];

    const { total, doctorHandoffs, insurerQueue, approved } = useMemo(() => {
        const normalized = gls.map((gl) => ({
            status: (gl.status ?? "DRAFT").toUpperCase(),
        }));

        const totalCount = normalized.length;
        const handoffs = normalized.filter(
            (gl) => gl.status === "DOCTOR_DRAFT",
        ).length;
        const readyForInsurer = normalized.filter(
            (gl) =>
                !["APPROVED", "REJECTED"].includes(gl.status) &&
                gl.status !== "DOCTOR_DRAFT",
        ).length;
        const approvedCount = normalized.filter(
            (gl) => gl.status === "APPROVED",
        ).length;

        return {
            total: totalCount,
            doctorHandoffs: handoffs,
            insurerQueue: readyForInsurer,
            approved: approvedCount,
        };
    }, [gls]);

    const recentGLs = useMemo(
        () =>
            [...gls]
                .sort((a, b) => (b.creationTime ?? 0) - (a.creationTime ?? 0))
                .slice(0, 6),
        [gls],
    );

    const recentActivity = activityItems.slice(0, 5);

    return (
        <div className="space-y-6">
            <section>
                <Card className="border-0 bg-white shadow-soft-md">
                    <CardHeader className="gap-2">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="space-y-1">
                                <p className="text-muted-foreground text-xs uppercase tracking-[0.3em]">
                                    Coordinator workspace
                                </p>
                                <CardTitle className="font-serif text-2xl text-gray-900">
                                    Pre-Approval Command Center
                                </CardTitle>
                                <CardDescription className="text-muted-foreground">
                                    Triage doctor handoffs, validate pre-approval requests, and
                                    prepare submissions.
                                </CardDescription>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button asChild variant="outline">
                                    <Link href="/activity">
                                        <Activity className="mr-2 h-4 w-4" />
                                        Activity
                                    </Link>
                                </Button>
                                <Button asChild>
                                    <Link href="/gl/new">
                                        New pre-approval
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                </Card>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    {
                        label: "Open items",
                        value: total,
                        helper: "All pre-approval requests",
                        icon: ClipboardList,
                        tone: "text-blue-700 bg-blue-50",
                    },
                    {
                        label: "Doctor handoffs",
                        value: doctorHandoffs,
                        helper: "Need coordinator review",
                        icon: Stethoscope,
                        tone: "text-amber-700 bg-amber-50",
                    },
                    {
                        label: "Ready to submit",
                        value: insurerQueue,
                        helper: "Drafts & ready",
                        icon: Sparkles,
                        tone: "text-indigo-700 bg-indigo-50",
                    },
                    {
                        label: "Approved",
                        value: approved,
                        helper: "Insurer approved",
                        icon: BadgeCheck,
                        tone: "text-emerald-700 bg-emerald-50",
                    },
                ].map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <Card className="bg-white" key={stat.label}>
                            <CardContent className="flex items-center gap-4 p-4">
                                <div
                                    className={cn(
                                        "flex h-11 w-11 items-center justify-center rounded-xl",
                                        stat.tone,
                                    )}
                                >
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
                                        {stat.label}
                                    </p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-semibold text-2xl text-gray-900">
                                            {stat.value}
                                        </span>
                                        <span className="text-muted-foreground text-xs">
                                            {stat.helper}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </section>

            <section className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                <Card className="bg-white">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-gray-900 text-lg">
                            Pre-approval queue
                        </CardTitle>
                        <CardDescription>
                            Recent pre-approval requests from doctors and coordinators. Click
                            through to validate, analyse risk, and prepare for submission.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr] gap-3 border-gray-100 border-b pb-2 text-muted-foreground text-xs">
                            <p>Patient &amp; diagnosis</p>
                            <p>Insurer</p>
                            <p>Status</p>
                            <p className="text-right">Est. cost</p>
                        </div>
                        {recentGLs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-gray-200 border-dashed bg-gray-50 py-10 text-center text-muted-foreground">
                                <p className="font-medium text-gray-900">
                                    No pre-approval requests yet
                                </p>
                                <p className="max-w-md text-sm">
                                    Start a new pre-approval request or wait for a doctor handoff.
                                </p>
                            </div>
                        ) : (
                            <ul className="space-y-2">
                                {recentGLs.map((gl) => {
                                    const tone = getStatusTone(gl.status);
                                    return (
                                        <li
                                            className="grid grid-cols-[1.6fr_1fr_1fr_1fr] items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm"
                                            key={gl._id}
                                        >
                                            <div className="space-y-0.5">
                                                <p className="font-medium text-gray-900">
                                                    {gl.patientName || "Unnamed patient"}
                                                </p>
                                                <p className="line-clamp-1 text-muted-foreground text-xs">
                                                    {gl.diagnosis}
                                                </p>
                                            </div>
                                            <p className="text-gray-900 text-xs">{gl.insurerName}</p>
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={cn(
                                                        "inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold text-[11px]",
                                                        tone.className,
                                                    )}
                                                >
                                                    {tone.label}
                                                </span>
                                                <span className="text-[11px] text-muted-foreground">
                                                    {formatShortDate(gl.creationTime)}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-end gap-2">
                                                <span className="font-medium text-gray-900 text-sm">
                                                    {formatCurrency(gl.estimatedCost)}
                                                </span>
                                                <Button asChild size="sm" variant="ghost">
                                                    <Link href={`/gl/${gl._id}`}>
                                                        Open
                                                        <ArrowRight className="ml-1 h-3.5 w-3.5" />
                                                    </Link>
                                                </Button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <Card className="bg-white">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-gray-900 text-lg">
                                Action center
                            </CardTitle>
                            <CardDescription>
                                Quick access to create cases, triage handoffs, and manage
                                submissions.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {[
                                {
                                    title: "New pre-approval request",
                                    body: "Validate patient, policy, and diagnosis details for pre-approval.",
                                    href: "/gl/new",
                                    label: "Start request",
                                },
                                {
                                    title: "View policies",
                                    body: "Review payer plans and policy documents.",
                                    href: "/policies",
                                    label: "Policy library",
                                },
                            ].map((item) => (
                                <Link
                                    className={cn(
                                        "group block rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 transition",
                                        "hover:-translate-y-px hover:border-blue-100 hover:bg-white",
                                    )}
                                    href={item.href}
                                    key={item.href}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-gray-900">
                                                {item.title}
                                            </p>
                                            <p className="text-muted-foreground text-sm">
                                                {item.body}
                                            </p>
                                        </div>
                                        <span className="font-semibold text-blue-600 text-xs">
                                            {item.label}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="bg-white">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-gray-900 text-lg">Activity</CardTitle>
                            <CardDescription>
                                Latest actions across cases, submissions, and RFI responses.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {recentActivity.length === 0 ? (
                                <p className="text-muted-foreground text-sm">
                                    No activity yet. Create a pre-approval request or update a
                                    case status to see this populate.
                                </p>
                            ) : (
                                <ul className="space-y-3">
                                    {recentActivity.map((item) => (
                                        <li
                                            className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm"
                                            key={item._id}
                                        >
                                            <div className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-500" />
                                            <div className="space-y-0.5">
                                                <p className="font-medium text-gray-900">
                                                    {item.message}
                                                </p>
                                                <p className="text-muted-foreground text-xs">
                                                    {formatShortDate(item.createdAt)}
                                                </p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </section>

            <section>
                <Card className="bg-white">
                    <CardHeader>
                        <CardTitle className="text-gray-900 text-lg">
                            Doctor handoffs
                        </CardTitle>
                        <CardDescription>
                            Cases authored in the doctor workspace waiting for coordinator
                            triage.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {doctorHandoffs === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                No handoffs yet. Ask a doctor to submit a diagnosis to see the
                                flow.
                            </p>
                        ) : (
                            <ul className="space-y-2">
                                {gls
                                    .filter(
                                        (gl) => (gl.status ?? "").toUpperCase() === "DOCTOR_DRAFT",
                                    )
                                    .map((gl) => (
                                        <li
                                            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                                            key={gl._id}
                                        >
                                            <div className="space-y-0.5">
                                                <p className="font-medium text-gray-900">
                                                    {gl.patientName || "Unnamed patient"}
                                                </p>
                                                <p className="text-muted-foreground text-xs">
                                                    {gl.diagnosis}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-semibold text-[11px] text-amber-700">
                                                    Handoff
                                                </span>
                                                <Button asChild size="sm" variant="outline">
                                                    <Link href={`/gl/${gl._id}`}>
                                                        Triage
                                                        <ArrowRight className="ml-1 h-3.5 w-3.5" />
                                                    </Link>
                                                </Button>
                                            </div>
                                        </li>
                                    ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
