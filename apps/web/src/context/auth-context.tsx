'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';
import { UserRole } from '@unitedlinkgroup/types';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/profile');
      setUser(response.data);
      const employeeType = response?.data?.employeeType;
      if (employeeType) localStorage.setItem('employee_type', String(employeeType));
      else localStorage.removeItem('employee_type');
    } catch (error) {
      console.error('Failed to fetch profile', error);
      // If network error or 401, we might not have a user
      setUser(null);
    } finally {
      setLoading(false);
    }
  };
  
  const logout = () => {
     localStorage.removeItem('token');
     localStorage.removeItem('selectedBusiness');
     localStorage.removeItem('employee_type');
     setUser(null);
     try {
       window.dispatchEvent(new Event('auth:changed'));
     } catch {}
     window.location.href = '/login';
  };

  useEffect(() => {
    refreshProfile();
    const handleAuthChanged = () => {
      refreshProfile();
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'token') {
        refreshProfile();
      }
    };
    window.addEventListener('auth:changed', handleAuthChanged as EventListener);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('auth:changed', handleAuthChanged as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refreshProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
