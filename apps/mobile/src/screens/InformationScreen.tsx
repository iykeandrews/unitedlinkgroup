import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import api from "../services/api";
import { shareMobileFile } from "../services/mobileFiles";
export const readableText = (value: unknown) =>
  String(value || "")
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\/p>|<br\s*\/?>|<\/li>|<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
export default function InformationScreen({ route, navigation }: any) {
  const sop = route.params?.kind === "sop",
    title = sop ? "Standard operating procedures" : "Announcements";
  const [items, setItems] = useState<any[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [selected, setSelected] = useState<any>(null),
    [sharing, setSharing] = useState(false),
    [refreshKey, setRefreshKey] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        try {
          const response = await api.get(
            sop ? "/employee-forms/my-sops" : "/announcements",
          );
          if (active) {
            setItems(response.data || []);
            setError("");
          }
        } catch {
          if (active) setError("Unable to load updates. Pull down to retry.");
        } finally {
          if (active) setLoading(false);
        }
      };
      load();
      const timer = setInterval(() => {
        if (AppState.currentState === "active") load();
      }, 30000);
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") load();
      });
      return () => {
        active = false;
        clearInterval(timer);
        subscription.remove();
      };
    }, [sop, refreshKey]),
  );
  const open = (item: any) => {
    setSelected(item);
    if (!sop && !item.isRead)
      api
        .post("/announcements/" + item.id + "/read")
        .then(() =>
          setItems((previous) =>
            previous.map((row) =>
              row.id === item.id ? { ...row, isRead: true } : row,
            ),
          ),
        )
        .catch(() => {});
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#050816" }}>
      <View
        style={{
          padding: 20,
          flexDirection: "row",
          alignItems: "center",
          gap: 16,
        }}
      >
        <TouchableOpacity
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: "#A5B4FC", fontSize: 18 }}>‹ Back</Text>
        </TouchableOpacity>
        <Text
          style={{ color: "white", fontWeight: "800", fontSize: 20, flex: 1 }}
        >
          {title}
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 14 }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {
              setLoading(true);
              setRefreshKey((value) => value + 1);
            }}
            tintColor="#A5B4FC"
          />
        }
      >
        <Text style={{ color: "#A5B4FC" }}>
          Latest company updates • Refreshes automatically
        </Text>
        {!!error && (
          <Text accessibilityRole="alert" style={{ color: "#FDA4AF" }}>
            {error}
          </Text>
        )}
        {loading && <ActivityIndicator color="#A5B4FC" />}
        {!loading && !error && !items.length && (
          <Text style={{ color: "#CBD5E1" }}>
            No {sop ? "published procedures" : "announcements"} are available
            yet.
          </Text>
        )}
        {items.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => open(item)}
            style={{
              backgroundColor: "#111B30",
              padding: 18,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#29354D",
              gap: 9,
            }}
          >
            <Text style={{ color: "#A5B4FC", fontSize: 12 }}>
              {sop
                ? "SOP" + (item.version ? " · Version " + item.version : "")
                : item.priority + (item.isRead ? "" : " · Unread")}
            </Text>
            <Text style={{ color: "white", fontSize: 17, fontWeight: "700" }}>
              {item.title}
            </Text>
            <Text
              numberOfLines={3}
              style={{ color: "#CBD5E1", lineHeight: 21 }}
            >
              {readableText(item.description || item.content || item.body)}
            </Text>
            <Text style={{ color: "#94A3B8", fontSize: 12 }}>
              {new Date(item.updatedAt || item.createdAt).toLocaleDateString(
                "en-US",
                { timeZone: "America/New_York" },
              )}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <Modal
        visible={!!selected}
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#050816" }}>
          <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
            <TouchableOpacity onPress={() => setSelected(null)}>
              <Text style={{ color: "#A5B4FC" }}>Close</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 24, fontWeight: "800", color: "white" }}>
              {selected?.title}
            </Text>
            <Text
              selectable
              style={{ color: "#E2E8F0", fontSize: 16, lineHeight: 25 }}
            >
              {readableText(
                selected?.content || selected?.body || selected?.description,
              )}
            </Text>
            {selected?.acknowledgementRequired && (
              <Text style={{ color: "#FCD34D" }}>
                If assigned to you for acknowledgement, complete the signed
                acknowledgement in your employment forms.
              </Text>
            )}
            {!!selected?.fileUrl && (
              <TouchableOpacity
                disabled={sharing}
                style={{
                  padding: 16,
                  backgroundColor: "#4F46E5",
                  borderRadius: 12,
                }}
                onPress={async () => {
                  setSharing(true);
                  try {
                    await shareMobileFile(
                      selected.fileUrl,
                      "SOP-" +
                        selected.id +
                        (String(selected.fileUrl).split("?")[0].endsWith(".pdf")
                          ? ".pdf"
                          : ""),
                      String(selected.fileUrl).split("?")[0].endsWith(".pdf"),
                    );
                  } catch (e: any) {
                    Alert.alert("Document", e.message);
                  } finally {
                    setSharing(false);
                  }
                }}
              >
                <Text style={{ color: "white", fontWeight: "700" }}>
                  {sharing ? "Downloading…" : "Open / share attachment"}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
