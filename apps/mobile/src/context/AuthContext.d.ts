import React from 'react';
interface AuthContextData {
    user: any;
    displayName: string;
    designation: string;
    avatarUrl: string;
    loading: boolean;
    signIn: (email: string, pass: string, opts?: {
        enableBiometric?: boolean;
    }) => Promise<void>;
    signOut: () => void;
    biometricAvailable: boolean;
    biometricEnabled: boolean;
    savedSessionAvailable: boolean;
    biometricSessionAvailable: boolean;
    biometricSignIn: () => Promise<void>;
    setBiometricPreference: (enabled: boolean) => Promise<void>;
    clearSavedSession: () => Promise<void>;
}
export declare function AuthProvider({ children }: {
    children: React.ReactNode;
}): React.JSX.Element;
export declare function useAuth(): AuthContextData;
export {};
