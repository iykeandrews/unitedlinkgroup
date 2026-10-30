import { useEffect } from "react";
import { Alert, AppState, Linking, Platform } from "react-native";
import Constants from "expo-constants";
import api from "../services/api";
import { isNewerVersion } from "../services/appVersion";

export default function AppUpdateReminder() {
  useEffect(() => {
    if (Platform.OS === "web" || Constants.appOwnership === "expo") return;
    let active = true,
      checking = false,
      prompted = "";
    const check = async () => {
      if (checking || !active) return;
      checking = true;
      try {
        const { data } = await api.get("/mobile-release", {
          params: { platform: Platform.OS },
          timeout: 10000,
        });
        const release = data?.release;
        if (
          !active ||
          AppState.currentState !== "active" ||
          !release ||
          prompted === release.version ||
          !isNewerVersion(release.version, Constants.expoConfig?.version || "")
        )
          return;
        if (!/^https:\/\//i.test(release.url)) return;
        prompted = release.version;
        Alert.alert(
          "App update available",
          `Version ${release.version} is available. Update to get the latest improvements.`,
          [
            { text: "Later", style: "cancel" },
            {
              text: "Update",
              onPress: () => {
                void Linking.openURL(release.url).catch(() =>
                  Alert.alert(
                    "Unable to open update",
                    "Please open your app store and search for United Link Group.",
                  ),
                );
              },
            },
          ],
        );
      } catch {
        /* Offline checks must never prevent opening the app. */
      } finally {
        checking = false;
      }
    };
    void check();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void check();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return null;
}
