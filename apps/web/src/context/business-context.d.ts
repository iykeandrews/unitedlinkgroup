import React from 'react';
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
export declare function BusinessProvider({ children }: {
    children: React.ReactNode;
}): React.JSX.Element;
export declare function useBusiness(): BusinessContextType;
export {};
