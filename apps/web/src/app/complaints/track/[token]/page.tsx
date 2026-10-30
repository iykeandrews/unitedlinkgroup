"use client";
import { useParams } from "next/navigation";
import PublicComplaintPortal from "../../../../components/conduct/PublicComplaintPortal";
export default function TrackingPage() {
  const { token } = useParams<{ token: string }>();
  return <PublicComplaintPortal trackingToken={token} />;
}
