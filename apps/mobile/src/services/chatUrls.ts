/** Resolve attachment URLs without exposing the session token to external hosts. */
export function chatFileUrl(path: string | null | undefined, apiBase: string, token?: string | null) {
  if (!path?.trim()) return '';
  try {
    const base = new URL(apiBase);
    const url = new URL(path.trim(), base.origin + '/');
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    if (token && url.origin === base.origin && url.pathname.startsWith('/uploads/')) url.searchParams.set('token', token);
    return url.toString();
  } catch { return ''; }
}
