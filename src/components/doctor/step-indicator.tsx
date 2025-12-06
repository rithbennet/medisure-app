"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = {
	id: string;
	label: string;
	href?: string;
};

type StepIndicatorProps = {
	steps: Step[];
	currentStep: number;
};

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
	return (
		<nav aria-label="Progress" className="mb-8">
			<ol className="flex items-center">
				{steps.map((step, index) => {
					const isCompleted = index < currentStep;
					const isCurrent = index === currentStep;
					const isLast = index === steps.length - 1;

					return (
						<li
							className={cn("relative", !isLast && "flex-1 pr-8 sm:pr-20")}
							key={step.id}
						>
							<div className="flex items-center">
								<div
									className={cn(
										"relative flex h-8 w-8 items-center justify-center rounded-full border-2 font-medium text-sm transition-colors",
										isCompleted &&
											"border-emerald-600 bg-emerald-600 text-white",
										isCurrent && "border-blue-600 bg-blue-600 text-white",
										!isCompleted &&
											!isCurrent &&
											"border-gray-300 bg-white text-gray-500",
									)}
								>
									{isCompleted ? (
										<Check className="h-4 w-4" />
									) : (
										<span>{index + 1}</span>
									)}
								</div>
								<span
									className={cn(
										"ml-3 font-medium text-sm",
										isCurrent && "text-blue-600",
										isCompleted && "text-emerald-600",
										!isCompleted && !isCurrent && "text-gray-500",
									)}
								>
									{step.label}
								</span>
							</div>
							{!isLast && (
								<div
									aria-hidden="true"
									className={cn(
										"-ml-px absolute top-4 left-4 mt-0.5 h-0.5 w-full",
										isCompleted ? "bg-emerald-600" : "bg-gray-200",
									)}
								/>
							)}
						</li>
					);
				})}
			</ol>
		</nav>
	);
}
