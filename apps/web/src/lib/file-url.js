"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveApiUrl = resolveApiUrl;
exports.resolveFileUrl = resolveFileUrl;
function resolveApiUrl(url) {
    if (!url)
        return url;
    if (url.startsWith('http://') || url.startsWith('https://'))
        return url;
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
    return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}
function resolveFileUrl(url) {
    if (!url)
        return url;
    const absolute = resolveApiUrl(url);
    try {
        const u = new URL(absolute);
        if (!u.pathname.startsWith('/uploads/'))
            return absolute;
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token)
            return absolute;
        u.searchParams.set('token', token);
        return u.toString();
    }
    catch {
        return absolute;
    }
}
