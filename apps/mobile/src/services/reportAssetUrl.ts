export function reportAssetUrl(
  base: string,
  path: string,
  token: string,
): string {
  try {
    if (/^[a-z][a-z0-9+.-]*:/i.test(path) && !/^https?:/i.test(path)) return "";
    const api = new URL(base.replace(/\/$/, "") + "/");
    const address = new URL(
      /^https?:/i.test(path)
        ? path
        : base.replace(/\/$/, "") + "/" + path.replace(/^\//, ""),
    );
    if (
      !["http:", "https:"].includes(address.protocol) ||
      address.username ||
      address.password
    )
      return "";
    // Signed external storage URLs already carry their own authorization.
    if (address.origin === api.origin && token)
      address.searchParams.set("token", token);
    return address.href;
  } catch {
    return "";
  }
}
