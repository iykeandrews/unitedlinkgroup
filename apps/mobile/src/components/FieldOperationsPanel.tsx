import React, { useCallback, useRef, useState } from "react";
import { Alert, AppState, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as Location from "expo-location";
import api from "../services/api";
import { nextPaycheck, payDateLabel } from "../services/paySchedule";

export default function FieldOperationsPanel() {
  const navigation = useNavigation<any>();
  const [access, setAccess] = useState<any>(null),
    [active, setActive] = useState<any>(null),
    [busy, setBusy] = useState(false),
    [choices, setChoices] = useState<any[]>([]),
    [now, setNow] = useState(new Date());
  const lock = useRef(false),
    generation = useRef(0);
  const load = useCallback(async () => {
    const version = ++generation.current;
    try {
      const { data } = await api.get("/time-tracking/operations/access");
      if (version !== generation.current) return;
      setAccess(data);
      if (data.canFieldClock) {
        const status = await api.get("/time-tracking/field/status");
        if (version === generation.current) setActive(status.data);
      }
    } catch {
      if (version === generation.current) {
        setAccess(null);
        setActive(null);
      }
    }
    setNow(new Date());
  }, []);
  useFocusEffect(
    useCallback(() => {
      load();
      const sub = AppState.addEventListener("change", (state) => {
        if (state === "active") load();
      });
      const timer = setInterval(() => {
        if (AppState.currentState === "active") load();
      }, 30000);
      return () => {
        generation.current++;
        clearInterval(timer);
        sub.remove();
      };
    }, [load]),
  );
  const action = async (kind: string, locationId?: string) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted")
        throw Error("Allow location access to record your site attendance.");
      let timeout: ReturnType<typeof setTimeout> | undefined;
      const gps = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(
            () =>
              reject(
                new Error(
                  "GPS is taking too long. Move to an open area and try again.",
                ),
              ),
            20000,
          );
        }),
      ]).finally(() => {
        if (timeout) clearTimeout(timeout);
      });
      const coords = { lat: gps.coords.latitude, lng: gps.coords.longitude };
      const response = await api.post(
        kind === "clock-in"
          ? "/time-tracking/field/clock-in"
          : "/time-tracking/field/action",
        { ...coords, action: kind, locationId },
      );
      if (response.data.requiresLocationSelection) {
        setChoices(response.data.locations);
        return;
      }
      setChoices([]);
      await load();
      Alert.alert(
        "Attendance saved",
        kind === "clock-in"
          ? "Your detected site is recorded on your timesheet and schedule."
          : "Your attendance has been updated.",
      );
    } catch (e: any) {
      Alert.alert(
        "Unable to update attendance",
        String(e.response?.data?.message || e.message || "Please retry."),
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
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
      <Text style={{ color: "white", fontWeight: "700" }}>{title}</Text>
    </TouchableOpacity>
  );
  const pay = nextPaycheck(now);
  return (
    <View style={{ gap: 14, marginBottom: 16 }}>
      <View
        style={{ backgroundColor: "#101b35", padding: 18, borderRadius: 16 }}
      >
        <Text style={{ color: "#a5b4fc", fontWeight: "700" }}>
          NEXT SCHEDULED PAYCHECK
        </Text>
        <Text
          style={{
            color: "white",
            fontSize: 22,
            fontWeight: "800",
            marginTop: 6,
          }}
        >
          On or before {payDateLabel(pay.due)}
        </Text>
        <Text style={{ color: "#b6c4de", marginTop: 6 }}>
          Work period: {payDateLabel(pay.start)} – {payDateLabel(pay.end)}
        </Text>
        <Text style={{ color: "#b6c4de", marginTop: 8 }}>
          1st–15th: paid by the 1st of the next month. 16th–month end: paid by
          the 15th of the next month. This is the payment deadline, not
          confirmation of payment.
        </Text>
      </View>
      {access?.canView && (
        <View
          style={{ backgroundColor: "#101b35", padding: 18, borderRadius: 16 }}
        >
          <Text style={{ color: "white", fontWeight: "800", fontSize: 18 }}>
            Live team attendance
          </Text>
          <Text style={{ color: "#b6c4de", marginTop: 6 }}>
            All scheduled officers, clock-ins, breaks and late arrivals across
            your business.
          </Text>
          {button("Open team operations", () =>
            navigation.navigate("Main", {
              screen: "Schedule",
              params: { screen: "TeamOperations" },
            }),
          )}
        </View>
      )}
      {access?.canFieldClock && (
        <View
          style={{ backgroundColor: "#101b35", padding: 18, borderRadius: 16 }}
        >
          <Text style={{ color: "white", fontWeight: "800", fontSize: 18 }}>
            Manager site attendance
          </Text>
          <Text style={{ color: "#b6c4de", marginTop: 6 }}>
            {active
              ? `${active.location?.name || "Recorded site"} · ${active.breaks?.length ? "On break" : "Clocked in"}`
              : "Clock in at a registered site using GPS, including unscheduled visits. If no shift exists, the calendar end time stays provisional until clock-out."}
          </Text>
          {!active ? (
            button(busy ? "Locating site…" : "Clock in at my location", () =>
              action("clock-in"),
            )
          ) : (
            <>
              {button(
                active.breaks?.length ? "End break" : "Start unpaid break",
                () => action(active.breaks?.length ? "resume" : "break"),
              )}
              {!active.breaks?.length &&
                button("Clock out", () => action("clock-out"))}
            </>
          )}
          {!!choices.length && (
            <>
              <Text style={{ color: "#b6c4de", marginTop: 12 }}>
                More than one site matches your GPS. Select your site:
              </Text>
              {choices.map((site) => (
                <View key={site.id}>
                  {button(site.name, () => action("clock-in", site.id))}
                </View>
              ))}
            </>
          )}
        </View>
      )}
      {button("Officer assessments & scores", () =>
        navigation.navigate("OfficerAssessments"),
      )}
    </View>
  );
}
