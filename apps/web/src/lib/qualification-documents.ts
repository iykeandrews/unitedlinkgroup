import api from "./api";
import { resolveApiUrl } from "./file-url";
const pending = new Set<string>();
export async function openQualificationDocument(path: string) {
  if (pending.has(path)) return;
  const preview = window.open("", "_blank");
  if (!preview) throw Error("Allow pop-ups to view this document.");
  preview.opener = null;
  pending.add(path);
  try {
    const target = new URL(resolveApiUrl(path), window.location.origin);
    if (!["http:", "https:"].includes(target.protocol))
      throw Error("Unsupported document address.");
    const apiOrigin = new URL(
      String(api.defaults.baseURL || "/api"),
      window.location.origin,
    ).origin;
    if (
      target.origin === apiOrigin &&
      /\/(?:api\/)?uploads\//.test(target.pathname)
    )
      target.searchParams.set("stream", "1");
    let blob: Blob;
    if (target.origin === apiOrigin)
      blob = (await api.get(target.href, { responseType: "blob" })).data;
    else {
      const response = await fetch(target.href, { credentials: "omit" });
      if (!response.ok) throw Error("Unable to download this document.");
      blob = await response.blob();
    }
    if (!blob.size) throw Error("This document is empty.");
    const ext = target.pathname.split(".").pop()?.toLowerCase();
    const mime: Record<string, string> = {
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      heic: "image/heic",
    };
    const type = mime[ext || ""] || blob.type.split(";")[0];
    if (!Object.values(mime).includes(type))
      throw Error(
        "This attachment cannot be previewed. Upload a PDF or image.",
      );
    const url = URL.createObjectURL(new Blob([blob], { type }));
    preview.location.href = url;
    window.setTimeout(() => URL.revokeObjectURL(url), 120000);
  } catch (error) {
    preview.close();
    throw error;
  } finally {
    pending.delete(path);
  }
}
export function credentialDisplay(value?: string | null) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ""));
  return match ? match[2] + "/" + match[3] + "/" + match[1] : "Not set";
}
