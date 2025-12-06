import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

type GLDetailPageProps = {
	params: Promise<{
		id: string;
	}>;
};

export default async function GLDetailPage({ params }: GLDetailPageProps) {
	const { id } = await params;

	return (
		<div className="space-y-6">
			<section>
				<Card className="bg-white shadow-soft-md">
					<CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<div className="space-y-1.5">
							<p className="text-muted-foreground text-xs uppercase tracking-[0.3em]">
								Guarantee Letter
							</p>
							<CardTitle className="text-gray-900 text-section-title">
								GL #{id}
							</CardTitle>
							<CardDescription className="text-muted-foreground text-sm">
								Edit the request, review AI risk analysis, and generate an
								explanation letter.
							</CardDescription>
						</div>
						<div className="flex flex-wrap gap-2 text-muted-foreground text-xs">
							<span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1">
								Status: <span className="font-medium text-gray-900">Draft</span>
							</span>
							<span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1">
								Risk band:{" "}
								<span className="font-medium text-gray-900">TBD</span>
							</span>
						</div>
					</CardHeader>
				</Card>
			</section>

			<section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
				<Card className="bg-white">
					<CardHeader>
						<CardTitle className="text-card-title text-gray-900">
							Request details
						</CardTitle>
						<CardDescription>
							The same smart GL form from creation will appear here, prefilled
							with this request.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground text-sm">
							This is a placeholder layout. In later steps, it will be wired to
							Convex data and the shared `GLFormFields` component.
						</p>
					</CardContent>
				</Card>

				<Card className="bg-white lg:sticky lg:top-4">
					<CardHeader>
						<CardTitle className="text-card-title text-gray-900">
							Risk &amp; actions
						</CardTitle>
						<CardDescription>
							Displays AI risk band, reasons, and actions like letter generation
							and outcome simulation.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground text-sm">
							This panel will host the `RiskResultPanel`, letter generator, and
							insurer outcome controls, styled consistently with the rest of the
							dashboard.
						</p>
					</CardContent>
				</Card>
			</section>
		</div>
	);
}
