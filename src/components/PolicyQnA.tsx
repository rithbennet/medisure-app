"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { AIProvider } from "@/lib/aiProvider";

interface PolicyQnAProps {
	provider: AIProvider;
	policyId?: string;
}

const sampleQuestions = [
	"What is the waiting period for pre-existing conditions?",
	"Are outpatient procedures covered under this policy?",
	"What is the maximum coverage limit per claim?",
	"Is mental health treatment included in the coverage?",
	"How do I file an emergency claim?",
];

export function PolicyQnA({ provider, policyId }: PolicyQnAProps) {
	const [question, setQuestion] = useState("");
	const [answer, setAnswer] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleAsk = async (q?: string) => {
		const questionToAsk = q || question;
		if (!questionToAsk.trim()) return;

		setIsLoading(true);
		setError(null);
		setAnswer("");

		try {
			const res = await fetch("/api/ai/qna", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					policyId,
					question: questionToAsk,
					provider,
				}),
			});

			if (!res.ok) {
				const errorData = await res.json().catch(() => ({}));
				throw new Error(errorData.error || "Failed to get answer");
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
				setAnswer(accumulatedText);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unknown error");
		} finally {
			setIsLoading(false);
		}
	};

	const handleSampleQuestion = (q: string) => {
		setQuestion(q);
		handleAsk(q);
	};

	return (
		<Card className="shadow-soft">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<span className="inline-block h-2 w-2 rounded-full bg-purple-500" />
					Policy Q&A
				</CardTitle>
				<CardDescription>
					Ask questions about insurance policies using {provider}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Policy ID display */}
				<div className="rounded-lg border border-input bg-muted/30 p-3">
					<p className="text-muted-foreground text-xs">
						{policyId ? (
							<>
								Searching policy:{" "}
								<code className="rounded bg-muted px-1 py-0.5">{policyId}</code>
							</>
						) : (
							<>
								Using general insurance knowledge (no specific policy selected)
							</>
						)}
					</p>
				</div>

				{/* Sample questions */}
				<div className="space-y-2">
					<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
						Try a sample question
					</p>
					<div className="flex flex-wrap gap-2">
						{sampleQuestions.map((q) => (
							<button
								className="rounded-full border border-input bg-background px-3 py-1.5 text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
								disabled={isLoading}
								key={q}
								onClick={() => handleSampleQuestion(q)}
								type="button"
							>
								{q.length > 40 ? `${q.slice(0, 40)}...` : q}
							</button>
						))}
					</div>
				</div>

				{/* Question input */}
				<div className="space-y-2">
					<textarea
						className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
						disabled={isLoading}
						onChange={(e) => setQuestion(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								handleAsk();
							}
						}}
						placeholder="Ask a question about insurance policies..."
						rows={3}
						value={question}
					/>
					<Button
						className="w-full"
						disabled={isLoading || !question.trim()}
						onClick={() => handleAsk()}
					>
						{isLoading ? (
							<span className="flex items-center gap-2">
								<span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
								Thinking...
							</span>
						) : (
							"Ask Question"
						)}
					</Button>
				</div>

				{/* Error */}
				{error && (
					<div className="rounded-lg border border-red-200 bg-red-50 p-4">
						<p className="text-red-600 text-sm">{error}</p>
					</div>
				)}

				{/* Answer */}
				{answer && (
					<div className="rounded-lg border border-input bg-background p-4">
						<h4 className="mb-2 font-medium text-foreground text-sm">Answer</h4>
						<div className="prose prose-sm max-w-none text-muted-foreground">
							<p className="whitespace-pre-wrap">{answer}</p>
						</div>
					</div>
				)}

				{/* Loading state */}
				{isLoading && !answer && (
					<div className="flex items-center justify-center py-8">
						<div className="text-center">
							<div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
							<p className="mt-2 text-muted-foreground text-sm">
								Searching policy and generating answer...
							</p>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
