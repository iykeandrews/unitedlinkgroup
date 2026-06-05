'use client';

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { Building2, ExternalLink, Lock, Mail, Store } from 'lucide-react';
import { motion } from 'framer-motion';
import { resolveFileUrl } from '@/lib/file-url';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

export default function VendorLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white" />}>
      <VendorLoginInner />
    </Suspense>
  );
}

function VendorLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSlug = useMemo(() => searchParams.get('vendor') || '', [searchParams]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [portalSlug, setPortalSlug] = useState(initialSlug);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [portalInfo, setPortalInfo] = useState<any | null>(null);

  useEffect(() => {
    setPortalSlug(initialSlug);
  }, [initialSlug]);

  useEffect(() => {
    const slug = String(portalSlug || '').trim().toLowerCase();
    if (!slug) {
      setPortalInfo(null);
      return;
    }
    let active = true;
    axios
      .get(`${API_URL}/vendors/public/${encodeURIComponent(slug)}`)
      .then((res) => {
        if (active) setPortalInfo(res.data);
      })
      .catch(() => {
        if (active) setPortalInfo(null);
      });
    return () => {
      active = false;
    };
  }, [portalSlug]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(`${API_URL}/auth/vendor-login`, {
        email,
        password,
        portalSlug: portalSlug || undefined,
      });
      localStorage.setItem('vendor_token', response.data.access_token);
      if (portalSlug) localStorage.setItem('vendor_portal_slug', portalSlug);
      router.push('/vendor/portal');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Vendor login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
        <div className="flex flex-1 flex-col justify-between px-8 py-10 lg:px-14">
          <div>
            <Link href="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white">
              <Store className="h-4 w-4" />
              Back to workforce login
            </Link>
            <div className="mt-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">
                Vendor Access
              </div>
              <h1 className="mt-6 text-4xl font-black tracking-tight text-white md:text-5xl">
                Separate vendor portal for contracts, reports, and operating updates.
              </h1>
              <p className="mt-5 max-w-xl text-base text-slate-300">
                Vendors sign in through a dedicated portal that is isolated from the employee and superadmin dashboard.
              </p>
            </div>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              ['Reports', 'Track relevant financial and operational reporting for the assigned business.'],
              ['Contracts', 'View service agreements, NDAs, scopes of work, and active contract files.'],
              ['Compliance', 'Review business documents, notices, and vendor-facing compliance material.'],
            ].map(([title, text]) => (
              <div key={title} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-black/20">
                <div className="text-sm font-bold uppercase tracking-[0.25em] text-cyan-200">{title}</div>
                <p className="mt-3 text-sm leading-6 text-slate-300">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex w-full max-w-xl items-center px-6 py-10 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full rounded-[2rem] border border-slate-800 bg-slate-900/85 p-8 shadow-2xl shadow-cyan-950/30 backdrop-blur"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-200">
                {portalInfo?.logoUrl ? (
                  <Image
                    src={resolveFileUrl(portalInfo.logoUrl)}
                    alt={portalInfo.businessName || 'Vendor'}
                    width={56}
                    height={56}
                    className="h-full w-full rounded-2xl object-cover"
                  />
                ) : (
                  <Building2 className="h-7 w-7" />
                )}
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Vendor Login</div>
                <div className="mt-1 text-xl font-bold text-white">{portalInfo?.companyName || 'Vendor Portal'}</div>
                <div className="text-sm text-slate-400">{portalInfo?.businessName || 'Business operations access'}</div>
              </div>
            </div>

            {portalInfo?.loginUrl ? (
              <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                Portal link ready for subdomain rollout:
                <a href={portalInfo.loginUrl} className="ml-2 inline-flex items-center gap-1 font-semibold underline underline-offset-4">
                  Open link <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            ) : null}

            {error ? (
              <div className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div>
            ) : null}

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Portal Slug</span>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
                  <Store className="h-4 w-4 text-cyan-200" />
                  <input
                    value={portalSlug}
                    onChange={(e) => setPortalSlug(e.target.value)}
                    placeholder="vendor-subdomain"
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Email</span>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
                  <Mail className="h-4 w-4 text-cyan-200" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="vendor@company.com"
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Password</span>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
                  <Lock className="h-4 w-4 text-cyan-200" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter password"
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                  />
                </div>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-bold uppercase tracking-[0.3em] text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Signing in...' : 'Enter Vendor Portal'}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
