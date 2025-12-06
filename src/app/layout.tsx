import "@/styles/globals.css";

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";

export const metadata: Metadata = {
	title: "Medisure App",
	description: "Modern healthcare management platform",
	icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const inter = Inter({
	subsets: ["latin"],
	variable: "--font-inter",
	display: "swap",
});

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html className={`${inter.variable}`} lang="en">
			<body>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
