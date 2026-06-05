import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Alert, StatusBar, Image } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

type EmployeeDashboardData = {
  now: string;
  employee: { id: string; firstName: string; lastName: string; role: string; businessId: string };
  timeTracking: {
    activeTimesheet: null | { id: string; startTime: string; endTime: string | null; locationId: string | null };
    activeBreak: null | { id: string; startTime: string; endTime: string | null; type: string; timesheetId: string };
  };
  schedule: {
    today: Array<{
      id: string;
      startTime: string;
      endTime: string;
      locationId: string | null;
      locationName: string | null;
      locationAddress: string | null;
      locationLat: number | null;
      locationLng: number | null;
      locationRadiusMeters: number | null;
    }>;
    currentShift: null | {
      id: string;
      startTime: string;
      endTime: string;
      locationId: string | null;
      locationName: string | null;
      locationAddress: string | null;
      locationLat: number | null;
      locationLng: number | null;
      locationRadiusMeters: number | null;
    };
    nextShift: null | {
      id: string;
      startTime: string;
      endTime: string;
      locationId: string | null;
      locationName: string | null;
      locationAddress: string | null;
      locationLat: number | null;
      locationLng: number | null;
      locationRadiusMeters: number | null;
    };
    canClockIn: boolean;
  };
  metrics: {
    punctuality: { onTimeRate: number; onTime: number; late: number; missed: number; avgLateMinutes: number };
    reports: { incidentCount: number; patrolCount: number; total: number };
    streakOnTimeDays: number;
  };
  activity: Array<{ id: string; kind: string; title: string; createdAt: string }>;
};

