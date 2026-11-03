import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import api from "../services/api";

const ink = "#e8eef9",
  muted = "#b6c4de",
  panel = "#101b35";
const person = (e: any) =>
  [e?.firstName, e?.lastName].filter(Boolean).join(" ");
const stamp = (v: string) =>
  new Date(v).toLocaleString("en-US", { timeZone: "America/New_York" });
const submission = () =>
  `assessment-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
export default function OfficerAssessmentsScreen() {
  const navigation = useNavigation<any>();
  const [options, setOptions] = useState<any>(null),
    [rows, setRows] = useState<any[]>([]),
    [total, setTotal] = useState(0),
    [page, setPage] = useState(1),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [form, setForm] = useState<any>(null),
    [picker, setPicker] = useState<any>(null),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("");
  const lock = useRef(false),
    generation = useRef(0);
  const load = useCallback(async () => {
    const revision = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const [config, result] = await Promise.all([
        api.get("/time-tracking/assessments/options"),
        api.get("/time-tracking/assessments", { params: { page } }),
      ]);
      if (revision !== generation.current) return;
      setOptions(config.data);
      setRows(result.data.rows);
      setTotal(result.data.total);
    } catch (e: any) {
      if (revision === generation.current) {
        setRows([]);
        setError(
          String(
            e.response?.data?.message ||
              "Unable to load assessments. Pull down to retry.",
          ),
        );
      }
    } finally {
      if (revision === generation.current) setLoading(false);
    }
  }, [page]);
  useFocusEffect(
    useCallback(() => {
      load();
      return () => {
        generation.current++;
      };
    }, [load]),
  );
  const button = (title: string, onPress: () => void) => (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
      style={{
        padding: 13,
        borderRadius: 10,
        backgroundColor: "#4338ca",
        marginTop: 10,
        opacity: busy ? 0.5 : 1,
      }}
    >
      <Text style={{ color: ink, fontWeight: "700" }}>{title}</Text>
    </TouchableOpacity>
  );
  const choose = (
    title: string,
    items: any[],
    select: (value: any) => void,
  ) => {
    setSearch("");
    setPicker({ title, items, select });
  };
  const start = () =>
    setForm({
      submissionId: submission(),
      employeeId: "",
      locationId: "",
      observedAt: new Date().toISOString(),
      ratings: Object.fromEntries(options.criteria.map((k: string) => [k, 0])),
      checklist: Object.fromEntries(
        options.checklist.map((k: string) => [k, "NOT_OBSERVED"]),
      ),
      notes: "",
      action: "No action required",
      followUpDate: "",
    });
  const submit = async () => {
    if (lock.current) return;
    if (!form.employeeId || !form.locationId || form.notes.trim().length < 10)
      return Alert.alert(
        "Complete the assessment",
        "Select the officer and site, add ratings, and provide an objective written assessment.",
      );
    let followUpAt: any = null;
    if (form.followUpDate) {
      const match = form.followUpDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (!match)
        return Alert.alert("Invalid follow-up date", "Use MM/DD/YYYY.");
      const date = `${match[3]}-${match[1]}-${match[2]}`;
      const value = new Date(date + "T23:59:00Z");
      if (!Number.isFinite(+value) || value.toISOString().slice(0, 10) !== date)
        return Alert.alert(
          "Invalid follow-up date",
          "Choose a valid calendar date.",
        );
      followUpAt = value.toISOString();
    }
    lock.current = true;
    setBusy(true);
    try {
      await api.post("/time-tracking/assessments", { ...form, followUpAt });
      setForm(null);
      if (page === 1) await load();
      else setPage(1);
      Alert.alert(
        "Assessment shared",
        "The officer can view the score, findings and follow-up action.",
      );
    } catch (e: any) {
      Alert.alert(
        "Unable to submit",
        String(
          e.response?.data?.message ||
            "Please retry. Your form has been retained.",
        ),
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#050816" }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 18, gap: 14, paddingBottom: 45 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} />
        }
      >
        {button("Back", () => navigation.goBack())}
        <Text style={{ color: ink, fontSize: 25, fontWeight: "800" }}>
          Officer assessments
        </Text>
        <Text style={{ color: muted }}>
          Site inspection, performance feedback and coaching. Scores reflect
          observed criteria only. All submitted findings are visible to the
          officer.
        </Text>
        {!!error && (
          <Text accessibilityRole="alert" style={{ color: "#fda4af" }}>
            {error}
          </Text>
        )}
        {loading && !options && <ActivityIndicator />}
        {options?.canAssess && !form && button("New site assessment", start)}
        {form && (
          <View
            style={{
              backgroundColor: panel,
              borderRadius: 16,
              padding: 16,
              gap: 10,
            }}
          >
            <Text style={{ color: ink, fontSize: 20, fontWeight: "800" }}>
              Site inspection & coaching
            </Text>
            <Text style={{ color: muted }}>
              Observed: {stamp(form.observedAt)} (site time). Records are
              retained; submit a new assessment for a correction.
            </Text>
            {button(
              "Officer: " +
                (person(
                  options.employees.find((e: any) => e.id === form.employeeId),
                ) || "Select officer ▾"),
              () =>
                choose(
                  "Select officer",
                  options.employees.map((e: any) => ({
                    value: e.id,
                    label: person(e),
                  })),
                  (value) => setForm((f: any) => ({ ...f, employeeId: value })),
                ),
            )}
            {button(
              "Site: " +
                (options.locations.find((l: any) => l.id === form.locationId)
                  ?.name || "Select location ▾"),
              () =>
                choose(
                  "Select location",
                  options.locations.map((l: any) => ({
                    value: l.id,
                    label: l.name,
                  })),
                  (value) => setForm((f: any) => ({ ...f, locationId: value })),
                ),
            )}
            <Text
              style={{
                color: ink,
                fontSize: 18,
                fontWeight: "700",
                marginTop: 10,
              }}
            >
              Performance ratings
            </Text>
            <Text style={{ color: muted }}>
              1 — Unsatisfactory · 2 — Needs improvement · 3 — Meets
              expectations · 4 — Exceeds expectations · 5 — Outstanding. Not
              observed is excluded from the score.
            </Text>
            {options.criteria.map((criterion: string) => (
              <View key={criterion}>
                <Text style={{ color: ink, marginTop: 8 }}>{criterion}</Text>
                {button(
                  (form.ratings[criterion] || "Not observed") + " ▾",
                  () =>
                    choose(
                      criterion,
                      [
                        { value: 0, label: "Not observed" },
                        { value: 1, label: "1 — Unsatisfactory" },
                        { value: 2, label: "2 — Needs improvement" },
                        { value: 3, label: "3 — Meets expectations" },
                        { value: 4, label: "4 — Exceeds expectations" },
                        { value: 5, label: "5 — Outstanding" },
                      ],
                      (value) =>
                        setForm((f: any) => ({
                          ...f,
                          ratings: { ...f.ratings, [criterion]: value },
                        })),
                    ),
                )}
              </View>
            ))}
            <Text
              style={{
                color: ink,
                fontSize: 18,
                fontWeight: "700",
                marginTop: 12,
              }}
            >
              Inspection checklist
            </Text>
            {options.checklist.map((check: string) => (
              <View key={check}>
                <Text style={{ color: ink, marginTop: 8 }}>{check}</Text>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  {[
                    ["MET", "Met"],
                    ["NOT_MET", "Not met"],
                    ["NOT_OBSERVED", "Not observed"],
                  ].map(([value, label]) => (
                    <TouchableOpacity
                      key={value}
                      accessibilityRole="checkbox"
                      accessibilityState={{
                        checked: form.checklist[check] === value,
                      }}
                      disabled={busy}
                      onPress={() =>
                        setForm((f: any) => ({
                          ...f,
                          checklist: { ...f.checklist, [check]: value },
                        }))
                      }
                      style={{
                        padding: 10,
                        borderWidth: 1,
                        borderColor: "#7182a4",
                        borderRadius: 8,
                        marginTop: 8,
                      }}
                    >
                      <Text style={{ color: ink }}>
                        {form.checklist[check] === value ? "☑" : "☐"} {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
            <Text style={{ color: ink, fontWeight: "700", marginTop: 12 }}>
              Findings, strengths, violations & coaching
            </Text>
            <TextInput
              accessibilityLabel="Assessment narrative"
              editable={!busy}
              multiline
              value={form.notes}
              onChangeText={(notes) => setForm((f: any) => ({ ...f, notes }))}
              maxLength={6000}
              placeholder="Describe objective observations, any post-order violations, and agreed improvement steps."
              placeholderTextColor="#8494b1"
              style={{
                color: ink,
                borderWidth: 1,
                borderColor: "#7182a4",
                padding: 12,
                minHeight: 140,
                borderRadius: 8,
                textAlignVertical: "top",
              }}
            />
            {button("Follow-up: " + form.action + " ▾", () =>
              choose(
                "Follow-up action",
                options.actions.map((a: string) => ({ value: a, label: a })),
                (value) => setForm((f: any) => ({ ...f, action: value })),
              ),
            )}
            <Text style={{ color: muted }}>
              Follow-up date (required for training or management review)
            </Text>
            <TextInput
              accessibilityLabel="Follow-up date MM/DD/YYYY"
              value={form.followUpDate}
              editable={!busy}
              onChangeText={(followUpDate) =>
                setForm((f: any) => ({ ...f, followUpDate }))
              }
              placeholder="MM/DD/YYYY"
              placeholderTextColor="#8494b1"
              style={{
                color: ink,
                borderWidth: 1,
                borderColor: "#7182a4",
                padding: 12,
                borderRadius: 8,
              }}
            />
            {button(busy ? "Submitting…" : "Submit & share with officer", () =>
              Alert.alert(
                "Share assessment",
                "The officer will be able to see all scores and written findings. Submit this assessment?",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Submit", onPress: submit },
                ],
              ),
            )}
            {button("Cancel", () => setForm(null))}
          </View>
        )}
        <TextInput
          accessibilityLabel="Search assessments on this page"
          value={filter}
          onChangeText={setFilter}
          placeholder="Search this page by officer or site"
          placeholderTextColor="#8494b1"
          style={{
            color: ink,
            borderWidth: 1,
            borderColor: "#7182a4",
            padding: 12,
            borderRadius: 8,
          }}
        />
        {!loading && !rows.length && (
          <Text style={{ color: muted }}>
            No assessments have been issued yet.
          </Text>
        )}
        {rows
          .filter((r) =>
            `${person(r.employee)} ${r.location?.name || ""}`
              .toLowerCase()
              .includes(filter.toLowerCase()),
          )
          .map((r) => (
            <View
              key={r.id}
              style={{
                backgroundColor: panel,
                borderRadius: 16,
                padding: 16,
                gap: 10,
              }}
            >
              <Text style={{ color: ink, fontSize: 20, fontWeight: "800" }}>
                {person(r.employee)} · {r.score}%
              </Text>
              <Text style={{ color: muted }}>
                {r.location?.name} · {stamp(r.observedAt)}
              </Text>
              <Text style={{ color: muted }}>
                Assessed by {person(r.evaluator)} · Submitted{" "}
                {stamp(r.createdAt)}
              </Text>
              {Object.entries(r.ratings).map(([key, value]) => (
                <Text key={key} style={{ color: ink }}>
                  {key}: {Number(value) > 0 ? `${value}/5` : "Not observed"}
                </Text>
              ))}
              {Object.entries(r.checklist).map(([key, value]) => (
                <Text key={key} style={{ color: muted }}>
                  {value === "MET" ? "☑" : "☐"} {key}:{" "}
                  {String(value).replace(/_/g, " ")}
                </Text>
              ))}
              <Text style={{ color: ink, lineHeight: 23 }}>{r.notes}</Text>
              <Text style={{ color: "#a5b4fc", fontWeight: "700" }}>
                {r.action}
              </Text>
              {r.followUpAt && (
                <Text style={{ color: muted }}>
                  Follow-up by {stamp(r.followUpAt)}
                </Text>
              )}
            </View>
          ))}
        <Text style={{ color: muted }}>
          Page {page} · {total} assessment{total === 1 ? "" : "s"}
        </Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          {page > 1 && button("Previous", () => setPage((p) => p - 1))}
          {page * 30 < total && button("Next", () => setPage((p) => p + 1))}
        </View>
      </ScrollView>
      <Modal
        visible={!!picker}
        animationType="slide"
        onRequestClose={() => setPicker(null)}
      >
        <SafeAreaView
          style={{ flex: 1, backgroundColor: "#050816", padding: 18 }}
        >
          <Text style={{ color: ink, fontSize: 22, fontWeight: "700" }}>
            {picker?.title}
          </Text>
          {button("Close", () => setPicker(null))}
          <TextInput
            autoFocus
            value={search}
            onChangeText={setSearch}
            accessibilityLabel="Search dropdown options"
            placeholder="Search options"
            placeholderTextColor="#8494b1"
            style={{
              color: ink,
              borderWidth: 1,
              borderColor: "#7182a4",
              padding: 12,
              marginVertical: 12,
            }}
          />
          <ScrollView keyboardShouldPersistTaps="handled">
            {picker?.items
              .filter((i: any) =>
                i.label.toLowerCase().includes(search.toLowerCase()),
              )
              .map((item: any) => (
                <TouchableOpacity
                  key={String(item.value)}
                  accessibilityRole="button"
                  onPress={() => {
                    picker.select(item.value);
                    setPicker(null);
                  }}
                  style={{
                    padding: 18,
                    borderBottomWidth: 1,
                    borderBottomColor: "#334155",
                  }}
                >
                  <Text style={{ color: ink, fontSize: 16 }}>{item.label}</Text>
                </TouchableOpacity>
              ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
