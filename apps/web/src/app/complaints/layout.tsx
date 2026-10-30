import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Customer Complaint Centre",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function ComplaintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