export default function DashboardScreen() {
  const { user, displayName, designation, avatarUrl } = useAuth();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState<EmployeeDashboardData | null>(null);
  const [businessName, setBusinessName] = useState<string>('');
  const [clockInGeo, setClockInGeo] = useState<{
    checking: boolean;
    withinRadius: boolean;
    distanceMeters: number | null;
    radiusMeters: number | null;
    message: string;
  }>({
    checking: false,
    withinRadius: false,
    distanceMeters: null,
    radiusMeters: null,
    message: 'Clock-in is available when you are at the assigned site.',
  });

  const extractErrorMessage = (err: any, fallback: string) => {
    const apiMessage = err?.response?.data?.message;
    if (typeof apiMessage === 'string' && apiMessage.trim()) return apiMessage;
    if (Array.isArray(apiMessage) && apiMessage.length) return apiMessage.map((x) => String(x)).join('\n');
    if (typeof err?.message === 'string' && err.message.trim()) return err.message;
    return fallback;
  };

  const roleUpper = useMemo(
    () => String(user?.employeeRole || user?.role || '').toUpperCase(),
    [user?.employeeRole, user?.role]
  );
  const isEmployee = roleUpper === 'EMPLOYEE';
  const canFetchBusinessMine = roleUpper !== 'SUPER_ADMIN';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (!isEmployee) {
        if (canFetchBusinessMine) {
          const businessRes = await api.get('/businesses/mine').catch(() => ({ data: null }));
          setBusinessName(businessRes?.data?.name ? String(businessRes.data.name) : '');
        } else {
          setBusinessName('');
        }
        setDashboard(null);
        return;
      }

      const [dashboardRes, businessRes] = await Promise.all([
        api.get('/reports/employee-dashboard', { params: { days: 30 } }),
        api.get('/businesses/mine').catch(() => ({ data: null })),
      ]);
      setDashboard(dashboardRes.data || null);
      setBusinessName(businessRes?.data?.name ? String(businessRes.data.name) : '');
    } catch (e: any) {
      console.error(e);
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, [canFetchBusinessMine, isEmployee, roleUpper]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const mapGeoError = (err: any) => {
    const code = err?.code;
    if (code === 1) return 'Location permission denied. Enable location access to clock in.';
    if (code === 2) return 'Location unavailable. Check GPS and try again.';
    if (code === 3) return 'Location request timed out. Move to an open area and try again.';
    return extractErrorMessage(err, 'Unable to get your location. Enable GPS to clock in.');
  };

  const getCoords = useCallback(
    () =>
      new Promise<{ lat: number; lng: number }>((resolve, reject) => {
      (async () => {
        try {
          const perm = await Location.getForegroundPermissionsAsync();
          if (!perm.granted) {
            const req = await Location.requestForegroundPermissionsAsync();
            if (!req.granted) {
              reject({ code: 1, message: 'Location permission denied' });
              return;
            }
          }

          const enabled = await Location.hasServicesEnabledAsync();
          if (!enabled) {
            reject({ code: 2, message: 'Location services disabled' });
            return;
          }

          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Highest,
          });
          const lat = pos?.coords?.latitude;
          const lng = pos?.coords?.longitude;
          if (typeof lat === 'number' && typeof lng === 'number') resolve({ lat, lng });
          else reject(new Error('Unable to read GPS coordinates'));
        } catch (e) {
          reject(e);
        }
      })();
    }),
    []
  );

  const handleClockIn = async () => {
    try {
      const coords = await getCoords();
      await api.post('/time-tracking/clock-in', coords);
      Alert.alert('Success', 'You are clocked in!');
      fetchData();
    } catch (e: any) {
      const msg = e?.response ? extractErrorMessage(e, 'Failed to clock in') : mapGeoError(e);
      Alert.alert('Clock in blocked', msg);
    }
  };

  const handleClockOut = async () => {
    try {
      let coords: { lat: number; lng: number } | null = null;
      try {
        coords = await getCoords();
      } catch {}
      await api.post('/time-tracking/clock-out', coords || {});
      Alert.alert('Success', 'You are clocked out!');
      fetchData();
    } catch (e: any) {
      Alert.alert('Clock out failed', extractErrorMessage(e, 'Failed to clock out'));
    }
  };

  const handleStartBreak = async () => {
    try {
      const coords = await getCoords();
      await api.post('/time-tracking/break/start', { type: 'UNPAID', ...coords });
      fetchData();
    } catch (e: any) {
      const msg = e?.response ? extractErrorMessage(e, 'Failed to start break') : mapGeoError(e);
      Alert.alert('Break blocked', msg);
    }
  };

  const handleResumeShift = async () => {
    try {
      const coords = await getCoords();
      await api.post('/time-tracking/break/end', coords);
      fetchData();
    } catch (e: any) {
      const msg = e?.response ? extractErrorMessage(e, 'Failed to resume shift') : mapGeoError(e);
      Alert.alert('Resume blocked', msg);
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatTimeRange = (start: string, end: string) => {
    return `${formatTime(start)} - ${formatTime(end)}`;
  };

  const calculateDistanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const earthRadiusMeters = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusMeters * c;
  };

  const now = useMemo(() => {
    return dashboard?.now ? new Date(dashboard.now) : new Date();
  }, [dashboard?.now]);

  const name = displayName;

  const activeTimesheet = dashboard?.timeTracking?.activeTimesheet || null;
  const activeBreak = dashboard?.timeTracking?.activeBreak || null;
  const isClockedIn = !!activeTimesheet;
  const isOnBreak = !!activeBreak && !activeBreak.endTime;
  const todayShifts = dashboard?.schedule?.today || [];
  const currentShift = dashboard?.schedule?.currentShift || null;
  const nextShift = dashboard?.schedule?.nextShift || null;
  const targetClockInShift = currentShift || nextShift;
  const onScheduleToday = todayShifts.length > 0;

  const canClockIn = !!dashboard?.schedule?.canClockIn && !isClockedIn && clockInGeo.withinRadius;
  const canClockOut = isClockedIn;

  const palette = {
    bg: '#050816',
    panel: 'rgba(255,255,255,0.06)',
    panelStrong: 'rgba(255,255,255,0.09)',
    border: 'rgba(255,255,255,0.12)',
    text: '#E8EEF9',
    muted: 'rgba(232,238,249,0.64)',
    faint: 'rgba(232,238,249,0.42)',
    indigo: '#4F46E5',
    cyan: '#22D3EE',
    green: '#34D399',
    red: '#FB7185',
    amber: '#FBBF24',
  };

  const initials = useMemo(() => {
    const parts = name.split(' ').filter(Boolean);
    const a = parts[0]?.[0] || 'U';
    const b = parts[1]?.[0] || '';
    return `${a}${b}`.toUpperCase();
  }, [name]);

  const statusLabel = isClockedIn ? 'ON DUTY' : 'OFF DUTY';
  const statusColor = isClockedIn ? palette.green : palette.faint;
  const primaryActionEnabled = isClockedIn ? canClockOut && !loading : canClockIn && !loading;
  const scheduleLabel = onScheduleToday ? 'EMPLOYEE ON SCHEDULE' : 'EMPLOYEE OFF SCHEDULE';
  const scheduleColor = onScheduleToday ? palette.cyan : palette.faint;

  useEffect(() => {
    let cancelled = false;

    const checkClockInRadius = async () => {
      if (isClockedIn) {
        if (!cancelled) {
          setClockInGeo({
            checking: false,
            withinRadius: true,
            distanceMeters: null,
            radiusMeters: null,
            message: 'You are already clocked in.',
          });
        }
        return;
      }

      if (!dashboard?.schedule?.canClockIn || !targetClockInShift) {
        if (!cancelled) {
          setClockInGeo({
            checking: false,
            withinRadius: false,
            distanceMeters: null,
            radiusMeters: null,
            message: onScheduleToday ? 'Clock-in opens near the start of your scheduled shift.' : 'You are not scheduled for today.',
          });
        }
        return;
      }

      const siteLat = typeof targetClockInShift.locationLat === 'number' ? targetClockInShift.locationLat : null;
      const siteLng = typeof targetClockInShift.locationLng === 'number' ? targetClockInShift.locationLng : null;
      const radiusMeters =
        typeof targetClockInShift.locationRadiusMeters === 'number' && Number.isFinite(targetClockInShift.locationRadiusMeters) && targetClockInShift.locationRadiusMeters > 0
          ? targetClockInShift.locationRadiusMeters
          : 100;

      if (siteLat === null || siteLng === null) {
        if (!cancelled) {
          setClockInGeo({
            checking: false,
            withinRadius: false,
            distanceMeters: null,
            radiusMeters,
            message: 'Clock-in geofence is not configured for this site.',
          });
        }
        return;
      }

      if (!cancelled) {
        setClockInGeo((prev) => ({
          ...prev,
          checking: true,
          message: 'Checking your distance to the assigned site...',
        }));
      }

      try {
        const coords = await getCoords();
        if (cancelled) return;
        const distanceMeters = Math.round(calculateDistanceMeters(coords.lat, coords.lng, siteLat, siteLng));
        const withinRadius = distanceMeters <= radiusMeters;
        setClockInGeo({
          checking: false,
          withinRadius,
          distanceMeters,
          radiusMeters,
          message: withinRadius
            ? `Within ${radiusMeters}m of ${targetClockInShift.locationName || 'your assigned site'}.`
            : `You are ${distanceMeters}m away. Move within ${radiusMeters}m to clock in.`,
        });
      } catch (e: any) {
        if (cancelled) return;
        setClockInGeo({
          checking: false,
          withinRadius: false,
          distanceMeters: null,
          radiusMeters,
          message: mapGeoError(e),
        });
      }
    };

    checkClockInRadius();

    return () => {
      cancelled = true;
    };
  }, [targetClockInShift, dashboard?.schedule?.canClockIn, getCoords, isClockedIn, onScheduleToday]);

  const [breakTick, setBreakTick] = useState(0);
  useEffect(() => {
    if (!isOnBreak) return;
    const id = setInterval(() => setBreakTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [isOnBreak]);

  useEffect(() => {
    if (!isClockedIn) return;
    if (isOnBreak) return;
    let cancelled = false;
    const id = setInterval(() => {
      (async () => {
        try {
          const coords = await getCoords();
          if (cancelled) return;
          await api.post('/time-tracking/location/ping', coords);
        } catch {}
      })();
    }, 60000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [getCoords, isClockedIn, isOnBreak]);

  const breakElapsedLabel = useMemo(() => {
    if (!isOnBreak || !activeBreak?.startTime) return '';
    const start = new Date(activeBreak.startTime).getTime();
    const nowMs = Date.now();
    if (!isFinite(start) || !isFinite(nowMs)) return '';
    const minutes = Math.max(0, Math.floor((nowMs - start) / 60000));
    return `${minutes} min`;
  }, [activeBreak?.startTime, breakTick, isOnBreak]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.bg }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.bgGlowWrap} pointerEvents="none">
        <View style={[styles.bgGlow, { backgroundColor: palette.indigo, top: -120, left: -140 }]} />
        <View style={[styles.bgGlow, { backgroundColor: palette.cyan, top: 140, right: -160, opacity: 0.22 }]} />
        <View style={[styles.bgGlow, { backgroundColor: palette.green, bottom: -160, left: -160, opacity: 0.18 }]} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} tintColor={palette.cyan as any} />}
      >
        <View style={styles.header}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.kicker, { color: palette.muted }]}>{designation ? `${designation} Command Center` : 'Command Center'}</Text>
            <Text style={[styles.username, { color: palette.text }]} numberOfLines={1}>
              {name}
            </Text>
            <View style={styles.userInfoRow}>
              {user?.email ? (
                <View style={styles.metaItem}>
                  <Ionicons name="mail-outline" size={14} color={palette.muted as any} />
                  <Text style={[styles.metaText, { color: palette.muted }]} numberOfLines={1}>
                    {String(user.email)}
                  </Text>
                </View>
              ) : null}
              {designation ? (
                <View style={styles.metaItem}>
                  <Ionicons name="briefcase-outline" size={14} color={palette.muted as any} />
                  <Text style={[styles.metaText, { color: palette.muted }]} numberOfLines={1}>
                    {designation}
                  </Text>
                </View>
              ) : null}
              {businessName ? (
                <View style={styles.metaItem}>
                  <Ionicons name="business-outline" size={14} color={palette.muted as any} />
                  <Text style={[styles.metaText, { color: palette.muted }]} numberOfLines={1}>
                    {businessName}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={styles.headerMetaRow}>
              <View style={[styles.pill, { borderColor: palette.border, backgroundColor: palette.panel }]}>
                <View style={[styles.pillDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.pillText, { color: palette.text }]}>{statusLabel}</Text>
              </View>
              <View style={[styles.pill, { borderColor: palette.border, backgroundColor: palette.panel }]}>
                <View style={[styles.pillDot, { backgroundColor: scheduleColor }]} />
                <Text style={[styles.pillText, { color: palette.text }]}>{scheduleLabel}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color={palette.muted as any} />
                <Text style={[styles.metaText, { color: palette.muted }]} numberOfLines={1}>
                  {now.toLocaleString()}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={[styles.avatar, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
            ) : (
              <Text style={[styles.avatarText, { color: palette.text }]}>{initials}</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.heroCard, { backgroundColor: palette.panel, borderColor: palette.border }]}>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.heroLabel, { color: palette.muted }]}>
                {onScheduleToday ? 'Employee On Schedule' : 'Employee Off Schedule'}
              </Text>
              <View
                style={[
                  styles.scheduleBadge,
                  {
                    borderColor: onScheduleToday ? 'rgba(34,211,238,0.35)' : palette.border,
                    backgroundColor: onScheduleToday ? 'rgba(34,211,238,0.16)' : palette.panelStrong,
                  },
                ]}
              >
                <Ionicons
                  name={onScheduleToday ? 'checkmark-circle-outline' : 'close-circle-outline'}
                  size={16}
                  color={(onScheduleToday ? palette.cyan : palette.faint) as any}
                />
                <Text style={[styles.scheduleBadgeText, { color: palette.text }]}>
                  {onScheduleToday ? 'Employee On Schedule' : 'Employee Off Schedule'}
                </Text>
              </View>
              <Text style={[styles.heroTitle, { color: palette.text }]} numberOfLines={1}>
                {targetClockInShift?.locationName || 'No site assigned'}
              </Text>
              <Text style={[styles.heroSub, { color: palette.muted }]} numberOfLines={1}>
                {currentShift
                  ? `Current shift • ${formatTimeRange(currentShift.startTime, currentShift.endTime)}`
                  : nextShift
                    ? `Next shift • ${formatTimeRange(nextShift.startTime, nextShift.endTime)}`
                    : 'No shift scheduled right now'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.heroSecondary, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
              onPress={() => navigation.navigate('Schedule')}
            >
              <Ionicons name="calendar-outline" size={18} color={palette.text as any} />
            </TouchableOpacity>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.heroActionRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroSmallLabel, { color: palette.muted }]}>Status</Text>
              <Text style={[styles.heroStatus, { color: palette.text }]}>
                {isOnBreak
                  ? `On break${breakElapsedLabel ? ` • ${breakElapsedLabel}` : ''}`
                  : isClockedIn
                    ? `Clocked in${activeTimesheet?.startTime ? ` • since ${formatTime(activeTimesheet.startTime)}` : ''}`
                    : canClockIn
                      ? 'Ready to clock in'
                      : clockInGeo.checking
                        ? 'Checking site radius'
                        : 'Clock-in locked'}
              </Text>
              <Text style={[styles.heroHint, { color: palette.faint }]}>
                {isClockedIn ? 'Location required for break and resume.' : clockInGeo.message}
              </Text>
            </View>

            {!isClockedIn ? (
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: palette.indigo,
                    opacity: primaryActionEnabled ? 1 : 0.55,
                  },
                ]}
                disabled={!primaryActionEnabled}
                onPress={handleClockIn}
              >
                <Ionicons name={'play-circle-outline'} size={18} color={'#ffffff'} />
                <Text style={styles.primaryButtonText}>Clock In</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.heroButtons}>
                {!isOnBreak ? (
                  <TouchableOpacity
                    style={[
                      styles.secondaryButton,
                      {
                        borderColor: palette.border,
                        backgroundColor: palette.panelStrong,
                        opacity: loading ? 0.55 : 1,
                      },
                    ]}
                    disabled={loading}
                    onPress={handleStartBreak}
                  >
                    <Ionicons name="pause-circle-outline" size={18} color={palette.text as any} />
                    <Text style={[styles.secondaryButtonText, { color: palette.text }]}>Break</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.secondaryButton,
                      {
                        borderColor: palette.border,
                        backgroundColor: palette.panelStrong,
                        opacity: loading ? 0.55 : 1,
                      },
                    ]}
                    disabled={loading}
                    onPress={handleResumeShift}
                  >
                    <Ionicons name="play-circle-outline" size={18} color={palette.text as any} />
                    <Text style={[styles.secondaryButtonText, { color: palette.text }]}>Resume shift</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    {
                      backgroundColor: palette.red,
                      opacity: canClockOut && !loading ? 1 : 0.55,
                    },
                  ]}
                  disabled={!canClockOut || loading}
                  onPress={handleClockOut}
                >
                  <Ionicons name="stop-circle-outline" size={18} color={'#ffffff'} />
                  <Text style={styles.primaryButtonText}>Clock Out</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: palette.text }]}>Performance</Text>
        <View style={styles.grid}>
          <View style={[styles.metricCard, { backgroundColor: palette.panel, borderColor: palette.border }]}>
            <View style={styles.metricTopRow}>
              <Ionicons name="pulse-outline" size={18} color={palette.cyan as any} />
              <Text style={[styles.metricLabel, { color: palette.muted }]}>On-time rate</Text>
            </View>
            <Text style={[styles.metricValue, { color: palette.text }]}>{dashboard?.metrics?.punctuality?.onTimeRate ?? 0}%</Text>
            <Text style={[styles.metricSub, { color: palette.faint }]}>Avg late: {dashboard?.metrics?.punctuality?.avgLateMinutes ?? 0}m</Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: palette.panel, borderColor: palette.border }]}>
            <View style={styles.metricTopRow}>
              <Ionicons name="shield-checkmark-outline" size={18} color={palette.green as any} />
              <Text style={[styles.metricLabel, { color: palette.muted }]}>Reports</Text>
            </View>
            <Text style={[styles.metricValue, { color: palette.text }]}>{dashboard?.metrics?.reports?.total ?? 0}</Text>
            <Text style={[styles.metricSub, { color: palette.faint }]}>
              Incidents: {dashboard?.metrics?.reports?.incidentCount ?? 0} • Patrol: {dashboard?.metrics?.reports?.patrolCount ?? 0}
            </Text>
          </View>

          <View style={[styles.metricCardWide, { backgroundColor: palette.panel, borderColor: palette.border }]}>
            <View style={styles.metricTopRow}>
              <Ionicons name="sparkles-outline" size={18} color={palette.amber as any} />
              <Text style={[styles.metricLabel, { color: palette.muted }]}>Consistency</Text>
            </View>
            <View style={styles.streakRow}>
              <Text style={[styles.streakValue, { color: palette.text }]}>{dashboard?.metrics?.streakOnTimeDays ?? 0}</Text>
              <Text style={[styles.streakUnit, { color: palette.muted }]}>days on-time streak</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: palette.text }]}>Quick actions</Text>
        <View style={styles.quickRow}>
          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: palette.panel, borderColor: palette.border }]}
            onPress={() => navigation.navigate('IncidentReportCreate')}
          >
            <View style={[styles.quickIconWrap, { backgroundColor: 'rgba(34,211,238,0.16)' }]}>
              <Ionicons name="warning-outline" size={20} color={palette.text as any} />
            </View>
            <Text style={[styles.quickText, { color: palette.text }]}>Report incident</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: palette.panel, borderColor: palette.border }]}
            onPress={() => navigation.navigate('IncidentReportHistory')}
          >
            <View style={[styles.quickIconWrap, { backgroundColor: 'rgba(79,70,229,0.18)' }]}>
              <Ionicons name="albums-outline" size={20} color={palette.text as any} />
            </View>
            <Text style={[styles.quickText, { color: palette.text }]}>Incident history</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: palette.text }]}>Recent activity</Text>
        <View style={[styles.activityCard, { backgroundColor: palette.panel, borderColor: palette.border }]}>
          {(dashboard?.activity || []).length === 0 ? (
            <Text style={[styles.emptyText, { color: palette.muted }]}>No recent activity.</Text>
          ) : (
            (dashboard?.activity || []).slice(0, 8).map((a) => (
              <View key={`${a.kind}_${a.id}`} style={[styles.activityRow, { borderBottomColor: palette.border }]}>
                <View style={styles.activityLeft}>
                  <View style={styles.activityTitleRow}>
                    <View style={[styles.activityIcon, { backgroundColor: palette.panelStrong, borderColor: palette.border }]}>
                      <Ionicons name="flash-outline" size={14} color={palette.cyan as any} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.activityTitle, { color: palette.text }]} numberOfLines={1}>
                        {a.title || 'Update'}
                      </Text>
                      <Text style={[styles.activityKind, { color: palette.muted }]} numberOfLines={1}>
                        {a.kind}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text style={[styles.activityTime, { color: palette.muted }]}>{new Date(a.createdAt).toLocaleDateString()}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgGlowWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bgGlow: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 200,
    opacity: 0.28,
    transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }],
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 28,
  },
  header: {
    paddingTop: 10,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  username: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  userInfoRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  headerMetaRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 240,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillDot: {
    width: 8,
    height: 8,
    borderRadius: 8,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: 44,
    height: 44,
    resizeMode: 'cover',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.0,
  },
  heroCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    marginTop: 8,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  scheduleBadge: {
    marginTop: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  scheduleBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heroSub: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
  },
  heroSecondary: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
    marginVertical: 14,
  },
  heroActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroSmallLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroStatus: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '800',
  },
  heroHint: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 16,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  heroButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  sectionTitle: {
    marginTop: 20,
    marginBottom: 12,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flexGrow: 1,
    flexBasis: 160,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  metricCardWide: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  metricTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  metricSub: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  streakValue: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  streakUnit: {
    fontSize: 13,
    fontWeight: '700',
  },
  activityCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  activityLeft: {
    flex: 1,
    minWidth: 0,
  },
  activityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activityIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityKind: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '600',
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  activityTime: {
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 0,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickCard: {
    flexGrow: 1,
    flexBasis: 110,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quickIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickText: {
    fontSize: 13,
    fontWeight: '900',
  },
});
