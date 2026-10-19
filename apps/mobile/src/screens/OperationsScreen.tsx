import { useAuth } from "../context/AuthContext";
import React, { useCallback, useState, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import api from "../services/api";
import { siteLabel, wallParts, wallToIso } from "../services/operationsTime";
import { navigate } from "../navigation/NavigationService";
const name = (e: any) =>
  e ? [e.firstName, e.lastName].filter(Boolean).join(" ") : "Open shift";
const label = (text: string) => text.replace(/_/g, " ");
const colors: any = {
  LATE: "#FDA4AF",
  MISSED: "#FDA4AF",
  ON_BREAK: "#FCD34D",
  CLOCKED_IN: "#6EE7B7",
  CLOCKED_OUT: "#A5B4FC",
};
export default function OperationsScreen() {
  const { user } = useAuth();
  const [date, setDate] = useState(
      wallParts(new Date().toISOString(), "America/New_York").date,
    ),
    [datePicker, setDatePicker] = useState(false),
    [dateDraft, setDateDraft] = useState(new Date());
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [query, setQuery] = useState(""),
    [location, setLocation] = useState(""),
    [status, setStatus] = useState("ALL");
  const [officerPicker, setOfficerPicker] = useState(false),
    [officerQuery, setOfficerQuery] = useState(""),
    [alerts, setAlerts] = useState<any[]>([]),
    [showAlerts, setShowAlerts] = useState(false);
  const [edit, setEdit] = useState<any>(null),
    [reason, setReason] = useState(""),
    [picker, setPicker] = useState<any>(null),
    [revision, setRevision] = useState(0);
  const working = useRef(false);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const controller = new AbortController();
      setLoading(true);
      const load = async () => {
        try {
          const response = await api.get("/time-tracking/operations/roster", {
            params: { date },
            signal: controller.signal,
          });
          if (active) {
            setData(response.data);
            setError("");
          }
          if (response.data.canManage) {
            const notifications = await api.get("/notifications", {
              signal: controller.signal,
            });
            if (active)
              setAlerts(
                (notifications.data || [])
                  .filter((n: any) => n.type === "ATTENDANCE")
                  .slice(0, 100),
              );
          }
        } catch (e: any) {
          if (active && !controller.signal.aborted)
            setError(
              e?.response?.data?.message ||
                "Unable to load operations. Pull down to retry.",
            );
        } finally {
          if (active) setLoading(false);
        }
      };
      setData(null);
      load();
      const timer = setInterval(() => {
        if (AppState.currentState === "active" && !working.current) load();
      }, 15000);
      const subscription = AppState.addEventListener("change", (s) => {
        if (s === "active") load();
      });
      return () => {
        active = false;
        controller.abort();
        clearInterval(timer);
        subscription.remove();
      };
    }, [date, revision]),
  );
  const refresh = () => setRevision((v) => v + 1);
  const mutate = async (
    path: string,
    body: any,
    method: "post" | "patch" = "post",
  ) => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    try {
      await api[method](path, body);
      setOfficerPicker(false);
      setEdit(null);
      refresh();
    } catch (e: any) {
      Alert.alert(
        "Unable to save",
        String(e?.response?.data?.message || e.message || "Please try again."),
      );
    } finally {
      working.current = false;
      setBusy(false);
    }
  };
  const confirmClock = (employee: any, active: any) =>
    Alert.alert(
      active ? "Clock out officer" : "Clock in officer",
      `${name(employee)}${active ? " will be clocked out now. Any running break will also end." : " will be clocked in now. Their scheduled site is assigned automatically; otherwise the site stays pending."}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: active ? "Clock out" : "Clock in",
          onPress: () =>
            mutate(
              "/time-tracking/admin/" + (active ? "clock-out" : "clock-in"),
              { employeeId: employee.id },
            ),
        },
      ],
    );
  const openEdit = (sheet: any) => {
    setEdit({
      ...sheet,
      originalEndTime: sheet.endTime,
      breaks: sheet.breaks.map((b: any) => ({ ...b })),
      zone: sheet.timeZone || "America/New_York",
    });
    setReason("");
  };
  const saveEdit = () => {
    if (!reason.trim())
      return Alert.alert(
        "Reason required",
        "Explain the correction for the attendance audit trail.",
      );
    mutate(
      "/time-tracking/operations/timesheets/" + edit.id,
      {
        startTime: edit.startTime,
        endTime: edit.endTime,
        status: edit.endTime
          ? edit.status === "APPROVED"
            ? "APPROVED"
            : "PENDING"
          : "IN_PROGRESS",
        breaks: edit.breaks.map(({ startTime, endTime, type }: any) => ({
          startTime,
          endTime,
          type,
        })),
        reason: reason.trim(),
      },
      "patch",
    );
  };
  const pickField = (
    field: string,
    index?: number,
    mode: "date" | "time" = "time",
  ) => {
    const current =
      index === undefined ? edit[field] : edit.breaks[index][field];
    const parts = wallParts(current || edit.startTime, edit.zone);
    setPicker({
      field,
      index,
      mode,
      date: parts.date,
      time: parts.time,
      original: current,
      value: new Date(parts.date + "T" + parts.time + ":00"),
    });
  };
  const applyPicker = (value: Date) => {
    try {
      let date =
        picker.mode === "date"
          ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
          : picker.date;
      const time =
        picker.mode === "time"
          ? `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`
          : picker.time;
      if (picker.index !== undefined && picker.mode === "time") {
        const anchor =
          picker.field === "endTime"
            ? edit.breaks[picker.index].startTime
            : edit.startTime;
        date = wallParts(anchor, edit.zone).date;
        if (+new Date(wallToIso(date, time, edit.zone)) < +new Date(anchor)) {
          const next = new Date(date + "T12:00:00Z");
          next.setUTCDate(next.getUTCDate() + 1);
          date = next.toISOString().slice(0, 10);
        }
      }
      const iso = wallToIso(date, time, edit.zone, picker.original);
      setEdit((current: any) =>
        picker.index === undefined
          ? { ...current, [picker.field]: iso }
          : {
              ...current,
              breaks: current.breaks.map((b: any, i: number) =>
                i === picker.index ? { ...b, [picker.field]: iso } : b,
              ),
            },
      );
    } catch (e: any) {
      Alert.alert("Time", e.message);
    } finally {
      setPicker(null);
    }
  };
  const button = (title: string, onPress: () => void, disabled = false) => (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={disabled || busy}
      onPress={onPress}
      style={[styles.button, { opacity: disabled || busy ? 0.45 : 1 }]}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
  const activeFor = (id: string) =>
    data?.active?.find((s: any) => s.employeeId === id);
  const attendanceActions = (employee: any, sheet?: any) =>
    data?.canManage && employee ? (
      <View style={styles.row}>
        {button(activeFor(employee.id) ? "Clock out" : "Clock in", () =>
          confirmClock(employee, activeFor(employee.id)),
        )}
        {sheet &&
          !sheet.paidExternally &&
          button("Adjust time / breaks", () => openEdit(sheet))}
        {sheet?.endTime &&
          sheet.status === "PENDING" &&
          !sheet.paidExternally &&
          button("Approve time", () =>
            Alert.alert("Approve attendance", name(employee), [
              { text: "Cancel", style: "cancel" },
              {
                text: "Approve",
                onPress: () =>
                  mutate(
                    "/time-tracking/operations/timesheets/" + sheet.id,
                    {
                      status: "APPROVED",
                      reason: "Approved by administrator in mobile operations",
                    },
                    "patch",
                  ),
              },
            ]),
          )}
        {sheet &&
          !sheet.endTime &&
          button(
            sheet.breaks.some((b: any) => !b.endTime)
              ? "End break"
              : "Start break",
            () => {
              if (sheet.breaks.some((b: any) => !b.endTime))
                return Alert.alert("End break", name(employee), [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "End break",
                    onPress: () =>
                      mutate("/time-tracking/operations/break", {
                        employeeId: employee.id,
                        action: "end",
                      }),
                  },
                ]);
              Alert.alert("Start break", name(employee), [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Unpaid",
                  onPress: () =>
                    mutate("/time-tracking/operations/break", {
                      employeeId: employee.id,
                      action: "start",
                      type: "UNPAID",
                    }),
                },
                {
                  text: "Paid",
                  onPress: () =>
                    mutate("/time-tracking/operations/break", {
                      employeeId: employee.id,
                      action: "start",
                      type: "PAID",
                    }),
                },
              ]);
            },
          )}
      </View>
    ) : null;
  const locations = [
    ...new Map(
      (data?.shifts || [])
        .filter((s: any) => s.location)
        .map((s: any) => [s.location.id, s.location]),
    ).values(),
  ] as any[];
  const filtered = (data?.shifts || []).filter(
    (s: any) =>
      (!location || s.locationId === location) &&
      (status === "ALL" || s.state === status) &&
      `${name(s.employee)} ${s.location?.name || ""} ${s.employee?.badgeNumber || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <SafeAreaView style={styles.page}>
      <ScrollView
        contentContainerStyle={{ padding: 18, gap: 14, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor="#A5B4FC"
          />
        }
      >
        <Text style={styles.title}>Team operations</Text>
        <Text style={styles.muted}>
          {data?.canManage
            ? "Business-wide scheduling and attendance"
            : "Read-only follow-up at your scheduled locations and dates"}{" "}
          · Refreshes every 15 seconds
        </Text>
        <View style={styles.row}>
          {user?.employeeId &&
            button("My schedule", () =>
              navigate("Schedule", { screen: "PersonalSchedule" }),
            )}
          {button(
            date.split("-").slice(1).concat(date.slice(0, 4)).join("/"),
            () => {
              setDateDraft(new Date(date + "T12:00:00"));
              setDatePicker(true);
            },
          )}
          {data?.canManage &&
            button(`Alerts (${alerts.filter((a) => !a.read).length})`, () =>
              setShowAlerts(true),
            )}
        </View>
        {!!error && (
          <Text accessibilityRole="alert" style={{ color: "#FDA4AF" }}>
            {error}
          </Text>
        )}
        {loading && !data && <ActivityIndicator color="#A5B4FC" />}
        {data && (
          <>
            <View style={styles.card}>
              <Text style={styles.subtitle}>
                {data.shifts.length} scheduled ·{" "}
                {
                  data.shifts.filter((s: any) => s.state === "CLOCKED_IN")
                    .length
                }{" "}
                working ·{" "}
                {data.shifts.filter((s: any) => s.state === "ON_BREAK").length}{" "}
                on break ·{" "}
                {data.shifts.filter((s: any) => s.state === "LATE").length} late
              </Text>
              {data.canManage &&
                button("Clock in / out any officer", () =>
                  setOfficerPicker(true),
                )}
            </View>
            <TextInput
              accessibilityLabel="Search officers or locations"
              placeholder="Search officer, worker ID or location"
              placeholderTextColor="#94A3B8"
              value={query}
              onChangeText={setQuery}
              style={styles.input}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.row}>
                {button(location ? "All locations" : "✓ All locations", () =>
                  setLocation(""),
                )}
                {locations.map((l) => (
                  <View key={l.id}>
                    {button((location === l.id ? "✓ " : "") + l.name, () =>
                      setLocation(l.id),
                    )}
                  </View>
                ))}
              </View>
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.row}>
                {[
                  "ALL",
                  "CLOCKED_IN",
                  "ON_BREAK",
                  "LATE",
                  "MISSED",
                  "CLOCKED_OUT",
                ].map((v) => (
                  <View key={v}>
                    {button((status === v ? "✓ " : "") + label(v), () =>
                      setStatus(v),
                    )}
                  </View>
                ))}
              </View>
            </ScrollView>
            {!filtered.length && (
              <Text style={styles.muted}>
                No shifts match this date and your permitted locations.
              </Text>
            )}
            {filtered.map((s: any) => (
              <View key={s.id} style={styles.card}>
                <View style={styles.row}>
                  <Text style={[styles.subtitle, { flex: 1 }]}>
                    {name(s.employee)}
                  </Text>
                  <Text
                    style={{
                      color: colors[s.state] || "#CBD5E1",
                      fontWeight: "800",
                    }}
                  >
                    {label(s.state)}
                  </Text>
                </View>
                <Text style={styles.text}>
                  {s.location?.name || "Location pending"}
                </Text>
                <Text style={styles.muted}>
                  {s.employee?.department?.name ||
                    s.employee?.customRole?.name ||
                    ""}
                </Text>
                <Text style={styles.text}>
                  {siteLabel(
                    s.startTime,
                    s.timeZone || s.location?.timeZone || "America/New_York",
                  )}{" "}
                  –{" "}
                  {siteLabel(
                    s.endTime,
                    s.timeZone || s.location?.timeZone || "America/New_York",
                  )}
                </Text>
                <Text style={styles.muted}>{s.status} · Work-site time</Text>
                {s.attendance.map((t: any) => (
                  <View key={t.id} style={{ gap: 8, paddingTop: 10 }}>
                    <Text style={styles.text}>
                      Actual:{" "}
                      {siteLabel(t.startTime, t.timeZone || "America/New_York")}{" "}
                      –{" "}
                      {t.endTime
                        ? siteLabel(t.endTime, t.timeZone || "America/New_York")
                        : "In progress"}
                    </Text>
                    <Text style={styles.muted}>
                      {t.status} · {t.breaks.length} break(s)
                      {t.paidExternally ? " · Paid history (read-only)" : ""}
                    </Text>
                    {attendanceActions(s.employee, t)}
                  </View>
                ))}
                {!s.attendance.length && attendanceActions(s.employee)}
              </View>
            ))}
            {data.canManage && data.active.length > 0 && (
              <>
                <Text style={styles.subtitle}>All running attendance</Text>
                {data.active.map((t: any) => (
                  <View key={t.id} style={styles.card}>
                    <Text style={styles.subtitle}>{name(t.employee)}</Text>
                    <Text style={styles.text}>
                      {t.location?.name ||
                        "Location pending — assign in time tracking"}
                    </Text>
                    <Text style={styles.muted}>
                      {siteLabel(t.startTime, t.timeZone || "America/New_York")}{" "}
                      ·{" "}
                      {t.breaks.some((b: any) => !b.endTime)
                        ? "On break"
                        : "Working"}
                    </Text>
                    {attendanceActions(t.employee, t)}
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
      <Modal
        visible={datePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setDatePicker(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            padding: 24,
            backgroundColor: "rgba(0,0,0,0.75)",
          }}
        >
          <View style={styles.card}>
            <Text style={styles.subtitle}>Schedule date</Text>
            <DateTimePicker
              themeVariant="dark"
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              value={dateDraft}
              onChange={(event, value) => {
                if (event.type === "dismissed") {
                  setDatePicker(false);
                  return;
                }
                if (value) {
                  setDateDraft(value);
                  if (Platform.OS !== "ios") {
                    setLocation("");
                    setDate(
                      value.getFullYear() +
                        "-" +
                        String(value.getMonth() + 1).padStart(2, "0") +
                        "-" +
                        String(value.getDate()).padStart(2, "0"),
                    );
                    setDatePicker(false);
                  }
                }
              }}
            />
            <View style={styles.row}>
              {button("Cancel", () => setDatePicker(false))}
              {button("Apply date", () => {
                setLocation("");
                setDate(
                  dateDraft.getFullYear() +
                    "-" +
                    String(dateDraft.getMonth() + 1).padStart(2, "0") +
                    "-" +
                    String(dateDraft.getDate()).padStart(2, "0"),
                );
                setDatePicker(false);
              })}
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={officerPicker}
        animationType="slide"
        onRequestClose={() => setOfficerPicker(false)}
      >
        <SafeAreaView style={styles.page}>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
            {button("Close", () => setOfficerPicker(false))}
            <Text style={styles.title}>Officer attendance</Text>
            <TextInput
              style={styles.input}
              placeholder="Search officer"
              placeholderTextColor="#94A3B8"
              value={officerQuery}
              onChangeText={setOfficerQuery}
            />
            {data?.officers
              ?.filter((e: any) =>
                `${name(e)} ${e.badgeNumber || ""}`
                  .toLowerCase()
                  .includes(officerQuery.toLowerCase()),
              )
              .map((e: any) => (
                <View key={e.id} style={styles.card}>
                  <Text style={styles.subtitle}>{name(e)}</Text>
                  <Text style={styles.muted}>
                    {e.badgeNumber || ""} ·{" "}
                    {activeFor(e.id) ? "Clocked in" : "Clocked out"}
                  </Text>
                  {attendanceActions(e, activeFor(e.id))}
                </View>
              ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
      <Modal
        visible={showAlerts}
        animationType="slide"
        onRequestClose={() => setShowAlerts(false)}
      >
        <SafeAreaView style={styles.page}>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
            {button("Close alerts", () => setShowAlerts(false))}
            <Text style={styles.title}>Attendance alerts</Text>
            {!alerts.length && (
              <Text style={styles.muted}>No attendance alerts yet.</Text>
            )}
            {alerts.map((a) => (
              <TouchableOpacity
                key={a.id}
                style={styles.card}
                onPress={() =>
                  api
                    .patch("/notifications/" + a.id + "/read")
                    .then(() =>
                      setAlerts((rows) =>
                        rows.map((row) =>
                          row.id === a.id ? { ...row, read: true } : row,
                        ),
                      ),
                    )
                    .catch(() =>
                      Alert.alert(
                        "Alerts",
                        "Unable to mark this alert as read.",
                      ),
                    )
                }
              >
                <Text style={styles.subtitle}>
                  {a.read ? "" : "● "}
                  {a.title}
                </Text>
                <Text style={styles.text}>{a.message}</Text>
                <Text style={styles.muted}>
                  {siteLabel(a.createdAt, "America/New_York")}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
      <Modal
        visible={!!edit}
        animationType="slide"
        onRequestClose={() => !busy && setEdit(null)}
      >
        <SafeAreaView style={styles.page}>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
            {button("Cancel", () => setEdit(null))}
            <Text style={styles.title}>Adjust attendance</Text>
            <Text style={styles.muted}>
              All times are in {edit?.zone}. Corrections are audited. Paid
              payroll is protected.
            </Text>
            {edit && (
              <>
                {["startTime", "endTime"].map((field) => (
                  <View key={field} style={styles.card}>
                    <Text style={styles.subtitle}>
                      {field === "startTime" ? "Clock in" : "Clock out"}
                    </Text>
                    <Text style={styles.text}>
                      {edit[field]
                        ? siteLabel(edit[field], edit.zone)
                        : "Still running"}
                    </Text>
                    <View style={styles.row}>
                      {button("Date", () =>
                        pickField(field, undefined, "date"),
                      )}
                      {button("Time", () => pickField(field))}
                      {field === "endTime" &&
                        edit.endTime &&
                        !edit.originalEndTime &&
                        button("Keep running", () =>
                          setEdit({ ...edit, endTime: null }),
                        )}
                    </View>
                  </View>
                ))}
                <Text style={styles.subtitle}>Breaks</Text>
                {edit.breaks.map((b: any, i: number) => (
                  <View key={i} style={styles.card}>
                    <Text style={styles.text}>
                      {b.type} · {siteLabel(b.startTime, edit.zone)} –{" "}
                      {b.endTime ? siteLabel(b.endTime, edit.zone) : "Running"}
                    </Text>
                    <View style={styles.row}>
                      {button("Start", () => pickField("startTime", i))}
                      {button("End", () => pickField("endTime", i))}
                      {button(
                        b.type === "PAID" ? "Make unpaid" : "Make paid",
                        () =>
                          setEdit({
                            ...edit,
                            breaks: edit.breaks.map((row: any, j: number) =>
                              i === j
                                ? {
                                    ...row,
                                    type:
                                      row.type === "PAID" ? "UNPAID" : "PAID",
                                  }
                                : row,
                            ),
                          }),
                      )}
                      {button("Remove", () =>
                        setEdit({
                          ...edit,
                          breaks: edit.breaks.filter(
                            (_: any, j: number) => i !== j,
                          ),
                        }),
                      )}
                    </View>
                  </View>
                ))}
                {button("Add unpaid break", () =>
                  setEdit({
                    ...edit,
                    breaks: [
                      ...edit.breaks,
                      {
                        startTime: edit.startTime,
                        endTime: edit.endTime || null,
                        type: "UNPAID",
                      },
                    ],
                  }),
                )}
                <TextInput
                  accessibilityLabel="Reason for correction"
                  multiline
                  value={reason}
                  onChangeText={setReason}
                  placeholder="Reason for correction (required)"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                />
                {button(busy ? "Saving…" : "Save correction", saveEdit)}
              </>
            )}
            {picker && (
              <DateTimePicker
                themeVariant="dark"
                value={picker.value}
                mode={picker.mode}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(event, value) => {
                  if (event.type === "dismissed") {
                    setPicker(null);
                    return;
                  }
                  if (value) {
                    if (Platform.OS === "ios") setPicker({ ...picker, value });
                    else applyPicker(value);
                  }
                }}
              />
            )}
            {picker &&
              Platform.OS === "ios" &&
              button("Confirm time", () => applyPicker(picker.value))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#050816" },
  title: { color: "#F8FAFC", fontSize: 26, fontWeight: "800" },
  subtitle: { color: "#F1F5F9", fontSize: 16, fontWeight: "700" },
  text: { color: "#E2E8F0", fontSize: 14, lineHeight: 21 },
  muted: { color: "#94A3B8", fontSize: 12, lineHeight: 18 },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  card: {
    backgroundColor: "#111B30",
    borderWidth: 1,
    borderColor: "#29354D",
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  button: {
    backgroundColor: "#263758",
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 13,
  },
  buttonText: { color: "#E0E7FF", fontWeight: "700", fontSize: 12 },
  input: {
    color: "white",
    borderWidth: 1,
    borderColor: "#34435E",
    borderRadius: 12,
    padding: 14,
    minHeight: 48,
  },
});
