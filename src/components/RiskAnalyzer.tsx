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

interface RiskAnalysis {
    risk?: "low" | "medium" | "high";
    score?: number;
    explanation?: string;
    factors?: string[];
    recommendation?: string;
}

interface RiskAnalyzerProps {
    provider: AIProvider;
    glId?: string;
}

export function RiskAnalyzer({ provider, glId }: RiskAnalyzerProps) {
    const [analysis, setAnalysis] = useState<RiskAnalysis | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [_rawStream, setRawStream] = useState("");

    const handleAnalyze = async () => {
        if (!glId) {
            setError("No GL ID provided. Create a GL request first.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setAnalysis(null);
        setRawStream("");

        try {
            const res = await fetch("/api/ai/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ glId, provider }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to analyze");
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
                setRawStream(accumulatedText);

                // Try to parse the accumulated JSON
                try {
                    const parsed = JSON.parse(accumulatedText);
                    setAnalysis(parsed);
                } catch {
                    // JSON not complete yet, try to extract partial data
                    try {
                        // Handle partial JSON streaming
                        const partialMatch = accumulatedText.match(/\{[\s\S]*$/);
                        if (partialMatch) {
                            const partial = partialMatch[0];
                            // Extract individual fields as they stream
                            const riskMatch = partial.match(
                                /"risk"\s*:\s*"(low|medium|high)"/,
                            );
                            const scoreMatch = partial.match(/"score"\s*:\s*(\d+)/);
                            const explanationMatch = partial.match(
                                /"explanation"\s*:\s*"([^"]*)/,
                            );

                            if (riskMatch || scoreMatch || explanationMatch) {
                                setAnalysis({
                                    risk: riskMatch?.[1] as "low" | "medium" | "high" | undefined,
                                    score: scoreMatch ? Number(scoreMatch[1]) : undefined,
                                    explanation: explanationMatch?.[1],
                                });
                            }
                        }
                    } catch {
                        // Ignore parsing errors for partial content
                    }
                }
            }

            // Final parse
            try {
                const finalAnalysis = JSON.parse(accumulatedText);
                setAnalysis(finalAnalysis);
            } catch {
                // Keep the partial analysis
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setIsLoading(false);
        }
    };

    const getRiskColor = (risk?: string) => {
        switch (risk) {
            case "low":
                return "text-green-600 bg-green-50 border-green-200";
            case "medium":
                return "text-yellow-600 bg-yellow-50 border-yellow-200";
            case "high":
                return "text-red-600 bg-red-50 border-red-200";
            default:
                return "text-gray-600 bg-gray-50 border-gray-200";
        }
    };

    return (
        <Card className="shadow-soft">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                    Risk Analyzer
                </CardTitle>
                <CardDescription>
                    Analyze a GL request for approval risk using {provider}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <p className="text-muted-foreground text-sm">
                            GL ID:{" "}
                            <code className="rounded bg-muted px-1 py-0.5 text-xs">
                                {glId || "Not set"}
                            </code>
                        </p>
                    </div>
                    <Button disabled={isLoading || !glId} onClick={handleAnalyze}>
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                Analyzing...
                            </span>
                        ) : (
                            "Analyze Risk"
                        )}
                    </Button>
                </div>

                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                        <p className="text-red-600 text-sm">{error}</p>
                    </div>
                )}

                {analysis && (
                    <div className="space-y-4">
                        {/* Risk Badge */}
                        {analysis.risk && (
                            <div
                                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 font-semibold ${getRiskColor(analysis.risk)}`}
                            >
                                <span className="text-sm uppercase tracking-wide">
                                    {analysis.risk} Risk
                                </span>
                                {analysis.score !== undefined && (
                                    <span className="rounded-full bg-white/50 px-2 py-0.5 text-xs">
                                        Score: {analysis.score}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Explanation */}
                        {analysis.explanation && (
                            <div className="rounded-lg border border-input bg-background p-4">
                                <h4 className="mb-2 font-medium text-foreground text-sm">
                                    Analysis
                                </h4>
                                <p className="text-muted-foreground text-sm">
                                    {analysis.explanation}
                                </p>
                            </div>
                        )}

                        {/* Factors */}
                        {analysis.factors && analysis.factors.length > 0 && (
                            <div className="rounded-lg border border-input bg-background p-4">
                                <h4 className="mb-2 font-medium text-foreground text-sm">
                                    Key Factors
                                </h4>
                                <ul className="list-inside list-disc space-y-1 text-muted-foreground text-sm">
                                    {analysis.factors.map((factor) => (
                                        <li key={factor}>{factor}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Recommendation */}
                        {analysis.recommendation && (
                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                                <h4 className="mb-1 font-medium text-blue-800 text-sm">
                                    Recommendation
                                </h4>
                                <p className="text-blue-700 text-sm">
                                    {analysis.recommendation}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {isLoading && !analysis && (
                    <div className="flex items-center justify-center py-8">
                        <div className="text-center">
                            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                            <p className="mt-2 text-muted-foreground text-sm">
                                Analyzing GL request...
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
