'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
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

  const handleSetSelectedBusiness = useCallback((business: Business | null) => {
    setSelectedBusiness(business);
    if (business) {
      localStorage.setItem('selectedBusiness', JSON.stringify(business));
    } else {
      localStorage.removeItem('selectedBusiness');
    }
  }, []);

  const refreshBusinesses = useCallback(async () => {
    setIsLoading(true);
    try {
      // Only fetch if super admin - but we don't know role here easily without another call or passing it in.
      // We'll let the component handle the trigger, or check profile here.
      // Actually, let's just try to fetch and handle 403 silently or checking role first.
      const profileRes = await api.get('/auth/profile');
      if (profileRes.data.role === UserRole.SUPER_ADMIN) {
        const res = await api.get('/businesses');
        setBusinesses(res.data);

        const superContext = typeof window !== 'undefined' ? localStorage.getItem('superadminBusinessContext') : null;
        if (!superContext) {
          handleSetSelectedBusiness(null);
        }
      } else {
         const res = await api.get('/businesses/mine');
         if (res.data) {
             // If local storage differs or not set, update it
             // Actually, always update to keep in sync
             handleSetSelectedBusiness(res.data);
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
        setSelectedBusiness(JSON.parse(stored));
      } catch (e) {
        localStorage.removeItem('selectedBusiness');
      }
    }
    refreshBusinesses();
  }, [refreshBusinesses]);

  return (
    <BusinessContext.Provider
      value={{
        selectedBusiness,
        setSelectedBusiness: handleSetSelectedBusiness,
        businesses,
        isLoading,
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
