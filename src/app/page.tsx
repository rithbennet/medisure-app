import { getSignUpUrl, withAuth } from "@workos-inc/authkit-nextjs";
import Image from "next/image";
import Link from "next/link";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const problemBullets = [
	"99% of specialists face insurer/TPA interference in clinical decisions (CodeBlue 2025).",
	"GL approvals often take 24–48 hours via fax or email.",
	"GLs are sometimes revoked after surgery, causing financial disputes.",
];

const benefits = [
	{
		title: "Auto-GL Risk Analysis",
		description: "Instantly flags high-risk cases and pre-existing condition issues.",
	},
	{
		title: "Policy Intelligence (RAG)",
		description:
			"Reads insurer policy PDFs and answers coverage questions on demand.",
	},
	{
		title: "Smart Forms & Letters",
		description: "Auto-fills GL forms and drafts doctor justification letters.",
	},
];

const demoRoles = [
	{ label: "Enter as GL Coordinator", variant: "default" as const },
	{ label: "Enter as Doctor", variant: "secondary" as const },
	{ label: "Enter as Insurer", variant: "secondary" as const },
];

const howItWorks = [
	{
		title: "Fill GL Form",
		body: "Diagnosis, symptom date, treatment details.",
	},
	{
		title: "AI Risk Assessment",
		body: "Predicts approval probability + reason.",
	},
	{
		title: "Submit / Simulate",
		body: "Approve, request more info, or reject (demo mode).",
	},
];

const techStack = ["Next.js", "Convex", "OpenAI", "Vector Search"];

