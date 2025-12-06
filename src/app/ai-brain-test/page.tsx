"use client";

import { useState } from "react";
import { PolicyQnA } from "@/components/PolicyQnA";
import { RiskAnalyzer } from "@/components/RiskAnalyzer";
import { RuleEnginePanel } from "@/components/RuleEnginePanel";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AIProvider } from "@/lib/aiProvider";

export default function AIBrainTestPage() {
	const [provider, setProvider] = useState<AIProvider>("gemini");
	const [activeTab, setActiveTab] = useState("simple");

	// Simple test state
	const [prompt, setPrompt] = useState(
		"Write a haiku about artificial intelligence.",
	);
	const [response, setResponse] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Demo data state
	const [demoGlId, setDemoGlId] = useState<string | null>(null);
	const [demoPolicyId, setDemoPolicyId] = useState<string | null>(null);
	const [isCreatingDemo, setIsCreatingDemo] = useState(false);

	const handleTest = async () => {
		setIsLoading(true);
		setError(null);
		setResponse("");

		try {
			const res = await fetch("/api/ai/test", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ prompt, provider }),
			});

			if (!res.ok) {
				const errorData = await res.json().catch(() => ({}));
				throw new Error(errorData.error || "Failed to get response");
			}

			const reader = res.body?.getReader();
			const decoder = new TextDecoder();

			if (!reader) {
				throw new Error("No response body");
			}

			let accumulatedText = "";

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value, { stream: true });
				accumulatedText += chunk;
				setResponse(accumulatedText);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unknown error");
		} finally {
			setIsLoading(false);
		}
	};

	const handleCreateDemoData = async () => {
		setIsCreatingDemo(true);
		setError(null);

		try {
			// Create demo data via API
			const res = await fetch("/api/ai/demo-data", {
				method: "POST",
			});

			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.error || "Failed to create demo data");
			}

			const data = await res.json();
			setDemoPolicyId(data.policyId);
			setDemoGlId(data.glId);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to create demo data",
			);
		} finally {
			setIsCreatingDemo(false);
		}
	};

	return (
		<div className="min-h-screen bg-linear-to-b from-gray-50 to-white">
			{/* Header */}
			<div className="border-gray-200 border-b bg-white/80 backdrop-blur-sm">
				<div className="mx-auto max-w-6xl px-6 py-6">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-purple-600">
							<span className="font-bold text-white">AI</span>
						</div>
						<div>
							<h1 className="font-semibold text-gray-900 text-xl">
								AI Brain Test Page
							</h1>
							<p className="text-gray-500 text-sm">
								Test AI SDK v5 with Gemini and Anthropic providers + Convex
								integration
							</p>
						</div>
					</div>
				</div>
			</div>

			<div className="mx-auto max-w-6xl space-y-6 p-6">
				{/* Provider Selection */}
				<Card className="shadow-soft">
					<CardHeader className="pb-3">
						<CardTitle className="text-base">Provider Selection</CardTitle>
						<CardDescription>Choose which AI provider to test</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex gap-3">
							<Button
								disabled={isLoading || isCreatingDemo}
								onClick={() => setProvider("gemini")}
								size="sm"
								variant={provider === "gemini" ? "default" : "outline"}
							>
								<span className="mr-2 h-2 w-2 rounded-full bg-blue-400" />
								Gemini
							</Button>
							<Button
								disabled={isLoading || isCreatingDemo}
								onClick={() => setProvider("anthropic")}
								size="sm"
								variant={provider === "anthropic" ? "default" : "outline"}
							>
								<span className="mr-2 h-2 w-2 rounded-full bg-orange-400" />
								Anthropic
							</Button>
						</div>
						<p className="mt-3 text-gray-500 text-xs">
							Currently using:{" "}
							<span className="font-medium text-gray-700">{provider}</span>
						</p>
					</CardContent>
				</Card>

				{/* Main Tabs */}
				<Tabs onValueChange={setActiveTab} value={activeTab}>
					<TabsList className="grid w-full grid-cols-4">
						<TabsTrigger value="simple">Simple Test</TabsTrigger>
						<TabsTrigger value="risk">Risk Analyzer</TabsTrigger>
						<TabsTrigger value="qna">Policy Q&A</TabsTrigger>
						<TabsTrigger value="rules">Rule Engine</TabsTrigger>
					</TabsList>

					{/* Simple Test Tab */}
					<TabsContent className="space-y-4" value="simple">
						<Card className="shadow-soft">
							<CardHeader>
								<CardTitle>Simple AI Test</CardTitle>
								<CardDescription>
									Basic streaming text generation test
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<textarea
									className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
									disabled={isLoading}
									onChange={(e) => setPrompt(e.target.value)}
									placeholder="Enter your test prompt here..."
									rows={4}
									value={prompt}
								/>
								<Button
									disabled={isLoading || !prompt.trim()}
									onClick={handleTest}
								>
									{isLoading ? "Testing..." : "Test AI Provider"}
								</Button>
							</CardContent>
						</Card>

						{error && activeTab === "simple" && (
							<Card className="border-red-200 shadow-soft">
								<CardContent className="pt-6">
									<p className="text-red-600 text-sm">{error}</p>
								</CardContent>
							</Card>
						)}

						{response && (
							<Card className="shadow-soft">
								<CardHeader>
									<CardTitle className="text-base">AI Response</CardTitle>
									<CardDescription>
										Streaming response from {provider}
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="rounded-lg border border-input bg-gray-50 p-4">
										<p className="whitespace-pre-wrap text-gray-700 text-sm">
											{response}
										</p>
									</div>
								</CardContent>
							</Card>
						)}
					</TabsContent>

					{/* Risk Analyzer Tab */}
					<TabsContent className="space-y-4" value="risk">
						{/* Demo Data Section */}
						<Card className="border-dashed shadow-soft">
							<CardHeader className="pb-3">
								<CardTitle className="text-base">Demo Data</CardTitle>
								<CardDescription>
									Create sample policy and GL request for testing
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="flex items-center gap-4">
									<Button
										disabled={isCreatingDemo}
										onClick={handleCreateDemoData}
										size="sm"
										variant="outline"
									>
										{isCreatingDemo ? (
											<span className="flex items-center gap-2">
												<span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
												Creating...
											</span>
										) : (
											"Create Demo Data"
										)}
									</Button>
									{demoGlId && (
										<p className="text-green-600 text-xs">
											✓ Demo data created
										</p>
									)}
								</div>
								{demoGlId && (
									<div className="rounded-lg bg-gray-50 p-3 text-xs">
										<p className="text-gray-600">
											<strong>GL ID:</strong>{" "}
											<code className="rounded bg-gray-200 px-1 py-0.5">
												{demoGlId}
											</code>
										</p>
										<p className="mt-1 text-gray-600">
											<strong>Policy ID:</strong>{" "}
											<code className="rounded bg-gray-200 px-1 py-0.5">
												{demoPolicyId}
											</code>
										</p>
									</div>
								)}
							</CardContent>
						</Card>

						<RiskAnalyzer glId={demoGlId || undefined} provider={provider} />
					</TabsContent>

					{/* Q&A Tab */}
					<TabsContent className="space-y-4" value="qna">
						{/* Policy Selection Info */}
						{demoPolicyId && (
							<Card className="border-dashed shadow-soft">
								<CardContent className="py-4">
									<p className="text-gray-500 text-xs">
										Using demo policy:{" "}
										<code className="rounded bg-gray-100 px-1 py-0.5">
											{demoPolicyId}
										</code>
									</p>
								</CardContent>
							</Card>
						)}

						<PolicyQnA
							policyId={demoPolicyId || undefined}
							provider={provider}
						/>
					</TabsContent>

					{/* Rule Engine + Final Report Tab */}
					<TabsContent className="space-y-4" value="rules">
						{/* Demo Data Reminder */}
						<Card className="border-purple-200 border-dashed bg-purple-50/50 shadow-soft">
							<CardHeader className="pb-3">
								<CardTitle className="text-base text-purple-900">
									Rule-Adherent Risk Engine
								</CardTitle>
								<CardDescription className="text-purple-700">
									Full pipeline: Document Ingestion (Gemini) → Rule Evaluation →
									Final Report (Claude)
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								{!demoGlId ? (
									<div className="flex items-center gap-4">
										<Button
											disabled={isCreatingDemo}
											onClick={handleCreateDemoData}
											size="sm"
											variant="default"
										>
											{isCreatingDemo ? (
												<span className="flex items-center gap-2">
													<span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
													Creating...
												</span>
											) : (
												"Create Demo Data First"
											)}
										</Button>
										<p className="text-purple-600 text-xs">
											Demo data required to run the full pipeline
										</p>
									</div>
								) : (
									<div className="rounded-lg bg-white/80 p-3 text-xs">
										<p className="text-purple-600">
											<strong>GL ID:</strong>{" "}
											<code className="rounded bg-purple-100 px-1 py-0.5">
												{demoGlId}
											</code>
										</p>
										<p className="mt-1 text-purple-600">
											<strong>Policy ID:</strong>{" "}
											<code className="rounded bg-purple-100 px-1 py-0.5">
												{demoPolicyId}
											</code>
										</p>
									</div>
								)}
							</CardContent>
						</Card>

						<RuleEnginePanel
							glId={demoGlId || undefined}
							policyId={demoPolicyId || undefined}
						/>
					</TabsContent>
				</Tabs>

				{/* Global Error Display */}
				{error && activeTab !== "simple" && (
					<Card className="border-red-200 shadow-soft">
						<CardContent className="pt-6">
							<p className="text-red-600 text-sm">{error}</p>
						</CardContent>
					</Card>
				)}

				{/* Footer Info */}
				<div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 text-center text-gray-500 text-xs">
					<p>
						AI Brain integrates <strong>AI SDK v5</strong> with{" "}
						<strong>Convex</strong> for vector search and real-time data.{" "}
						<strong>Gemini</strong> handles document parsing and clause
						extraction. <strong>Claude</strong> generates rule-adherent risk
						assessments.
					</p>
				</div>
			</div>
		</div>
	);
}
