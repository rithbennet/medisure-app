"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";

interface DashboardContentProps {
	workosId: string;
	email: string;
	fullName: string;
}

// Stepper steps for different roles
const getStepsForRole = (role: string) => {
	switch (role) {
		case "coordinator":
			return ["Overview", "Pending Requests", "Approved", "Analytics"];
		case "doctor":
			return ["Patient List", "Pending Approvals", "Submit Request", "History"];
		case "insurance_agent":
			return ["Queue", "Under Review", "Decision", "Reports"];
		case "patient":
			return ["My Requests", "Status", "Documents", "History"];
		default:
			return ["Overview", "Requests", "Status", "History"];
	}
};

export function DashboardContent({
	workosId,
	email,
	fullName,
}: DashboardContentProps) {
	const [isInitializing, setIsInitializing] = useState(true);
	const [currentStep, setCurrentStep] = useState(0);
	const [selectedOption, setSelectedOption] = useState<string | null>(null);

	const getOrCreateUser = useMutation(api.users.getOrCreateWorkosUser);
	const userData = useQuery(api.users.getUserByWorkosId, { workosId });

	useEffect(() => {
		const initUser = async () => {
			try {
				await getOrCreateUser({
					workosId,
					email,
					fullName,
				});

				setIsInitializing(false);
			} catch (err) {
				console.error("Error initializing user:", err);
				setIsInitializing(false);
			}
		};

		initUser();
	}, [workosId, email, fullName, getOrCreateUser]);

	if (isInitializing || userData === undefined) {
		return (
			<main className="flex min-h-screen items-center justify-center bg-gray-50">
				<div className="flex items-center gap-3 text-gray-600">
					<svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
						<circle
							className="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							strokeWidth="4"
						/>
						<path
							className="opacity-75"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
							fill="currentColor"
						/>
					</svg>
					Loading...
				</div>
			</main>
		);
	}

	if (!userData) {
		return (
			<main className="flex min-h-screen items-center justify-center bg-gray-50">
				<div className="text-gray-600">Error loading user data</div>
			</main>
		);
	}

	const steps = getStepsForRole(userData.role);

	const getRoleColor = (role: string) => {
		switch (role) {
			case "coordinator":
				return "bg-purple-100 text-purple-700";
			case "doctor":
				return "bg-blue-100 text-blue-700";
			case "insurance_agent":
				return "bg-emerald-100 text-emerald-700";
			case "patient":
				return "bg-amber-100 text-amber-700";
			default:
				return "bg-gray-100 text-gray-700";
		}
	};

	const getRoleDisplayName = (role: string) => {
		switch (role) {
			case "coordinator":
				return "Coordinator";
			case "doctor":
				return "Healthcare Provider";
			case "insurance_agent":
				return "Insurance Agent";
			case "patient":
				return "Patient";
			default:
				return role;
		}
	};

	return (
		<main className="min-h-screen bg-gray-100">
			{/* Header */}
			<header className="bg-[#2563eb] text-white shadow-lg">
				<div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
							<svg
								className="h-6 w-6"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								viewBox="0 0 24 24"
							>
								<path
									d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						</div>
						<span className="font-semibold text-lg">PreApproval</span>
					</div>
					<h1 className="font-semibold text-lg">
						Insurance Preapproval Automation
					</h1>
					<a
						className="rounded-lg px-4 py-2 font-medium text-sm transition hover:bg-white/10"
						href="/auth/signout"
					>
						Sign Out
					</a>
				</div>
			</header>

			{/* Progress Stepper */}
			<div className="border-gray-200 border-b bg-white py-6">
				<div className="mx-auto max-w-4xl px-6">
					<div className="flex items-center justify-between">
						{steps.map((step, index) => (
							<div className="flex flex-1 items-center" key={step}>
								<button
									className="flex flex-col items-center gap-2"
									onClick={() => setCurrentStep(index)}
									type="button"
								>
									<div
										className={`flex h-8 w-8 items-center justify-center rounded-full border-2 font-semibold text-sm transition-all ${
											index < currentStep
												? "border-[#2563eb] bg-[#2563eb] text-white"
												: index === currentStep
													? "border-[#2563eb] bg-white text-[#2563eb] ring-4 ring-blue-100"
													: "border-gray-300 bg-white text-gray-400"
										}`}
									>
										{index < currentStep ? (
											<svg
												className="h-4 w-4"
												fill="currentColor"
												viewBox="0 0 20 20"
											>
												<path
													clipRule="evenodd"
													d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
													fillRule="evenodd"
												/>
											</svg>
										) : (
											index + 1
										)}
									</div>
									<span
										className={`font-medium text-xs ${
											index === currentStep ? "text-[#2563eb]" : "text-gray-500"
										}`}
									>
										{step}
									</span>
								</button>
								{index < steps.length - 1 && (
									<div
										className={`mx-2 h-0.5 flex-1 ${
											index < currentStep ? "bg-[#2563eb]" : "bg-gray-300"
										}`}
									/>
								)}
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Main Content */}
			<div className="mx-auto max-w-4xl px-6 py-10">
				<div className="rounded-2xl bg-white p-8 shadow-sm">
					{/* User Greeting & Role Badge */}
					<div className="mb-8 flex items-start justify-between">
						<div>
							<h2 className="font-bold text-2xl text-gray-900">
								Preapproval Dashboard for {userData.fullName}
							</h2>
							<div className="mt-2 h-1 w-12 rounded-full bg-amber-400" />
						</div>
						<span
							className={`rounded-full px-4 py-1.5 font-semibold text-sm ${getRoleColor(userData.role)}`}
						>
							{getRoleDisplayName(userData.role)}
						</span>
					</div>

					<p className="mb-6 text-gray-600">
						{userData.role === "patient"
							? "Track your insurance preapproval requests and submit new ones."
							: userData.role === "doctor"
								? "Submit preapproval requests for procedures and manage patient authorizations."
								: userData.role === "insurance_agent"
									? "Review and process pending preapproval requests efficiently."
									: "Monitor all preapproval activities and manage system operations."}
					</p>

					{/* Quick Stats */}
					<div className="mb-8 grid gap-4 sm:grid-cols-3">
						<div className="rounded-xl border border-gray-100 bg-gradient-to-br from-blue-50 to-white p-4">
							<div className="font-bold text-2xl text-[#2563eb]">12</div>
							<div className="text-gray-600 text-sm">Pending Requests</div>
						</div>
						<div className="rounded-xl border border-gray-100 bg-gradient-to-br from-emerald-50 to-white p-4">
							<div className="font-bold text-2xl text-emerald-600">8</div>
							<div className="text-gray-600 text-sm">Approved Today</div>
						</div>
						<div className="rounded-xl border border-gray-100 bg-gradient-to-br from-amber-50 to-white p-4">
							<div className="font-bold text-2xl text-amber-600">3</div>
							<div className="text-gray-600 text-sm">Needs Attention</div>
						</div>
					</div>

					<p className="mb-2 text-gray-500 text-sm">*Required fields</p>

					{/* Form Section */}
					<div className="mb-6">
						<label className="mb-4 block font-semibold text-base text-gray-900">
							Would you like to start a new preapproval request?*
						</label>
						<div className="space-y-3">
							<label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-4 transition hover:border-[#2563eb] hover:bg-blue-50/50">
								<input
									checked={selectedOption === "no"}
									className="h-5 w-5 border-gray-300 text-[#2563eb] focus:ring-[#2563eb]"
									name="newRequest"
									onChange={(e) => setSelectedOption(e.target.value)}
									type="radio"
									value="no"
								/>
								<span className="text-gray-700">
									No, view existing requests
								</span>
							</label>
							<label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-4 transition hover:border-[#2563eb] hover:bg-blue-50/50">
								<input
									checked={selectedOption === "yes"}
									className="h-5 w-5 border-gray-300 text-[#2563eb] focus:ring-[#2563eb]"
									name="newRequest"
									onChange={(e) => setSelectedOption(e.target.value)}
									type="radio"
									value="yes"
								/>
								<span className="text-gray-700">
									Yes, start a new preapproval request
								</span>
							</label>
						</div>
					</div>

					{/* Account Info */}
					<div className="mb-8 rounded-xl border border-gray-100 bg-gray-50 p-6">
						<h3 className="mb-4 font-semibold text-base text-gray-900">
							Account Information
						</h3>
						<dl className="grid gap-4 sm:grid-cols-2">
							<div>
								<dt className="text-gray-500 text-sm">Full Name</dt>
								<dd className="mt-1 font-medium text-gray-900">
									{userData.fullName}
								</dd>
							</div>
							<div>
								<dt className="text-gray-500 text-sm">Email</dt>
								<dd className="mt-1 font-medium text-gray-900">
									{userData.email}
								</dd>
							</div>
							<div>
								<dt className="text-gray-500 text-sm">IC Number</dt>
								<dd className="mt-1 font-medium font-mono text-gray-900">
									{userData.icNumber || "Not set"}
								</dd>
							</div>
							<div>
								<dt className="text-gray-500 text-sm">Member Since</dt>
								<dd className="mt-1 font-medium text-gray-900">
									{new Date(userData.createdAt).toLocaleDateString("en-US", {
										year: "numeric",
										month: "long",
										day: "numeric",
									})}
								</dd>
							</div>
						</dl>
					</div>

					{/* Divider */}
					<hr className="mb-6 border-gray-200" />

					{/* Navigation Buttons */}
					<div className="flex items-center justify-between">
						<button
							className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 font-semibold text-gray-700 text-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
							disabled={currentStep === 0}
							onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
							type="button"
						>
							Previous
						</button>
						<button
							className="rounded-lg bg-[#2563eb] px-6 py-2.5 font-semibold text-sm text-white transition hover:bg-[#1d4ed8]"
							onClick={() =>
								setCurrentStep(Math.min(steps.length - 1, currentStep + 1))
							}
							type="button"
						>
							Continue
						</button>
					</div>
				</div>
			</div>

			{/* Footer area with subtle branding */}
			<div className="mx-auto max-w-4xl px-6 pb-8 text-center text-gray-400 text-sm">
				Powered by PreApproval Automation System
			</div>
		</main>
	);
}
