'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../lib/api';
import { useAuth } from './auth-context';
import { mergeBusinessSelection } from './business-selection';
import { UserRole } from '@unitedlinkgroup/types';

interface Business {
  id: string;
  name: string;
  ein: string;
  ownerId: string;
  modules?: string;
  industry?: string;
  businessType?: string;
  country?: string;
  currencyCode?: string;
  governmentInfo?: string;
  mobile?: string;
  employeeCount?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  logoUrl?: string;
  settings?: string;
  createdAt: string;
  updatedAt: string;
}

interface BusinessContextType {
  selectedBusiness: Business | null;
  setSelectedBusiness: (business: Business | null) => void;
  businesses: Business[];
  isLoading: boolean;
  refreshBusinesses: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hydrating, setHydrating] = useState(false);
  const { user: authUser } = useAuth();
  const selectedRef = useRef<Business | null>(null);
  const businessesRef = useRef<Business[]>([]);
  const selectionVersion = useRef(0);

  const handleSetSelectedBusiness = useCallback((business: Business | null) => {
    const known = selectedRef.current?.id === business?.id ? selectedRef.current : businessesRef.current.find(item => item.id === business?.id);
    const next = business ? mergeBusinessSelection(business, known) : null;
    selectedRef.current = next;
    selectionVersion.current++;
    setSelectedBusiness(next);
    if (next) {
      localStorage.setItem('selectedBusiness', JSON.stringify(next));
    } else {
      localStorage.removeItem('selectedBusiness');
    }
  }, []);

  const refreshBusinesses = useCallback(async () => {
    setIsLoading(true);
    const version = selectionVersion.current;
    try {
      // Only fetch if super admin - but we don't know role here easily without another call or passing it in.
      // We'll let the component handle the trigger, or check profile here.
      // Actually, let's just try to fetch and handle 403 silently or checking role first.
      const profileRes = await api.get('/auth/profile');
      if (profileRes.data.role === UserRole.SUPER_ADMIN) {
        const res = await api.get('/businesses');
        setBusinesses(res.data);
        businessesRef.current = res.data;

        const superContext = typeof window !== 'undefined' ? localStorage.getItem('superadminBusinessContext') : null;
        if (version === selectionVersion.current) {
          const fresh = res.data.find((item: Business) => item.id === selectedRef.current?.id);
          handleSetSelectedBusiness(superContext ? fresh || null : null);
        }
      } else {
         const res = await api.get('/businesses/mine');
         if (version === selectionVersion.current) {
             // If local storage differs or not set, update it
             // Actually, always update to keep in sync
             handleSetSelectedBusiness(res.data || null);
         }
      }
    } catch (error) {
      console.error('Failed to fetch businesses', error);
    } finally {
      setIsLoading(false);
    }
  }, [handleSetSelectedBusiness]);

  useEffect(() => {
    // Load selected business from local storage on mount
    const stored = localStorage.getItem('selectedBusiness');
    if (stored) {
      try {
        handleSetSelectedBusiness(JSON.parse(stored));
      } catch (e) {
        localStorage.removeItem('selectedBusiness');
      }
    }
    refreshBusinesses();
  }, [refreshBusinesses]);

  // Always hydrate a selection from the server after login or business switching.
  // Summary cards intentionally omit profile fields such as logoUrl and settings.
  useEffect(() => {
    const id = selectedBusiness?.id;
    if (!id || !authUser) { setHydrating(false); return; }
    let cancelled = false;
    const version = selectionVersion.current;
    setHydrating(true);
    const endpoint = authUser.role === UserRole.SUPER_ADMIN ? `/businesses/${id}` : '/businesses/mine';
    api.get(endpoint).then(({ data }) => {
      if (!cancelled && version === selectionVersion.current && data?.id === id) handleSetSelectedBusiness(data);
    }).catch(error => {
      if (!cancelled) console.error('Failed to load saved business profile', error);
    }).finally(() => { if (!cancelled) setHydrating(false); });
    return () => { cancelled = true; };
  }, [selectedBusiness?.id, authUser?.id, authUser?.role, handleSetSelectedBusiness]);

  return (
    <BusinessContext.Provider
      value={{
        selectedBusiness,
        setSelectedBusiness: handleSetSelectedBusiness,
        businesses,
        isLoading: isLoading || hydrating,
        refreshBusinesses,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
}
