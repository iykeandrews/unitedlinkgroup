'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import EmployeeSelfProfilePage from '../../../components/people/EmployeeSelfProfilePage';
import { useAuth } from '../../../context/auth-context';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    const role = String((user as any)?.role || '').toUpperCase();
    if (role !== 'EMPLOYEE' && role !== 'MANAGER') {
      router.replace('/dashboard/people');
    }
  }, [loading, router, user]);

  if (loading) return null;

  const role = String((user as any)?.role || '').toUpperCase();
  if (!user || (role !== 'EMPLOYEE' && role !== 'MANAGER')) return null;

  return <EmployeeSelfProfilePage />;
}