export default async function HomePage() {
	const { user } = await withAuth();
	const signUpUrl = await getSignUpUrl();

	return (
		<div className="min-h-screen bg-gray-50 text-foreground">
			<header className="absolute top-0 left-0 right-0 z-50 bg-transparent">
				<div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
					<div className="flex items-center gap-3">
						<Image
							alt="Medisure GL logo"
							className="h-10 w-auto"
							height={40}
							priority
							src="/logo.png"
							width={120}
						/>
					</div>
					<nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
						{user ? (
							<Link className="transition-colors hover:text-foreground" href="/dashboard">
								Dashboard
							</Link>
						) : (
							<Link className="transition-colors hover:text-foreground" href="#hero">
								Dashboard
							</Link>
						)}
						<Link className="transition-colors hover:text-foreground" href="#benefits">
							Policies
						</Link>
						<Link className="transition-colors hover:text-foreground" href="#demo">
							Insurer Portal
						</Link>
					</nav>
					{user ? (
						<Button className="hidden md:inline-flex" size={"sm" as const} asChild>
							<Link href="/dashboard">
								Go to Dashboard
							</Link>
						</Button>
					) : (
						<Button className="hidden md:inline-flex" size={"sm" as const} asChild>
							<Link href={signUpUrl}>
								Enter Demo
							</Link>
						</Button>
					)}
				</div>
			</header>

			<main>
				<section
					className="relative overflow-hidden gradient-purple"
					id="hero"
				>
					<div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 pt-32 pb-20 text-center">
						<h1 className="text-hero text-gray-900 tracking-tight">
							Radically faster GL processing
						</h1>
						<div className="space-y-2 text-lg text-muted-foreground">
							<p>
								Apply AI to cut Guarantee Letter processing from{" "}
								<span className="line-through">48 hours</span> →{" "}
								<span className="font-semibold text-blue-600">60 seconds</span>.
							</p>
							<p>
								Medisure reads policy PDFs, predicts rejection risk, and drafts
								justification letters instantly.
							</p>
						</div>
						<div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
							{user ? (
								<Button size={"lg" as const} asChild>
									<Link href="/dashboard">
										Go to Dashboard
									</Link>
								</Button>
							) : (
								<Button size={"lg" as const} asChild>
									<Link href={signUpUrl}>
										Cut GL processing from 48 hours to 60 seconds — try it now
									</Link>
								</Button>
							)}
							<Button size={"lg" as const} variant="secondary" asChild>
								<Link href="#demo">
									View Insurer Portal
								</Link>
							</Button>
						</div>
						<p className="text-xs text-muted-foreground">
							Demo only — no real patient data.
						</p>
					</div>
				</section>

				<section
					className="mx-auto max-w-5xl px-6 py-16"
					id="problem"
				>
					<div className="mb-8 space-y-4">
						<p className="uppercase text-xs tracking-widest text-muted-foreground">
							The Problem
						</p>
						<h2 className="text-section-title max-w-3xl text-gray-900">
							The GL process in Malaysia is slow, manual, and unpredictable.
						</h2>
					</div>
					<Card className="bg-white shadow-soft-md">
						<CardContent className="space-y-4 p-6 text-base text-muted-foreground">
							{problemBullets.map((item) => (
								<div className="flex gap-3" key={item}>
									<div className="mt-1 h-2 w-2 rounded-full bg-blue-600" />
									<p>{item}</p>
								</div>
							))}
						</CardContent>
					</Card>
				</section>

				<section
					className="bg-white/70 py-16"
					id="benefits"
				>
					<div className="mx-auto flex max-w-5xl flex-col gap-10 px-6">
						<div className="space-y-4 text-center">
							<p className="uppercase text-xs tracking-widest text-muted-foreground">
								What Medisure Does
							</p>
							<h2 className="text-section-title text-gray-900">
								Three simple ways Medisure automates GL work
							</h2>
						</div>
						<div className="grid gap-6 md:grid-cols-3">
							{benefits.map((benefit) => (
								<Card className="h-full shadow-soft" key={benefit.title}>
									<CardHeader>
										<CardTitle className="text-card-title text-gray-900">
											{benefit.title}
										</CardTitle>
									</CardHeader>
									<CardContent>
										<CardDescription className="text-base text-muted-foreground">
											{benefit.description}
										</CardDescription>
									</CardContent>
								</Card>
							))}
						</div>
					</div>
				</section>

				<section
					className="bg-gradient-to-b from-gray-50 to-blue-50 px-6 py-16"
					id="demo"
				>
					<div className="mx-auto flex max-w-4xl flex-col gap-10 text-center">
						<div className="space-y-4">
							<p className="uppercase text-xs tracking-widest text-muted-foreground">
								Demo Entry Paths
							</p>
							<h2 className="text-section-title text-gray-900">
								Choose how you enter the Medisure demo
							</h2>
						</div>
						<div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
							{demoRoles.map((role) => (
								<Button
									className="flex-1"
									key={role.label}
									size={"lg" as const}
									variant={role.variant}
									asChild
								>
									<Link href={user ? "/dashboard" : signUpUrl}>
										{role.label}
									</Link>
								</Button>
							))}
						</div>
						<p className="text-sm text-muted-foreground">
							{user ? "Welcome back!" : "No login required."}
						</p>
					</div>
				</section>

				<section className="bg-white px-6 py-16">
					<div className="mx-auto flex max-w-5xl flex-col gap-10">
						<div className="space-y-4 text-center">
							<p className="uppercase text-xs tracking-widest text-muted-foreground">
								How It Works
							</p>
							<h2 className="text-section-title text-gray-900">
								Three simple steps to simulate a GL decision
							</h2>
						</div>
						<div className="grid gap-6 md:grid-cols-3">
							{howItWorks.map((step, index) => (
								<Card className="relative h-full shadow-soft" key={step.title}>
									<CardHeader className="space-y-4">
										<div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
											{index + 1}
										</div>
										<CardTitle className="text-card-title text-gray-900">
											{step.title}
										</CardTitle>
									</CardHeader>
									<CardContent>
										<CardDescription className="text-base text-muted-foreground">
											{step.body}
										</CardDescription>
									</CardContent>
								</Card>
							))}
						</div>
					</div>
				</section>

				<section className="bg-gray-50 px-6 py-16">
					<div className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
						<p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
							Tech Stack
						</p>
						<p className="text-lg text-muted-foreground">
							Built with a proven stack aligned to healthcare-grade infra.
						</p>
						<div className="flex flex-wrap items-center justify-center gap-4">
							{techStack.map((tech) => (
								<span
									className="rounded-full border border-gray-200 bg-white px-5 py-2 text-sm text-gray-900 shadow-soft"
									key={tech}
								>
									{tech}
								</span>
							))}
						</div>
					</div>
				</section>
			</main>

			<footer className="border-t border-gray-200 bg-white">
				<div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
					<span>Medisure — Smart GL Automation</span>
					<span>Medisure Team</span>
					<span>© 2025</span>
				</div>
			</footer>
		</div>
	);
}
