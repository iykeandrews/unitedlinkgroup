export function resolveApiUrl(url: string) {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const configuredBase = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || '';
  if (configuredBase) {
    return `${configuredBase}${url.startsWith('/') ? '' : '/'}${url}`;
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api${url.startsWith('/') ? '' : '/'}${url}`;
  }
  return `http://localhost:3002${url.startsWith('/') ? '' : '/'}${url}`;
}

export function resolveFileUrl(url: string) {
  if (!url) return url;
  const absolute = resolveApiUrl(url);
  try {
    const u = new URL(absolute);
    if (!u.pathname.startsWith('/uploads/')) return absolute;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return absolute;
    u.searchParams.set('token', token);
    return u.toString();
  } catch {
    return absolute;
  }
}
