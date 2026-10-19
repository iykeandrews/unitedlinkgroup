import axios from "axios";
import {
  getAccessToken,
  activateSession,
  savedSession,
  saveSession,
  removeSession,
} from "./sessionStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import Constants from "expo-constants";

const hostCandidate = (
  Constants?.debuggerHost ||
  Constants?.expoConfig?.hostUri ||
  ""
).split(":")[0];
const envUrl = process.env.EXPO_PUBLIC_API_URL;
const iosDevUrl = hostCandidate
  ? `http://${hostCandidate}:3002`
  : "http://localhost:3002";
const BASE_URL =
  envUrl ||
  (__DEV__
    ? Platform.OS === "android"
      ? "http://10.0.2.2:3002"
      : iosDevUrl
    : "https://www.unitedlinkgroup.com/api");

function toWebBaseUrl(apiBaseUrl: string) {
  let webBaseUrl = String(apiBaseUrl || "").replace(/\/$/, "");
  if (webBaseUrl.includes(":3002")) {
    webBaseUrl = webBaseUrl.replace(":3002", ":3000");
  }
  return webBaseUrl.replace(/\/api$/i, "");
}

export const WEB_BASE_URL = toWebBaseUrl(BASE_URL);
export const PRIVACY_POLICY_URL = `${WEB_BASE_URL || "https://www.unitedlinkgroup.com"}/privacy-policy`;

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

console.log("API base URL", BASE_URL);

api.interceptors.request.use(
  async (config) => {
    const target = new URL(config.url || "", BASE_URL.replace(/\/$/, "") + "/");
    if (target.origin !== new URL(BASE_URL).origin) {
      delete config.headers.Authorization;
      delete config.headers["x-business-id"];
      return config;
    }
    (config as any)._sessionEpoch = sessionEpoch;
    const [token, storedUser, storedBusinessId] = await Promise.all([
      getAccessToken(),
      AsyncStorage.getItem("user"),
      AsyncStorage.getItem("businessId"),
    ]);

    if (token) config.headers.Authorization = `Bearer ${token}`;
    else delete config.headers.Authorization;

    let businessId = String(storedBusinessId || "").trim();
    if (!businessId && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        businessId = String(parsedUser?.businessId || "").trim();
      } catch {}
    }

    if (businessId) {
      config.headers["x-business-id"] = businessId;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

const expiredListeners = new Set<() => void>();
export const onSessionExpired = (listener: () => void) => {
  expiredListeners.add(listener);
  return () => {
    expiredListeners.delete(listener);
  };
};
let sessionEpoch = 0;
let refreshing: Promise<string> | null = null;
export async function refreshSession() {
  if (!refreshing)
    refreshing = (async () => {
      const epoch = sessionEpoch;
      const stored = await savedSession();
      if (!stored.refresh) throw Error("Please sign in again");
      const response = await axios.post(
        BASE_URL + "/auth/mobile-refresh",
        { refreshToken: stored.refresh },
        { timeout: 20000 },
      );
      if (epoch !== sessionEpoch) throw Error("Session changed");
      await saveSession(response.data);
      api.defaults.headers.Authorization =
        "Bearer " + response.data.access_token;
      api.defaults.headers["x-business-id"] = response.data.user.businessId;
      return response.data.access_token as string;
    })().finally(() => {
      refreshing = null;
    });
  return refreshing;
}
export function clearApiSession() {
  sessionEpoch++;
  activateSession(null);
  delete api.defaults.headers.Authorization;
  delete api.defaults.headers["x-business-id"];
}
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config;
    if (
      error?.response?.status !== 401 ||
      !config ||
      String(config.url || "").includes("/auth/")
    )
      return Promise.reject(error);
    if (config._sessionEpoch !== sessionEpoch || !(await getAccessToken()))
      return Promise.reject(error);
    try {
      if (config._sessionRetried) throw Error("Please sign in again");
      const token = await refreshSession();
      config._sessionRetried = true;
      config.headers.Authorization = "Bearer " + token;
      return await api.request(config);
    } catch (refreshError: any) {
      // A connection failure must not erase a valid saved session.
      if (
        refreshError?.response?.status === 401 ||
        (!refreshError?.response &&
          refreshError?.message === "Please sign in again")
      ) {
        await removeSession();
        clearApiSession();
        expiredListeners.forEach((listener) => listener());
      }
      return Promise.reject(refreshError);
    }
  },
);
export default api;
