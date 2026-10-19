import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
let accessToken: string | null = null;
const secret = async (key: string) => {
  const value =
    Platform.OS === "web"
      ? await AsyncStorage.getItem(key)
      : await SecureStore.getItemAsync(key);
  if (value) return value;
  const legacy = await AsyncStorage.getItem(key);
  if (legacy && Platform.OS !== "web") {
    await SecureStore.setItemAsync(key, legacy, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    await AsyncStorage.removeItem(key);
  }
  return legacy;
};
const put = async (key: string, value: string) => {
  if (Platform.OS === "web") await AsyncStorage.setItem(key, value);
  else {
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    await AsyncStorage.removeItem(key);
  }
};
export const getAccessToken = async () => accessToken;
export const activateSession = (token: string | null) => {
  accessToken = token;
};
export async function savedSession() {
  const [token, refresh, user, businessId] = await Promise.all([
    secret("token"),
    secret("refresh_token"),
    AsyncStorage.getItem("user"),
    AsyncStorage.getItem("businessId"),
  ]);
  let profile: any = null;
  try {
    profile = user ? JSON.parse(user) : null;
  } catch {}
  return { token, refresh, user: profile, businessId };
}
export async function saveSession(data: any) {
  if (!data.access_token || !data.user?.businessId)
    throw Error(
      "Your account has no business context. Contact your administrator.",
    );
  await put("token", data.access_token);
  if (data.refresh_token) await put("refresh_token", data.refresh_token);
  await AsyncStorage.multiSet([
    ["user", JSON.stringify(data.user)],
    ["businessId", data.user.businessId],
  ]);
  accessToken = data.access_token;
}
export async function removeSession() {
  accessToken = null;
  if (Platform.OS !== "web")
    await Promise.all([
      SecureStore.deleteItemAsync("token"),
      SecureStore.deleteItemAsync("refresh_token"),
    ]);
  await AsyncStorage.multiRemove([
    "token",
    "refresh_token",
    "user",
    "businessId",
    "biometric_enabled",
  ]);
}
