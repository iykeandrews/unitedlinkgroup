type Release = { version: string; url: string };
const validVersion = (value: string) => /^\d+\.\d+\.\d+$/.test(value);
let appleCache: { until: number; release: Release | null } | undefined;

/** Advertise released builds only, never the version currently being developed. */
export async function mobileRelease(platform: string): Promise<Release | null> {
  if (!["ios", "android"].includes(platform)) return null;
  const prefix = `MOBILE_${platform.toUpperCase()}`;
  const version = (process.env[`${prefix}_LATEST_VERSION`] || "").trim();
  const url = (process.env[`${prefix}_UPDATE_URL`] || "").trim();
  if (version || url) {
    try {
      const target = new URL(url);
      return validVersion(version) &&
        target.protocol === "https:" &&
        !target.username &&
        !target.password
        ? { version, url: target.href }
        : null;
    } catch {
      return null;
    }
  }
  // Apple exposes the live public version. An unpublished TestFlight build must not trigger this.
  if (platform === "ios") {
    if (appleCache && appleCache.until > Date.now()) return appleCache.release;
    try {
      const response = await fetch(
        "https://itunes.apple.com/lookup?id=6811577530&country=us",
        { signal: AbortSignal.timeout(6000) },
      );
      if (!response.ok) return null;
      const result = ((await response.json()) as any).results?.find(
        (item: any) => item.bundleId === "com.unitedlinkgroup.mobile",
      );
      const release =
        result && validVersion(result.version)
          ? {
              version: result.version,
              url: "https://apps.apple.com/app/id6811577530",
            }
          : null;
      appleCache = { until: Date.now() + 3600000, release };
      return release;
    } catch {
      return null;
    }
  }
  return null;
}
