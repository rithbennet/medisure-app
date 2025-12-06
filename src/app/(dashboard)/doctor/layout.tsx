import type { ReactNode } from "react";

type DoctorLayoutProps = {
	children: ReactNode;
};

export default function DoctorLayout({ children }: DoctorLayoutProps) {
	return <>{children}</>;
}
