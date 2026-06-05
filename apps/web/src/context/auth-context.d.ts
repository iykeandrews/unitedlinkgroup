import React from 'react';
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
export declare function AuthProvider({ children }: {
    children: React.ReactNode;
}): React.JSX.Element;
export declare const useAuth: () => AuthContextType;
export {};
