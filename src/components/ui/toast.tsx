"use client";

import { X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

type Toast = {
	id: string;
	title?: string;
	description?: string;
	variant?: "default" | "success" | "error";
};

type ToastContextType = {
	toasts: Toast[];
	addToast: (toast: Omit<Toast, "id">) => void;
	removeToast: (id: string) => void;
};

const ToastContext = React.createContext<ToastContextType | undefined>(
	undefined,
);

export function ToastProvider({ children }: { children: React.ReactNode }) {
	const [toasts, setToasts] = React.useState<Toast[]>([]);

	const addToast = React.useCallback((toast: Omit<Toast, "id">) => {
		const id = Math.random().toString(36).slice(2);
		setToasts((prev) => [...prev, { ...toast, id }]);

		// Auto-dismiss after 4 seconds
		setTimeout(() => {
			setToasts((prev) => prev.filter((t) => t.id !== id));
		}, 4000);
	}, []);

	const removeToast = React.useCallback((id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}, []);

	return (
		<ToastContext.Provider value={{ toasts, addToast, removeToast }}>
			{children}
			<ToastContainer removeToast={removeToast} toasts={toasts} />
		</ToastContext.Provider>
	);
}

export function useToast() {
	const context = React.useContext(ToastContext);
	if (!context) {
		throw new Error("useToast must be used within a ToastProvider");
	}
	return context;
}

function ToastContainer({
	toasts,
	removeToast,
}: {
	toasts: Toast[];
	removeToast: (id: string) => void;
}) {
	return (
		<div className="fixed right-4 bottom-4 z-50 flex flex-col gap-2">
			{toasts.map((toast) => (
				<div
					className={cn(
						"slide-in-from-right-full flex animate-in items-start gap-3 rounded-lg border px-4 py-3 shadow-lg transition-all",
						toast.variant === "success" &&
							"border-emerald-200 bg-emerald-50 text-emerald-900",
						toast.variant === "error" &&
							"border-red-200 bg-red-50 text-red-900",
						(!toast.variant || toast.variant === "default") &&
							"border-gray-200 bg-white text-gray-900",
					)}
					key={toast.id}
				>
					<div className="flex-1">
						{toast.title && (
							<p className="font-medium text-sm">{toast.title}</p>
						)}
						{toast.description && (
							<p className="text-muted-foreground text-sm">
								{toast.description}
							</p>
						)}
					</div>
					<button
						aria-label="Close toast"
						className="rounded p-0.5 hover:bg-black/5"
						onClick={() => removeToast(toast.id)}
						title="Close toast"
						type="button"
					>
						<X className="h-4 w-4" />
					</button>
				</div>
			))}
		</div>
	);
}
