import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import api, {
  clearApiSession,
  onSessionExpired,
  refreshSession,
} from "../services/api";
import {
  getAccessToken,
  activateSession,
  removeSession,
  savedSession,
  saveSession,
} from "../services/sessionStore";
import { registerExpoPush } from "../services/push";
import { chatFileUrl } from "../services/chatUrls";
interface AuthContextData {
  retrySession: () => Promise<void>;
  user: any;
  displayName: string;
  designation: string;
  avatarUrl: string;
  loading: boolean;
  sessionError: string;
  signIn: (
    email: string,
    password: string,
    opts?: { enableBiometric?: boolean },
  ) => Promise<void>;
  signOut: () => Promise<void>;
  clearSavedSession: () => Promise<void>;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  savedSessionAvailable: boolean;
  biometricSessionAvailable: boolean;
  biometricSignIn: () => Promise<void>;
  setBiometricPreference: (enabled: boolean) => Promise<void>;
}
const AuthContext = createContext<AuthContextData>({} as AuthContextData);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null),
    [displayName, setDisplayName] = useState(""),
    [designation, setDesignation] = useState(""),
    [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true),
    [biometricAvailable, setAvailable] = useState(false),
    [biometricEnabled, setEnabled] = useState(false),
    [savedAvailable, setSaved] = useState(false),
    [sessionError, setError] = useState("");
  const busy = useRef(false),
    bio = useRef(false),
    generation = useRef(0);
  const reset = useCallback(() => {
    generation.current++;
    clearApiSession();
    setUser(null);
    setDisplayName("");
    setDesignation("");
    setAvatarUrl("");
  }, []);
  const hydrate = useCallback(async () => {
    const revision = generation.current;
    const stored = await savedSession();
    if (!stored.token && !stored.refresh)
      throw Error("Please sign in with your official email and password.");
    let token = stored.token;
    if (stored.refresh) token = await refreshSession();
    if (!token) throw Error("Please sign in again");
    activateSession(token);
    api.defaults.headers.Authorization = "Bearer " + token;
    const fresh = await savedSession();
    if (fresh.businessId)
      api.defaults.headers["x-business-id"] = fresh.businessId;
    const response = await api.get("/auth/profile");
    let profile = response.data;
    if (!profile?.businessId)
      throw Error(
        "Your account has no business context. Contact your administrator.",
      );
    api.defaults.headers["x-business-id"] = profile.businessId;
    let employee: any = null;
    if (profile.employeeId) employee = (await api.get("/employees/me")).data;
    if (revision !== generation.current) {
      clearApiSession();
      return;
    }
    profile = {
      ...profile,
      firstName: employee?.firstName || profile.firstName,
      lastName: employee?.lastName || profile.lastName,
      email: employee?.officialEmail || profile.email,
      employeeRole: employee?.role || profile.employeeRole,
    };
    await AsyncStorage.multiSet([
      ["user", JSON.stringify(profile)],
      ["businessId", profile.businessId],
    ]);
    setDisplayName(
      [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
        profile.email ||
        "My account",
    );
    setDesignation(
      employee?.customRole?.name ||
        employee?.department?.name ||
        String(profile.employeeRole || profile.role || "").replace(/_/g, " "),
    );
    setAvatarUrl(
      employee?.profileImageUrl
        ? chatFileUrl(
            employee.profileImageUrl,
            String(api.defaults.baseURL || ""),
            token,
          )
        : "",
    );
    setUser(profile);
    setSaved(true);
    setError("");
    registerExpoPush().catch(() => {});
  }, []);
  const restore = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      const [hardware, enrolled, preference, stored] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        AsyncStorage.getItem("biometric_enabled"),
        savedSession(),
      ]);
      const available = hardware && enrolled;
      setAvailable(available);
      const enabled = preference === "1";
      bio.current = enabled;
      setEnabled(enabled);
      setSaved(!!(stored.token || stored.refresh));
      if ((stored.token || stored.refresh) && !enabled) await hydrate();
      else if (enabled && !available)
        setError("Biometrics are unavailable. Sign in with your password.");
    } catch (error: any) {
      reset();
      if (error?.response?.status === 401) {
        await removeSession();
        setSaved(false);
        bio.current = false;
        setEnabled(false);
      }
      setError(
        error?.response?.status === 401
          ? "Your session expired. Please sign in again."
          : "Unable to restore your session. Check your connection and try again.",
      );
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [hydrate, reset]);
  useEffect(() => {
    restore();
    const off = onSessionExpired(() => {
      reset();
      setSaved(false);
      setError("Your session expired. Please sign in again.");
    });
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background" && bio.current) {
        reset();
      }
      if (state === "active" && !busy.current) {
        restore();
      }
    });
    return () => {
      off();
      subscription.remove();
    };
  }, [restore, reset]);
  const challenge = async () => {
    if (!biometricAvailable)
      throw Error(
        "Set up Face ID, Touch ID, or fingerprint in your device settings first.",
      );
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Unlock United Link",
      cancelLabel: "Use password",
      disableDeviceFallback: true,
    });
    if (!result.success)
      throw Error(
        result.error === "user_cancel" || result.error === "system_cancel"
          ? "Biometric sign-in cancelled. Use your password or try again."
          : "Unable to verify biometrics. Please use your password.",
      );
  };
  const signIn = async (
    email: string,
    password: string,
    opts?: { enableBiometric?: boolean },
  ) => {
    if (busy.current) throw Error("Sign-in is already in progress");
    busy.current = true;
    try {
      reset();
      await removeSession();
      setSaved(false);
      const response = await api.post("/auth/mobile-login", {
        email: email.trim(),
        password,
      });
      await saveSession(response.data);
      let enabled = false;
      if (opts?.enableBiometric) {
        await challenge();
        enabled = true;
      }
      await AsyncStorage.setItem("biometric_enabled", enabled ? "1" : "0");
      bio.current = enabled;
      setEnabled(enabled);
      await hydrate();
    } catch (error) {
      reset();
      await removeSession();
      setSaved(false);
      bio.current = false;
      setEnabled(false);
      throw error;
    } finally {
      busy.current = false;
    }
  };
  const biometricSignIn = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      if (!bio.current)
        throw Error(
          "Enable biometric login after signing in with your password.",
        );
      await challenge();
      await hydrate();
    } catch (error: any) {
      reset();
      if (error?.response?.status === 401) {
        await removeSession();
        setSaved(false);
        bio.current = false;
        setEnabled(false);
      }
      throw error;
    } finally {
      busy.current = false;
    }
  };
  const setBiometricPreference = async (enabled: boolean) => {
    if (enabled) {
      await challenge();
      const stored = await savedSession();
      if (!stored.refresh)
        throw Error(
          "Sign in again with your password to enable secure biometric login.",
        );
    }
    await AsyncStorage.setItem("biometric_enabled", enabled ? "1" : "0");
    bio.current = enabled;
    setEnabled(enabled);
  };
  const clearSavedSession = async () => {
    const expoToken = await AsyncStorage.getItem("device_push_token");
    if (expoToken && (await getAccessToken()))
      await api
        .delete("/push/register", {
          data: { platform: "expo", token: expoToken },
          timeout: 5000,
        })
        .catch(() => {});
    const stored = await savedSession();
    reset();
    await removeSession();
    setSaved(false);
    bio.current = false;
    setEnabled(false);
    setError("");
    if (stored.refresh)
      api
        .post(
          "/auth/mobile-logout",
          { refreshToken: stored.refresh, expoToken },
          { timeout: 5000 },
        )
        .catch(() => {});
  };

  return (
    <AuthContext.Provider
      value={{
        retrySession: restore,
        user,
        displayName,
        designation,
        avatarUrl,
        loading,
        sessionError,
        signIn,
        signOut: clearSavedSession,
        clearSavedSession,
        biometricAvailable,
        biometricEnabled,
        savedSessionAvailable: savedAvailable,
        biometricSessionAvailable:
          savedAvailable && biometricEnabled && biometricAvailable,
        biometricSignIn,
        setBiometricPreference,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
