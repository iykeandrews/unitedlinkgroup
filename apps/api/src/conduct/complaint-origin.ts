import { createHash } from "crypto";

function origins(value?: string): string[] {
  return (value || "")
    .split(",")
    .map((part) => {
      try {
        const url = new URL(part.trim());
        if (
          !["https:", "http:"].includes(url.protocol) ||
          url.username ||
          url.password ||
          url.hostname.includes(",")
        )
          return "";
        return url.origin;
      } catch {
        return "";
      }
    })
    .filter(Boolean);
}
export function complaintOrigin(env: NodeJS.ProcessEnv = process.env): string {
  const explicit = origins(env.PUBLIC_WEB_URL);
  if (explicit.length) return explicit[0];
  const configured = origins(env.FRONTEND_URL);
  return (
    configured.find(
      (value) => new URL(value).hostname === "www.unitedlinkgroup.com",
    ) ||
    configured[0] ||
    "https://www.unitedlinkgroup.com"
  );
}
export function complaintHosts(env: NodeJS.ProcessEnv = process.env): string[] {
  if (env.TURNSTILE_ALLOWED_HOSTNAMES?.trim())
    return [
      ...new Set(
        env.TURNSTILE_ALLOWED_HOSTNAMES.split(",")
          .map((part) => {
            try {
              const value = part.trim();
              return new URL(
                value.includes("://") ? value : `https://${value}`,
              ).hostname.toLowerCase();
            } catch {
              return "";
            }
          })
          .filter(Boolean),
      ),
    ];
  return [
    ...new Set(
      [
        complaintOrigin(env),
        ...origins(env.PUBLIC_WEB_URL),
        ...origins(env.FRONTEND_URL),
      ].map((value) => new URL(value).hostname.toLowerCase()),
    ),
  ];
}
/** Keep retries of one token idempotent; a refreshed token needs a fresh validation key. */
export function complaintVerificationKey(
  submissionId: string,
  token: string,
): string {
  const digest = createHash("sha256")
    .update(`${submissionId}:${token}`)
    .digest("hex");
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-4${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
}
