import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

import { GlForm } from "@/features/gl/GlForm";

export default function NewGLPage() {
	return (
		<div className="space-y-6">
			<section>
				<Card className="bg-white shadow-soft-md">
					<CardHeader>
						<p className="text-muted-foreground text-xs uppercase tracking-[0.3em]">
							New Request
						</p>
						<CardTitle className="text-gray-900 text-section-title">
							New Guarantee Letter
						</CardTitle>
						<CardDescription className="text-muted-foreground text-sm">
							Capture patient, policy, diagnosis, and cost details. The AI
							engine will analyse risk and suggest justification language.
						</CardDescription>
					</CardHeader>
				</Card>
			</section>

			<section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
				<Card className="bg-white">
					<CardHeader>
						<CardTitle className="text-card-title text-gray-900">
							Patient &amp; Policy
						</CardTitle>
						<CardDescription>
							Coordinator-facing fields for patient identity and policy
							matching.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<GlForm />
					</CardContent>
				</Card>

				<Card className="bg-white lg:sticky lg:top-4">
					<CardHeader>
						<CardTitle className="text-card-title text-gray-900">
							Risk analysis
						</CardTitle>
						<CardDescription>
							AI-predicted risk band and explanation appear here after analysis.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-3 text-muted-foreground text-sm">
							<p>
								The risk panel will show a coloured band (Green / Amber / Red),
								short reason, and links to policy clauses.
							</p>
							<p className="text-xs">
								Once the backend is wired, this card will update automatically
								when the coordinator runs an analysis.
							</p>
						</div>
					</CardContent>
				</Card>
			</section>
		</div>
	);
}
