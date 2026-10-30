import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import api from "../services/api";

const stamp = (value: string) =>
  value
    ? new Date(value).toLocaleString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Not set";
const readable = (value: string) => value?.replace(/_/g, " ") || "";
const ink = "#e8eef9",
  muted = "#a7b4ce",
  panel = "#101b35";
export default function MyQueriesScreen() {
  const navigation = useNavigation<any>(),
    route = useRoute<any>();
  const [id, setId] = useState<string>(route.params?.caseId || ""),
    [record, setRecord] = useState<any>(null),
    [items, setItems] = useState<any[]>([]),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [response, setResponse] = useState(""),
    [error, setError] = useState("");
  const lock = useRef(false),
    request = useRef(0);
  useEffect(() => {
    if (route.params?.caseId) {
      setId(route.params.caseId);
      setRecord(null);
      setResponse("");
    }
  }, [route.params?.caseId]);
  const load = useCallback(async () => {
    const version = ++request.current;
    setLoading(true);
    setError("");
    try {
      const result = await api.get(id ? `/conduct/${id}` : "/conduct", {
        params: id ? undefined : { kind: "QUERY", mine: "true", page },
      });
      if (version !== request.current) return;
      if (id) setRecord(result.data);
      else {
        setItems(result.data.items || []);
        setTotal(result.data.total || 0);
      }
    } catch (e: any) {
      if (version === request.current) {
        setRecord(null);
        setItems([]);
        setError(
          e?.response?.data?.message ||
            "Unable to load your queries. Please retry.",
        );
      }
    } finally {
      if (version === request.current) setLoading(false);
    }
  }, [id, page]);
  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        request.current++;
      };
    }, [load]),
  );
  const act = async (action: string) => {
    if (lock.current || !record) return;
    if (action === "RESPOND" && response.trim().length < 3) {
      Alert.alert("Response required", "Please enter your response.");
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      const result = await api.post(`/conduct/${id}/actions`, {
        action,
        version: record.version,
        message: response.trim() || undefined,
      });
      setRecord(result.data);
      setResponse("");
      Alert.alert(
        "Saved",
        action === "RESPOND"
          ? "Your response is part of the case record."
          : "Receipt acknowledged.",
      );
    } catch (e: any) {
      Alert.alert(
        "Unable to save",
        Array.isArray(e?.response?.data?.message)
          ? e.response.data.message.join("\n")
          : e?.response?.data?.message || "Please try again.",
      );
      if (e?.response?.status === 409) await load();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const control = (label: string, onPress: () => void, disabled = false) => (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={{
        backgroundColor: "#4f46e5",
        padding: 14,
        borderRadius: 12,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text style={{ color: "white", fontWeight: "700", textAlign: "center" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#050816" }}>
      <View
        style={{
          padding: 18,
          flexDirection: "row",
          alignItems: "center",
          gap: 16,
        }}
      >
        <TouchableOpacity
          onPress={() => {
            if (id) {
              setId("");
              setRecord(null);
              setResponse("");
            } else navigation.goBack();
          }}
        >
          <Text style={{ color: ink, fontSize: 18 }}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={{ color: ink, fontWeight: "800", fontSize: 20, flex: 1 }}>
          My queries & decisions
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 18, gap: 16, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => void load()}
            tintColor={ink}
          />
        }
      >
        {error ? (
          <View style={{ gap: 12 }}>
            <Text style={{ color: "#fda4af" }}>{error}</Text>
            {control("Retry", () => void load())}
          </View>
        ) : loading && !record ? (
          <ActivityIndicator color={ink} />
        ) : !id ? (
          <>
            <Text style={{ color: muted }}>
              Review issued queries, share your response and read the company’s
              decision.
            </Text>
            {!items.length && (
              <Text style={{ color: ink, padding: 24 }}>
                No issued queries to show.
              </Text>
            )}
            {items.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => {
                  setId(item.id);
                  setRecord(null);
                }}
                style={{
                  backgroundColor: panel,
                  borderRadius: 16,
                  padding: 18,
                  gap: 8,
                }}
              >
                <Text style={{ color: muted, fontSize: 12 }}>
                  {item.reference} · {readable(item.status)}
                </Text>
                <Text style={{ color: ink, fontWeight: "800", fontSize: 17 }}>
                  {item.title}
                </Text>
                <Text style={{ color: muted }}>
                  Response deadline: {stamp(item.dueAt)}
                </Text>
              </TouchableOpacity>
            ))}
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              {control("Previous", () => setPage(page - 1), page === 1)}
              <Text style={{ color: muted, padding: 14 }}>Page {page}</Text>
              {control("Next", () => setPage(page + 1), page * 25 >= total)}
            </View>
          </>
        ) : record ? (
          <>
            <View
              style={{
                backgroundColor: panel,
                borderRadius: 16,
                padding: 18,
                gap: 12,
              }}
            >
              <Text style={{ color: muted }}>
                {record.reference} · {readable(record.status)}
              </Text>
              <Text style={{ fontSize: 22, color: ink, fontWeight: "800" }}>
                {record.title}
              </Text>
              <Text style={{ color: muted }}>
                Deadline: {stamp(record.dueAt)}
              </Text>
              <Text style={{ color: ink, lineHeight: 23 }}>
                {record.description}
              </Text>
            </View>
            {record.resolution && (
              <View
                style={{
                  backgroundColor: "#12372f",
                  padding: 18,
                  borderRadius: 16,
                  gap: 10,
                }}
              >
                <Text
                  style={{ color: "#a7f3d0", fontWeight: "800", fontSize: 18 }}
                >
                  Company decision
                </Text>
                <Text style={{ color: ink }}>{readable(record.outcome)}</Text>
                <Text style={{ color: ink, lineHeight: 23 }}>
                  {record.resolution}
                </Text>
                <Text style={{ color: ink }}>
                  Corrective action: {record.correctiveAction}
                </Text>
                {record.preventiveAction && (
                  <Text style={{ color: ink }}>
                    Prevention: {record.preventiveAction}
                  </Text>
                )}
              </View>
            )}
            <Text style={{ color: ink, fontWeight: "800", fontSize: 18 }}>
              Case history
            </Text>
            {record.events.map((event: any) => (
              <View
                key={event.id}
                style={{
                  borderLeftWidth: 2,
                  borderLeftColor: "#6366f1",
                  paddingLeft: 16,
                  gap: 8,
                }}
              >
                <Text style={{ color: ink, fontWeight: "700" }}>
                  {readable(event.type)}
                </Text>
                <Text style={{ color: muted, fontSize: 12 }}>
                  {stamp(event.createdAt)} · {event.actorName}
                </Text>
                <Text style={{ color: ink, lineHeight: 23 }}>
                  {event.message}
                </Text>
              </View>
            ))}
            {!["RESOLVED", "CLOSED"].includes(record.status) && (
              <>
                <Text style={{ color: ink, fontWeight: "800" }}>
                  Your response
                </Text>
                <TextInput
                  accessibilityLabel="Your response"
                  value={response}
                  onChangeText={setResponse}
                  multiline
                  editable={!busy}
                  placeholder="Explain your account of the events…"
                  placeholderTextColor={muted}
                  style={{
                    backgroundColor: panel,
                    color: ink,
                    padding: 16,
                    borderRadius: 12,
                    minHeight: 130,
                    textAlignVertical: "top",
                  }}
                />
                {control(
                  busy ? "Saving…" : "Submit response",
                  () => void act("RESPOND"),
                  busy,
                )}
              </>
            )}
            {control(
              busy
                ? "Saving…"
                : record.resolution
                  ? "Acknowledge company decision"
                  : "Acknowledge receipt",
              () => void act("ACKNOWLEDGE"),
              busy,
            )}
            <Text style={{ color: muted, fontSize: 12, lineHeight: 19 }}>
              Acknowledging receipt does not indicate agreement with an
              allegation or decision. Your response remains in the case history.
            </Text>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
