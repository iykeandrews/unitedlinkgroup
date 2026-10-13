import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Sign in | United Link Group",
  description:
    "Sign in to manage your team, schedules and everyday operations with United Link Group.",
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
