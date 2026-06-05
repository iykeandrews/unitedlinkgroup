import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { registerExpoPush } from '../services/push';
import * as LocalAuthentication from 'expo-local-authentication';

interface AuthContextData {
  user: any;
  displayName: string;
  designation: string;
  avatarUrl: string;
  loading: boolean;
  signIn: (email: string, pass: string, opts?: { enableBiometric?: boolean }) => Promise<void>;
  signOut: () => void;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  savedSessionAvailable: boolean;
  biometricSessionAvailable: boolean;
  biometricSignIn: () => Promise<void>;
  setBiometricPreference: (enabled: boolean) => Promise<void>;
  clearSavedSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const [designation, setDesignation] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [authToken, setAuthToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [pendingSession, setPendingSession] = useState<{ token: string; user: any } | null>(null);
  const [storedSessionAvailable, setStoredSessionAvailable] = useState(false);

  const roleToDesignation = (rawRole: unknown) => {
    const r = String(rawRole || '').toUpperCase();
    if (r === 'SUPER_ADMIN') return 'Administrator';
    if (r === 'BUSINESS_ADMIN') return 'Business Admin';
    if (r === 'MANAGER') return 'Manager';
    if (r === 'EMPLOYEE') return 'Employee';
    if (!r) return '';
    return r.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const computeDisplayName = (u: any) => {
    const first = String(u?.firstName || '').trim();
    const last = String(u?.lastName || '').trim();
    const combined = [first, last].filter(Boolean).join(' ').trim();
    if (combined) return combined;
    const email = String(u?.email || '').trim();
    if (email) return email;
    return 'User';
  };

  const applyIdentityFromEmployee = (employee: any, tokenOverride?: string) => {
    const first = String(employee?.firstName || '').trim();
    const last = String(employee?.lastName || '').trim();
    const fullName = [first, last].filter(Boolean).join(' ').trim();
    if (fullName) setDisplayName(fullName);

    const customRoleName = employee?.customRole?.name ? String(employee.customRole.name) : '';
    setDesignation(customRoleName || roleToDesignation(employee?.role));

    const profileImageUrl = employee?.profileImageUrl ? String(employee.profileImageUrl) : '';
    setAvatarUrl(profileImageUrl ? toAuthedUrl(profileImageUrl, tokenOverride) : '');
  };

  const applyIdentityFromUser = (u: any) => {
    setDisplayName(computeDisplayName(u));
    setDesignation(roleToDesignation(u?.role));
  };

  const applyBusinessContext = (businessId?: unknown) => {
    const nextBusinessId = String(businessId || '').trim();
    if (nextBusinessId) {
      api.defaults.headers['x-business-id'] = nextBusinessId;
    } else {
      delete api.defaults.headers['x-business-id'];
    }
  };

  const toAuthedUrl = (path: string, tokenOverride?: string) => {
    const base = String((api.defaults as any).baseURL || '').replace(/\/$/, '');
    const p = String(path || '');
    const url = p.startsWith('http') ? p : `${base}${p.startsWith('/') ? '' : '/'}${p}`;
    const token = typeof tokenOverride === 'string' ? tokenOverride : authToken;
    if (!token) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}token=${encodeURIComponent(token)}`;
  };

  const refreshIdentity = async (u?: any, tokenOverride?: string) => {
    const current = u || user;
    if (!current) return;
    applyIdentityFromUser(current);

    try {
      const res = await api.get('/employees/me');
      if (res?.data) {
        // Prefer employee profile data because it contains the current avatar and custom role.
        applyIdentityFromEmployee(res.data, tokenOverride);
      }
    } catch {
    }
  };

  useEffect(() => {
    async function loadStorageData() {
      const [hasHardware, isEnrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync().catch(() => false),
        LocalAuthentication.isEnrolledAsync().catch(() => false),
      ]);
      const available = !!hasHardware && !!isEnrolled;
      setBiometricAvailable(available);

      const storedBioEnabled = await AsyncStorage.getItem('biometric_enabled');
      const enabled = storedBioEnabled === '1';
      setBiometricEnabled(enabled);

      const storedToken = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');
      const storedBusinessId = await AsyncStorage.getItem('businessId');
      const hasStoredSession = !!storedToken && !!storedUser;
      setStoredSessionAvailable(hasStoredSession);

      if (hasStoredSession) {
        setAuthToken(storedToken || '');
        if (enabled && available) {
          setPendingSession({ token: storedToken, user: JSON.parse(storedUser) });
        } else {
          api.defaults.headers.Authorization = `Bearer ${storedToken}`;
          const parsed = JSON.parse(storedUser);
          applyBusinessContext(parsed?.businessId || storedBusinessId);
          setUser(parsed);
          applyIdentityFromUser(parsed);
          await refreshIdentity(parsed, storedToken || '');
        }
      }
      setLoading(false);
      console.log('AuthProvider init', { hasToken: !!storedToken, hasUser: !!storedUser });
    }

    loadStorageData();
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        await registerExpoPush({ requestPermissions: true });
      } catch {}
    })();
  }, [user]);

  async function signIn(email: string, pass: string, opts?: { enableBiometric?: boolean }) {
    const response = await api.post('/auth/login', {
      email,
      password: pass,
    });

    const { access_token, user: userData, businessId: loginBusinessId } = response.data;

    let profile = userData;
    // Fetch profile if not provided in login response
    if (!profile) {
        api.defaults.headers.Authorization = `Bearer ${access_token}`;
        try {
            const profileRes = await api.get('/auth/profile');
            profile = profileRes.data;
        } catch (error) {
            console.error("Failed to fetch profile", error);
        }
    }

    await AsyncStorage.setItem('token', access_token);
    if (profile) {
        const profileWithBusiness = {
          ...profile,
          businessId: profile?.businessId || loginBusinessId || '',
        };
        await AsyncStorage.setItem('user', JSON.stringify(profileWithBusiness));
        await AsyncStorage.setItem('businessId', String(profileWithBusiness.businessId || ''));
        profile = profileWithBusiness;
    }
    
    api.defaults.headers.Authorization = `Bearer ${access_token}`;
    applyBusinessContext(profile?.businessId);
    setAuthToken(access_token);

    const shouldEnableBiometric = !!opts?.enableBiometric && biometricAvailable;
    await AsyncStorage.setItem('biometric_enabled', shouldEnableBiometric ? '1' : '0');
    setBiometricEnabled(shouldEnableBiometric);
    setStoredSessionAvailable(!!profile);

    if (profile) {
      setUser(profile);
      applyIdentityFromUser(profile);
      await refreshIdentity(profile, access_token);
      if (shouldEnableBiometric) {
        setPendingSession({ token: access_token, user: profile });
      }
    }

    // Register for native push notifications
    try {
      await registerExpoPush();
    } catch (e) {
      console.warn('Expo push registration failed', e);
    }
  }

  async function biometricSignIn() {
    if (!biometricAvailable) {
      throw new Error('Biometric authentication is not available on this device');
    }
    let token = pendingSession?.token;
    let sessionUser = pendingSession?.user;
    if (!token || !sessionUser) {
      const [storedToken, storedUser, storedBusinessId] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('businessId'),
      ]);
      if (!storedToken || !storedUser) {
        throw new Error('No saved session available for biometric login');
      }
      token = storedToken;
      sessionUser = { ...JSON.parse(storedUser), businessId: JSON.parse(storedUser)?.businessId || storedBusinessId || '' };
      setPendingSession({ token, user: sessionUser });
      setStoredSessionAvailable(true);
    }
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Sign in',
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use passcode',
    });
    if (!res.success) {
      throw new Error('Biometric authentication was cancelled');
    }
    api.defaults.headers.Authorization = `Bearer ${token}`;
    setAuthToken(token);
    applyBusinessContext(sessionUser?.businessId);
    setUser(sessionUser);
    applyIdentityFromUser(sessionUser);
    await refreshIdentity(sessionUser, token);
    try {
      await registerExpoPush({ requestPermissions: true });
    } catch {}
    setPendingSession(null);
  }

  async function setBiometricPreference(enabled: boolean) {
    if (enabled && !biometricAvailable) {
      throw new Error('Biometric authentication is not available on this device');
    }

    await AsyncStorage.setItem('biometric_enabled', enabled ? '1' : '0');
    setBiometricEnabled(enabled);

    if (!enabled) {
      setPendingSession(null);
      return;
    }

    const sessionToken = await AsyncStorage.getItem('token');
    const sessionUser = await AsyncStorage.getItem('user');
    if (!sessionToken || !sessionUser) {
      throw new Error('No saved session available. Please sign in once first.');
    }
    const parsedUser = JSON.parse(sessionUser);
    setStoredSessionAvailable(true);
    setPendingSession({ token: sessionToken, user: parsedUser });
  }

  async function signOut() {
    if (biometricEnabled && biometricAvailable) {
      const [storedToken, storedUser] = await Promise.all([AsyncStorage.getItem('token'), AsyncStorage.getItem('user')]);
      if (storedToken && storedUser) {
        api.defaults.headers.Authorization = '';
        delete api.defaults.headers['x-business-id'];
        setUser(null);
        setDisplayName('');
        setDesignation('');
        setAvatarUrl('');
        setAuthToken('');
        setPendingSession({ token: storedToken, user: JSON.parse(storedUser) });
        setStoredSessionAvailable(true);
        return;
      }
    }
    await AsyncStorage.clear();
    api.defaults.headers.Authorization = '';
    delete api.defaults.headers['x-business-id'];
    setUser(null);
    setDisplayName('');
    setDesignation('');
    setAvatarUrl('');
    setAuthToken('');
    setPendingSession(null);
    setBiometricEnabled(false);
    setStoredSessionAvailable(false);
  }

  async function clearSavedSession() {
    await AsyncStorage.multiRemove(['token', 'user', 'businessId', 'biometric_enabled']);
    api.defaults.headers.Authorization = '';
    delete api.defaults.headers['x-business-id'];
    setUser(null);
    setDisplayName('');
    setDesignation('');
    setAvatarUrl('');
    setAuthToken('');
    setPendingSession(null);
    setBiometricEnabled(false);
    setStoredSessionAvailable(false);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        displayName,
        designation,
        avatarUrl,
        loading,
        signIn,
        signOut,
        biometricAvailable,
        biometricEnabled,
        savedSessionAvailable: storedSessionAvailable,
        biometricSessionAvailable: !!pendingSession || (biometricEnabled && biometricAvailable && storedSessionAvailable),
        biometricSignIn,
        setBiometricPreference,
        clearSavedSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
