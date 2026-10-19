import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import api from "./api";
import Constants from "expo-constants";

let notificationsConfigured = false;

function getProjectId() {
  const c: any = Constants as any;
  return (
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    c?.expoConfig?.extra?.eas?.projectId ||
    c?.easConfig?.projectId ||
    c?.expoConfig?.extra?.projectId ||
    null
  );
}

export async function configureExpoNotifications() {
  if (notificationsConfigured) return;
  const Notifications = await import("expo-notifications");
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("default", {
      name: "Company notifications",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
    });
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
  notificationsConfigured = true;
}

export async function registerExpoPush(opts?: {
  requestPermissions?: boolean;
}) {
  await configureExpoNotifications();
  const Notifications = await import("expo-notifications");
  const shouldRequest = opts?.requestPermissions !== false;
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted" && shouldRequest) {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return null;

  const projectId = getProjectId();
  const tokenData = projectId
    ? await Notifications.getExpoPushTokenAsync({ projectId })
    : await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;
  await api.post("/push/register", { platform: "expo", token });
  await AsyncStorage.setItem("device_push_token", token);
  return token;
}

export async function addNotificationResponseListener(
  navigate: (url?: string) => void,
) {
  const Notifications = await import("expo-notifications");
  const handle = (response: any) => {
    const url = response?.notification?.request?.content?.data?.actionUrl;
    if (typeof url === "string") navigate(url);
  };
  const listener =
    Notifications.addNotificationResponseReceivedListener(handle);
  const initial = await Notifications.getLastNotificationResponseAsync();
  if (initial) {
    handle(initial);
    await Notifications.clearLastNotificationResponseAsync();
  }
  return listener;
}
