"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
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

export function DashboardContent({ workosId, email, fullName }: DashboardContentProps) {
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
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
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
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-lg font-semibold">PreApproval</span>
          </div>
          <h1 className="text-lg font-semibold">Insurance Preapproval Automation</h1>
          <a
            href="/auth/signout"
            className="rounded-lg px-4 py-2 text-sm font-medium transition hover:bg-white/10"
          >
            Sign Out
          </a>
        </div>
      </header>

      {/* Progress Stepper */}
      <div className="border-b border-gray-200 bg-white py-6">
        <div className="mx-auto max-w-4xl px-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step} className="flex flex-1 items-center">
                <button
                  onClick={() => setCurrentStep(index)}
                  className="flex flex-col items-center gap-2"
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all ${
                      index < currentStep
                        ? "border-[#2563eb] bg-[#2563eb] text-white"
                        : index === currentStep
                        ? "border-[#2563eb] bg-white text-[#2563eb] ring-4 ring-blue-100"
                        : "border-gray-300 bg-white text-gray-400"
                    }`}
                  >
                    {index < currentStep ? (
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium ${
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
              <h2 className="text-2xl font-bold text-gray-900">
                Preapproval Dashboard for {userData.fullName}
              </h2>
              <div className="mt-2 h-1 w-12 rounded-full bg-amber-400" />
            </div>
            <span className={`rounded-full px-4 py-1.5 text-sm font-semibold ${getRoleColor(userData.role)}`}>
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
              <div className="text-2xl font-bold text-[#2563eb]">12</div>
              <div className="text-sm text-gray-600">Pending Requests</div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-emerald-50 to-white p-4">
              <div className="text-2xl font-bold text-emerald-600">8</div>
              <div className="text-sm text-gray-600">Approved Today</div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-amber-50 to-white p-4">
              <div className="text-2xl font-bold text-amber-600">3</div>
              <div className="text-sm text-gray-600">Needs Attention</div>
            </div>
          </div>

          <p className="mb-2 text-sm text-gray-500">*Required fields</p>

          {/* Form Section */}
          <div className="mb-6">
            <label className="mb-4 block text-base font-semibold text-gray-900">
              Would you like to start a new preapproval request?*
            </label>
            <div className="space-y-3">
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-4 transition hover:border-[#2563eb] hover:bg-blue-50/50">
                <input
                  type="radio"
                  name="newRequest"
                  value="no"
                  checked={selectedOption === "no"}
                  onChange={(e) => setSelectedOption(e.target.value)}
                  className="h-5 w-5 border-gray-300 text-[#2563eb] focus:ring-[#2563eb]"
                />
                <span className="text-gray-700">No, view existing requests</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-4 transition hover:border-[#2563eb] hover:bg-blue-50/50">
                <input
                  type="radio"
                  name="newRequest"
                  value="yes"
                  checked={selectedOption === "yes"}
                  onChange={(e) => setSelectedOption(e.target.value)}
                  className="h-5 w-5 border-gray-300 text-[#2563eb] focus:ring-[#2563eb]"
                />
                <span className="text-gray-700">Yes, start a new preapproval request</span>
              </label>
            </div>
          </div>

          {/* Account Info */}
          <div className="mb-8 rounded-xl border border-gray-100 bg-gray-50 p-6">
            <h3 className="mb-4 text-base font-semibold text-gray-900">Account Information</h3>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-gray-500">Full Name</dt>
                <dd className="mt-1 font-medium text-gray-900">{userData.fullName}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Email</dt>
                <dd className="mt-1 font-medium text-gray-900">{userData.email}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">IC Number</dt>
                <dd className="mt-1 font-mono font-medium text-gray-900">{userData.icNumber || "Not set"}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Member Since</dt>
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
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
              className="rounded-lg bg-[#2563eb] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
            >
              Continue
            </button>
          </div>
        </div>
      </div>

      {/* Footer area with subtle branding */}
      <div className="mx-auto max-w-4xl px-6 pb-8 text-center text-sm text-gray-400">
        Powered by PreApproval Automation System
      </div>
    </main>
  );
}
