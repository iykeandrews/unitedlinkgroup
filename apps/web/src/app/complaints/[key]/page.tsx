"use client";
import { useParams } from "next/navigation";
import PublicComplaintPortal from "../../../components/conduct/PublicComplaintPortal";
export default function ComplaintPage() {
  const { key } = useParams<{ key: string }>();
  return <PublicComplaintPortal portalKey={key} />;
}
