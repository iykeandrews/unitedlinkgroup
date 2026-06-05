"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthProvider = AuthProvider;
exports.useAuth = useAuth;
const react_1 = __importStar(require("react"));
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const api_1 = __importDefault(require("../services/api"));
const push_1 = require("../services/push");
const LocalAuthentication = __importStar(require("expo-local-authentication"));
const AuthContext = (0, react_1.createContext)({});
function AuthProvider({ children }) {
    const [user, setUser] = (0, react_1.useState)(null);
    const [displayName, setDisplayName] = (0, react_1.useState)('');
    const [designation, setDesignation] = (0, react_1.useState)('');
    const [avatarUrl, setAvatarUrl] = (0, react_1.useState)('');
    const [authToken, setAuthToken] = (0, react_1.useState)('');
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [biometricAvailable, setBiometricAvailable] = (0, react_1.useState)(false);
    const [biometricEnabled, setBiometricEnabled] = (0, react_1.useState)(false);
    const [pendingSession, setPendingSession] = (0, react_1.useState)(null);
    const [storedSessionAvailable, setStoredSessionAvailable] = (0, react_1.useState)(false);
    const roleToDesignation = (rawRole) => {
        const r = String(rawRole || '').toUpperCase();
        if (r === 'SUPER_ADMIN')
            return 'Administrator';
        if (r === 'BUSINESS_ADMIN')
            return 'Business Admin';
        if (r === 'MANAGER')
            return 'Manager';
        if (r === 'EMPLOYEE')
            return 'Employee';
        if (!r)
            return '';
        return r.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    };
    const computeDisplayName = (u) => {
        const first = String((u === null || u === void 0 ? void 0 : u.firstName) || '').trim();
        const last = String((u === null || u === void 0 ? void 0 : u.lastName) || '').trim();
        const combined = [first, last].filter(Boolean).join(' ').trim();
        if (combined)
            return combined;
        const email = String((u === null || u === void 0 ? void 0 : u.email) || '').trim();
        if (email)
            return email;
        return 'User';
    };
    const applyIdentityFromEmployee = (employee, tokenOverride) => {
        var _a;
        const first = String((employee === null || employee === void 0 ? void 0 : employee.firstName) || '').trim();
        const last = String((employee === null || employee === void 0 ? void 0 : employee.lastName) || '').trim();
        const fullName = [first, last].filter(Boolean).join(' ').trim();
        if (fullName)
            setDisplayName(fullName);
        const customRoleName = ((_a = employee === null || employee === void 0 ? void 0 : employee.customRole) === null || _a === void 0 ? void 0 : _a.name) ? String(employee.customRole.name) : '';
        setDesignation(customRoleName || roleToDesignation(employee === null || employee === void 0 ? void 0 : employee.role));
        const profileImageUrl = (employee === null || employee === void 0 ? void 0 : employee.profileImageUrl) ? String(employee.profileImageUrl) : '';
        setAvatarUrl(profileImageUrl ? toAuthedUrl(profileImageUrl, tokenOverride) : '');
    };
    const applyIdentityFromUser = (u) => {
        setDisplayName(computeDisplayName(u));
        setDesignation(roleToDesignation(u === null || u === void 0 ? void 0 : u.role));
    };
    const applyBusinessContext = (businessId) => {
        const nextBusinessId = String(businessId || '').trim();
        if (nextBusinessId) {
            api_1.default.defaults.headers['x-business-id'] = nextBusinessId;
        }
        else {
            delete api_1.default.defaults.headers['x-business-id'];
        }
    };
    const toAuthedUrl = (path, tokenOverride) => {
        const base = String(api_1.default.defaults.baseURL || '').replace(/\/$/, '');
        const p = String(path || '');
        const url = p.startsWith('http') ? p : `${base}${p.startsWith('/') ? '' : '/'}${p}`;
        const token = typeof tokenOverride === 'string' ? tokenOverride : authToken;
        if (!token)
            return url;
        const sep = url.includes('?') ? '&' : '?';
        return `${url}${sep}token=${encodeURIComponent(token)}`;
    };
    const refreshIdentity = async (u, tokenOverride) => {
        const current = u || user;
        if (!current)
            return;
        applyIdentityFromUser(current);
        try {
            const res = await api_1.default.get('/employees/me');
            if (res === null || res === void 0 ? void 0 : res.data) {
                // Prefer employee profile data because it contains the current avatar and custom role.
                applyIdentityFromEmployee(res.data, tokenOverride);
            }
        }
        catch {
        }
    };
    (0, react_1.useEffect)(() => {
        async function loadStorageData() {
            const [hasHardware, isEnrolled] = await Promise.all([
                LocalAuthentication.hasHardwareAsync().catch(() => false),
                LocalAuthentication.isEnrolledAsync().catch(() => false),
            ]);
            const available = !!hasHardware && !!isEnrolled;
            setBiometricAvailable(available);
            const storedBioEnabled = await async_storage_1.default.getItem('biometric_enabled');
            const enabled = storedBioEnabled === '1';
            setBiometricEnabled(enabled);
            const storedToken = await async_storage_1.default.getItem('token');
            const storedUser = await async_storage_1.default.getItem('user');
            const storedBusinessId = await async_storage_1.default.getItem('businessId');
            const hasStoredSession = !!storedToken && !!storedUser;
            setStoredSessionAvailable(hasStoredSession);
            if (hasStoredSession) {
                setAuthToken(storedToken || '');
                if (enabled && available) {
                    setPendingSession({ token: storedToken, user: JSON.parse(storedUser) });
                }
                else {
                    api_1.default.defaults.headers.Authorization = `Bearer ${storedToken}`;
                    const parsed = JSON.parse(storedUser);
                    applyBusinessContext((parsed === null || parsed === void 0 ? void 0 : parsed.businessId) || storedBusinessId);
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
    (0, react_1.useEffect)(() => {
        if (!user)
            return;
        (async () => {
            try {
                await (0, push_1.registerExpoPush)({ requestPermissions: true });
            }
            catch { }
        })();
    }, [user]);
    async function signIn(email, pass, opts) {
        const response = await api_1.default.post('/auth/login', {
            email,
            password: pass,
        });
        const { access_token, user: userData, businessId: loginBusinessId } = response.data;
        let profile = userData;
        // Fetch profile if not provided in login response
        if (!profile) {
            api_1.default.defaults.headers.Authorization = `Bearer ${access_token}`;
            try {
                const profileRes = await api_1.default.get('/auth/profile');
                profile = profileRes.data;
            }
            catch (error) {
                console.error("Failed to fetch profile", error);
            }
        }
        await async_storage_1.default.setItem('token', access_token);
        if (profile) {
            const profileWithBusiness = {
                ...profile,
                businessId: (profile === null || profile === void 0 ? void 0 : profile.businessId) || loginBusinessId || '',
            };
            await async_storage_1.default.setItem('user', JSON.stringify(profileWithBusiness));
            await async_storage_1.default.setItem('businessId', String(profileWithBusiness.businessId || ''));
            profile = profileWithBusiness;
        }
        api_1.default.defaults.headers.Authorization = `Bearer ${access_token}`;
        applyBusinessContext(profile === null || profile === void 0 ? void 0 : profile.businessId);
        setAuthToken(access_token);
        const shouldEnableBiometric = !!(opts === null || opts === void 0 ? void 0 : opts.enableBiometric) && biometricAvailable;
        await async_storage_1.default.setItem('biometric_enabled', shouldEnableBiometric ? '1' : '0');
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
            await (0, push_1.registerExpoPush)();
        }
        catch (e) {
            console.warn('Expo push registration failed', e);
        }
    }
    async function biometricSignIn() {
        var _a;
        if (!biometricAvailable) {
            throw new Error('Biometric authentication is not available on this device');
        }
        let token = pendingSession === null || pendingSession === void 0 ? void 0 : pendingSession.token;
        let sessionUser = pendingSession === null || pendingSession === void 0 ? void 0 : pendingSession.user;
        if (!token || !sessionUser) {
            const [storedToken, storedUser, storedBusinessId] = await Promise.all([
                async_storage_1.default.getItem('token'),
                async_storage_1.default.getItem('user'),
                async_storage_1.default.getItem('businessId'),
            ]);
            if (!storedToken || !storedUser) {
                throw new Error('No saved session available for biometric login');
            }
            token = storedToken;
            sessionUser = { ...JSON.parse(storedUser), businessId: ((_a = JSON.parse(storedUser)) === null || _a === void 0 ? void 0 : _a.businessId) || storedBusinessId || '' };
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
        api_1.default.defaults.headers.Authorization = `Bearer ${token}`;
        setAuthToken(token);
        applyBusinessContext(sessionUser === null || sessionUser === void 0 ? void 0 : sessionUser.businessId);
        setUser(sessionUser);
        applyIdentityFromUser(sessionUser);
        await refreshIdentity(sessionUser, token);
        try {
            await (0, push_1.registerExpoPush)({ requestPermissions: true });
        }
        catch { }
        setPendingSession(null);
    }
    async function setBiometricPreference(enabled) {
        if (enabled && !biometricAvailable) {
            throw new Error('Biometric authentication is not available on this device');
        }
        await async_storage_1.default.setItem('biometric_enabled', enabled ? '1' : '0');
        setBiometricEnabled(enabled);
        if (!enabled) {
            setPendingSession(null);
            return;
        }
        const sessionToken = await async_storage_1.default.getItem('token');
        const sessionUser = await async_storage_1.default.getItem('user');
        if (!sessionToken || !sessionUser) {
            throw new Error('No saved session available. Please sign in once first.');
        }
        const parsedUser = JSON.parse(sessionUser);
        setStoredSessionAvailable(true);
        setPendingSession({ token: sessionToken, user: parsedUser });
    }
    async function signOut() {
        if (biometricEnabled && biometricAvailable) {
            const [storedToken, storedUser] = await Promise.all([async_storage_1.default.getItem('token'), async_storage_1.default.getItem('user')]);
            if (storedToken && storedUser) {
                api_1.default.defaults.headers.Authorization = '';
                delete api_1.default.defaults.headers['x-business-id'];
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
        await async_storage_1.default.clear();
        api_1.default.defaults.headers.Authorization = '';
        delete api_1.default.defaults.headers['x-business-id'];
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
        await async_storage_1.default.multiRemove(['token', 'user', 'businessId', 'biometric_enabled']);
        api_1.default.defaults.headers.Authorization = '';
        delete api_1.default.defaults.headers['x-business-id'];
        setUser(null);
        setDisplayName('');
        setDesignation('');
        setAvatarUrl('');
        setAuthToken('');
        setPendingSession(null);
        setBiometricEnabled(false);
        setStoredSessionAvailable(false);
    }
    return (<AuthContext.Provider value={{
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
        }}>
      {children}
    </AuthContext.Provider>);
}
function useAuth() {
    const context = (0, react_1.useContext)(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
