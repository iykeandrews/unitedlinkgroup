'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Building2, KeyRound, Mail, User, BriefcaseBusiness } from 'lucide-react';
import api from '../../lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = useMemo(() => {
    if (!firstName.trim() || !lastName.trim() || !businessName.trim()) return false;
    if (!email.trim() || !password) return false;
    if (password !== confirm) return false;
    return true;
  }, [firstName, lastName, businessName, email, password, confirm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!canSubmit) return;
    try {
      setLoading(true);
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        businessName: businessName.trim(),
        email: email.trim(),
        password,
      };
      const res = await api.post('/auth/bootstrap', payload);
      localStorage.setItem('token', res.data.access_token);
      const businessObj = res.data.business;
      const businessId = res.data.businessId;
      if (businessObj && businessObj.id) {
        localStorage.setItem('selectedBusiness', JSON.stringify(businessObj));
      } else if (businessId) {
        localStorage.setItem('selectedBusiness', JSON.stringify({ id: businessId, name: 'Business' }));
      }
      router.push('/dashboard');
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(typeof message === 'string' ? message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#007AFF] relative overflow-hidden p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ x: [0, 100, 0], y: [0, -50, 0] }}
          transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
          className="absolute top-10 left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -150, 0], y: [0, 100, 0] }}
          transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
          className="absolute bottom-20 right-20 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl"
        />
      </div>

      <div className="absolute bottom-0 left-0 right-0 flex justify-center opacity-20 pointer-events-none z-0">
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="flex items-end space-x-8 text-white"
        >
          <Building2 size={120} />
          <Building2 size={180} />
          <Building2 size={140} />
          <Building2 size={200} />
          <Building2 size={160} />
        </motion.div>
      </div>

      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="w-full max-w-lg bg-blue-500/80 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden border border-blue-400/50 z-30"
      >
        <div className="bg-blue-600/50 px-4 py-3 flex items-center space-x-2 border-b border-blue-400/30">
          <div className="w-3 h-3 rounded-full bg-red-400/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
          <div className="w-3 h-3 rounded-full bg-green-400/80" />
        </div>

        <div className="p-8 pt-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-2xl font-bold text-white">Create Admin Account</div>
              <div className="text-blue-100 text-sm mt-1">This is only available when no users exist.</div>
            </div>
            <Link href="/login" className="text-sm font-semibold text-white/90 hover:text-white underline underline-offset-4">
              Back to login
            </Link>
          </div>

          {error && (
            <div className="mt-5 p-4 rounded-lg bg-red-500/20 border border-red-400/30 text-red-100 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-blue-100">First name</label>
                <div className="mt-1 relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-200" />
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-blue-200 focus:outline-none focus:ring-2 focus:ring-white/40"
                    placeholder="First name"
                    autoComplete="given-name"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-blue-100">Last name</label>
                <div className="mt-1 relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-200" />
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-blue-200 focus:outline-none focus:ring-2 focus:ring-white/40"
                    placeholder="Last name"
                    autoComplete="family-name"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-blue-100">Business name</label>
              <div className="mt-1 relative">
                <BriefcaseBusiness className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-200" />
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-blue-200 focus:outline-none focus:ring-2 focus:ring-white/40"
                  placeholder="Company Inc."
                  autoComplete="organization"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-blue-100">Email</label>
              <div className="mt-1 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-200" />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-blue-200 focus:outline-none focus:ring-2 focus:ring-white/40"
                  placeholder="admin@company.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-blue-100">Password</label>
                <div className="mt-1 relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-200" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-blue-200 focus:outline-none focus:ring-2 focus:ring-white/40"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-blue-100">Confirm</label>
                <div className="mt-1 relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-200" />
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-blue-200 focus:outline-none focus:ring-2 focus:ring-white/40"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>

            {password && confirm && password !== confirm && (
              <div className="text-sm text-red-100">Passwords do not match.</div>
            )}

            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="w-full py-3 rounded-lg bg-white text-blue-700 font-bold shadow-lg hover:bg-blue-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating…' : 'Create account'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

