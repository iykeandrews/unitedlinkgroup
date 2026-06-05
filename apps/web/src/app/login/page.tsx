'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '../../lib/api';
import { UserRole } from '@unitedlinkgroup/types';
import { Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, Store } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('selectedBusiness');
      const response = await api.post('/auth/login', { email, password });
      const token = response.data.access_token;
      localStorage.setItem('token', token);
      try {
        const employeeType = response?.data?.employeeType;
        if (employeeType) {
          localStorage.setItem('employee_type', String(employeeType));
        } else {
          localStorage.removeItem('employee_type');
        }
      } catch {}
      const role = (() => {
        try {
          const base64 = String(token || '').split('.')[1] || '';
          const padded = base64.replace(/-/g, '+').replace(/_/g, '/').padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
          const payload = JSON.parse(atob(padded));
          return payload?.role || null;
        } catch {
          return null;
        }
      })();

      if (role === UserRole.SUPER_ADMIN) {
        localStorage.removeItem('selectedBusiness');
        localStorage.removeItem('superadminBusinessContext');
      } else {
        const businessObj = response.data.business;
        const businessId = response.data.businessId;
        if (businessObj && businessObj.id) {
          localStorage.setItem('selectedBusiness', JSON.stringify(businessObj));
        } else if (businessId) {
          localStorage.setItem('selectedBusiness', JSON.stringify({ id: businessId, name: 'Business' }));
        }
      }
      try {
        window.dispatchEvent(new Event('auth:changed'));
      } catch {}
      router.push('/dashboard');
    } catch (err: any) {
      if (err.response?.status === 401) {
        const message = err.response?.data?.message;
        if (typeof message === 'string' && message.toLowerCase().includes('bootstrap')) {
          setError(message);
        } else {
          setError('Invalid credentials');
        }
      } else if (err.response) {
        setError(err.response.data?.message || 'Login failed');
      } else {
        setError('Unable to connect to server. Please try again later.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.22),transparent_45%),radial-gradient(circle_at_bottom,rgba(14,165,233,0.16),transparent_42%)]" />
      <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:48px_48px]" />
      <motion.div
        aria-hidden="true"
        className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl"
        animate={{ x: [0, 40, 0], y: [0, -30, 0], opacity: [0.6, 0.9, 0.6] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden="true"
        className="absolute -right-24 bottom-12 h-96 w-96 rounded-full bg-cyan-400/15 blur-3xl"
        animate={{ x: [0, -50, 0], y: [0, 35, 0], opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-500/10 blur-3xl"
        animate={{ scale: [1, 1.12, 1], opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="grid w-full gap-6 lg:grid-cols-2"
        >
          <div className="hidden lg:block">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.4, ease: 'easeOut' }}
              className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white shadow-2xl shadow-black/40 backdrop-blur"
            >
              <div className="flex items-center gap-3">
                <motion.div
                  className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-200 ring-1 ring-white/10"
                  animate={{ boxShadow: ['0 0 0 rgba(99,102,241,0)', '0 0 24px rgba(99,102,241,0.35)', '0 0 0 rgba(99,102,241,0)'] }}
                  transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <ShieldCheck className="h-6 w-6" />
                </motion.div>
                <div>
                  <div className="text-sm font-semibold tracking-wide text-white/80">United Link Group</div>
                  <div className="mt-1 text-xl font-black tracking-tight text-white">Secure Sign-In</div>
                </div>
              </div>

              <div className="mt-6 text-sm text-white/70">
                Access schedules, approvals, time tracking, and vendor management from one place.
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.45, ease: 'easeOut' }}
            className="relative rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur sm:p-8"
          >
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/10"
              animate={{ opacity: [0.35, 0.7, 0.35] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-white/70">Welcome back</div>
                <h1 className="mt-2 text-2xl font-black tracking-tight text-white">Sign in</h1>
                <p className="mt-2 text-sm text-white/65">Use your admin or superadmin credentials to continue.</p>
              </div>
              <Link
                href="/vendor/login"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
              >
                <Store className="h-4 w-4" />
                Vendor login
              </Link>
            </div>

            {error ? (
              <div className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                <div>{error}</div>
                {error.toLowerCase().includes('bootstrap') ? (
                  <div className="mt-2">
                    <Link href="/register" className="font-semibold text-white underline underline-offset-4">
                      Create the first admin account
                    </Link>
                  </div>
                ) : null}
              </div>
            ) : null}

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <motion.label
                className="block"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.35, ease: 'easeOut' }}
              >
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/55">Email</div>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="name@company.com"
                    className="w-full rounded-2xl border border-white/10 bg-black/20 py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-400/30"
                  />
                </div>
              </motion.label>

              <motion.label
                className="block"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.24, duration: 0.35, ease: 'easeOut' }}
              >
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/55">Password</div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="w-full rounded-2xl border border-white/10 bg-black/20 py-3 pl-10 pr-12 text-sm text-white outline-none placeholder:text-white/35 focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-400/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2 text-white/55 hover:bg-white/5 hover:text-white"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </motion.label>

              <motion.button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? 'Signing in…' : 'Sign in'}
              </motion.button>

              <div className="pt-2 text-center text-xs text-white/55">
                Protected system • Authorized access only
              </div>
            </form>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
