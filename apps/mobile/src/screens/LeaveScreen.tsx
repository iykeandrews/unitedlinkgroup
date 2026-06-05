import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Platform, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function LeaveScreen() {
  const { user, displayName, designation } = useAuth();
  const [activeTab, setActiveTab] = useState<'request' | 'history'>('request');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  
  // Data
  const [requests, setRequests] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  
  // Form State
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [estimatedHours, setEstimatedHours] = useState<number | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [datePickerKind, setDatePickerKind] = useState<'start' | 'end' | null>(null);
  const [datePickerValue, setDatePickerValue] = useState<Date>(new Date());

  const palette = useMemo(
    () => ({
      bg: '#050816',
      panel: 'rgba(255,255,255,0.08)',
      panelStrong: 'rgba(255,255,255,0.11)',
      border: 'rgba(255,255,255,0.14)',
      text: '#E8EEF9',
      muted: 'rgba(232,238,249,0.70)',
      faint: 'rgba(232,238,249,0.48)',
      faint2: 'rgba(232,238,249,0.34)',
      indigo: '#4F46E5',
      cyan: '#22D3EE',
      green: '#34D399',
      amber: '#FBBF24',
      red: '#FB7185',
    }),
    []
  );

  const roleUpper = useMemo(() => String(user?.role || '').toUpperCase(), [user?.role]);
  const isEmployee = roleUpper === 'EMPLOYEE';

  const fetchData = useCallback(async () => {
    try {
      if (!isEmployee) {
        setRequests([]);
        setBalances([]);
        setLeaveTypes([]);
        return;
      }
      const [requestsRes, balancesRes] = await Promise.all([
        api.get('/leave/my-requests'),
        api.get('/leave/my-balances')
      ]);
      setRequests(requestsRes.data || []);
      setBalances(balancesRes.data || []);

      const typesFromBalances = (balancesRes.data || [])
        .map((b: any) => b.leaveType)
        .filter(Boolean)
        .filter((t: any, i: number, arr: any[]) => arr.findIndex((x) => x.id === t.id) === i);
      setLeaveTypes(typesFromBalances);
      
    } catch (error) {
      console.error('Failed to fetch leave data', error);
      Alert.alert('Error', 'Failed to load leave data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isEmployee, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const selectedType = useMemo(() => leaveTypes.find((t) => t.id === selectedTypeId) || null, [leaveTypes, selectedTypeId]);
  const selectedBalance = useMemo(() => balances.find((b) => b.leaveType?.id === selectedTypeId) || null, [balances, selectedTypeId]);

  const toLocalISODate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const parseISODate = (s: string) => {
    if (!s) return null;
    const d = new Date(`${s}T00:00:00`);
    if (!Number.isFinite(d.getTime())) return null;
    return d;
  };

  const applyPickedDate = (kind: 'start' | 'end', d: Date) => {
    const iso = toLocalISODate(d);
    if (kind === 'start') {
      setStartDate(iso);
      setEstimatedHours(null);
      if (endDate && iso > endDate) {
        setEndDate(iso);
      }
      return;
    }
    setEndDate(iso);
    setEstimatedHours(null);
    if (startDate && iso < startDate) {
      setStartDate(iso);
    }
  };

  const openDatePicker = (kind: 'start' | 'end') => {
    const current = kind === 'start' ? parseISODate(startDate) : parseISODate(endDate);
    setDatePickerValue(current || new Date());
    setDatePickerKind(kind);
  };

  const estimate = async (opts?: { silent?: boolean }) => {
    if (!selectedTypeId || !startDate || !endDate) {
      if (!opts?.silent) Alert.alert('Estimate', 'Select leave type and dates first.');
      return null;
    }
    if (!user?.employeeId) {
      if (!opts?.silent) Alert.alert('Estimate', 'Employee ID missing on your profile. Contact admin.');
      return null;
    }
    try {
      setEstimating(true);
      const res = await api.get('/leave/calculate-hours', {
        params: {
          employeeId: user.employeeId,
          startDate,
          endDate,
          isAllDay: true,
        },
      });
      const h = Number(res.data?.totalHours);
      const next = Number.isFinite(h) ? h : null;
      setEstimatedHours(next);
      return next;
    } catch (e: any) {
      setEstimatedHours(null);
      if (!opts?.silent) Alert.alert('Estimate', e?.response?.data?.message || 'Unable to calculate leave hours');
      return null;
    } finally {
      setEstimating(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'request') return;
    if (!selectedTypeId || !startDate || !endDate) return;
    const id = setTimeout(() => {
      estimate({ silent: true });
    }, 450);
    return () => clearTimeout(id);
  }, [activeTab, endDate, selectedTypeId, startDate]);

  const handleSubmit = async () => {
    if (!selectedTypeId || !startDate || !endDate) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
    }
    
    if (!user?.employeeId) {
        Alert.alert('Error', 'User profile not fully linked (missing employee ID). Contact admin.');
        return;
    }

    try {
        const hours = await estimate({ silent: true });
        const requested = hours ?? estimatedHours;
        if (requested === null) {
          Alert.alert('Error', 'Unable to calculate requested leave hours. Check dates and try again.');
          return;
        }

        const bal = balances.find((b) => b.leaveType?.id === selectedTypeId);
        const available = bal ? Number(bal.balanceHours ?? 0) : null;
        if (available === null || !Number.isFinite(available)) {
          Alert.alert('Error', 'This leave type is not available for your profile.');
          return;
        }

        if (requested > available) {
          Alert.alert('Error', `Insufficient leave balance. You have ${available.toFixed(1)} hours.`);
          return;
        }

        setSubmitting(true);
        await api.post('/leave/request', {
            employeeId: user.employeeId,
            leaveTypeId: selectedTypeId,
            startDate,
            endDate,
            reason,
            isAllDay: true // Default to all day for now
        });
        Alert.alert('Success', 'Leave request submitted!');
        setStartDate('');
        setEndDate('');
        setReason('');
        setSelectedTypeId('');
        setEstimatedHours(null);
        setActiveTab('history');
        fetchData();
    } catch (error: any) {
        const msg = error.response?.data?.message || 'Failed to submit request';
        Alert.alert('Error', msg);
    } finally {
        setSubmitting(false);
    }
  };

  const statusMeta = (status: string) => {
    const s = String(status || '').toUpperCase();
    if (s === 'APPROVED') return { label: 'APPROVED', color: palette.green };
    if (s === 'REJECTED') return { label: 'REJECTED', color: palette.red };
    return { label: s || 'PENDING', color: palette.amber };
  };

  const filteredRequests = useMemo(() => {
    const list = (requests || []).slice();
    if (historyFilter === 'ALL') return list;
    return list.filter((r) => String(r.status || '').toUpperCase() === historyFilter);
  }, [historyFilter, requests]);

  const est = estimatedHours ?? null;
  const balanceHours = selectedBalance ? Number(selectedBalance.balanceHours ?? 0) : null;
  const isOverBalance = est !== null && balanceHours !== null && Number.isFinite(balanceHours) && est > balanceHours;
  const canSubmit = !!selectedTypeId && !!startDate && !!endDate && !submitting && !isOverBalance;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.bg }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.bgGlowWrap} pointerEvents="none">
        <View style={[styles.bgGlow, { backgroundColor: palette.indigo, top: -160, left: -160, opacity: 0.22 }]} />
        <View style={[styles.bgGlow, { backgroundColor: palette.cyan, bottom: -170, right: -170, opacity: 0.18 }]} />
        <View style={[styles.bgGlow, { backgroundColor: palette.green, top: 240, right: -220, opacity: 0.10 }]} />
      </View>

      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.headerTitle, { color: palette.text }]}>Leave</Text>
          <Text style={[styles.headerSubtitle, { color: palette.muted }]}>Requests • balances • history</Text>
          <Text style={[styles.headerSubtitle, { color: palette.faint }]} numberOfLines={1}>
            {displayName}{designation ? ` • ${designation}` : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.headerBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong, opacity: refreshing ? 0.7 : 1 }]}
          onPress={onRefresh}
          disabled={refreshing}
        >
          <Ionicons name="refresh" size={18} color={palette.text as any} />
        </TouchableOpacity>
      </View>

      {!isEmployee ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="lock-closed-outline" size={52} color={palette.faint as any} />
          <Text style={[styles.emptyTitle, { color: palette.text }]}>Employee access only</Text>
          <Text style={[styles.emptyHint, { color: palette.muted }]}>Leave is available for employee accounts on the mobile app.</Text>
        </View>
      ) : (
        <>
          <View style={styles.tabs}>
            {(['request', 'history'] as const).map((k) => {
              const active = activeTab === k;
              return (
                <TouchableOpacity
                  key={k}
                  style={[
                    styles.tabPill,
                    {
                      borderColor: palette.border,
                      backgroundColor: active ? palette.indigo : palette.panel,
                    },
                  ]}
                  onPress={() => setActiveTab(k)}
                >
                  <Text style={[styles.tabText, { color: active ? '#ffffff' : palette.text }]}>{k === 'request' ? 'Request' : 'History'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {loading && !refreshing ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={palette.cyan as any} />
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.content}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.cyan as any} />}
            >
              {activeTab === 'request' ? (
                <>
              <View style={[styles.card, { backgroundColor: palette.panel, borderColor: palette.border }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.iconWrap, { borderColor: palette.border, backgroundColor: 'rgba(34,211,238,0.16)' }]}>
                    <Ionicons name="wallet-outline" size={18} color={palette.cyan as any} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.cardTitle, { color: palette.text }]}>Balances</Text>
                    <Text style={[styles.cardDesc, { color: palette.muted }]}>Available hours by leave type.</Text>
                  </View>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.balanceRow}>
                  {balances.map((b) => (
                    <View key={b.id} style={[styles.balanceCard, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                      <Text style={[styles.balanceLabel, { color: palette.muted }]} numberOfLines={1}>
                        {b.leaveType?.name || 'Leave'}
                      </Text>
                      <Text style={[styles.balanceValue, { color: palette.text }]}>{Number(b.balanceHours ?? 0).toFixed(1)}h</Text>
                    </View>
                  ))}
                  {balances.length === 0 ? (
                    <View style={[styles.balanceCard, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                      <Text style={[styles.balanceLabel, { color: palette.muted }]}>No balances</Text>
                      <Text style={[styles.balanceValue, { color: palette.text }]}>—</Text>
                    </View>
                  ) : null}
                </ScrollView>
              </View>

              <View style={[styles.card, { backgroundColor: palette.panel, borderColor: palette.border }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.iconWrap, { borderColor: palette.border, backgroundColor: 'rgba(79,70,229,0.16)' }]}>
                    <Ionicons name="add-circle-outline" size={18} color={palette.indigo as any} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.cardTitle, { color: palette.text }]}>New request</Text>
                    <Text style={[styles.cardDesc, { color: palette.muted }]}>All-day leave (YYYY-MM-DD).</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.selectRow, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
                  onPress={() => setShowTypeModal(true)}
                >
                  <Ionicons name="briefcase-outline" size={18} color={palette.muted as any} />
                  <Text style={[styles.selectText, { color: selectedType ? palette.text : palette.faint }]} numberOfLines={1}>
                    {selectedType ? selectedType.name : 'Select leave type'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={palette.faint as any} />
                </TouchableOpacity>

                <View style={styles.twoCol}>
                  <TouchableOpacity
                    style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
                    onPress={() => openDatePicker('start')}
                    disabled={submitting}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="calendar-outline" size={18} color={palette.muted as any} />
                    <Text style={[styles.input, { color: startDate ? palette.text : palette.faint }]} numberOfLines={1}>
                      {startDate || 'Start date'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={palette.faint as any} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
                    onPress={() => openDatePicker('end')}
                    disabled={submitting}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="calendar-clear-outline" size={18} color={palette.muted as any} />
                    <Text style={[styles.input, { color: endDate ? palette.text : palette.faint }]} numberOfLines={1}>
                      {endDate || 'End date'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={palette.faint as any} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.fieldTall, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                  <Ionicons name="chatbox-ellipses-outline" size={18} color={palette.muted as any} />
                  <TextInput
                    style={[styles.input, { color: palette.text, height: 84 }]}
                    placeholder="Reason (optional)"
                    placeholderTextColor={palette.faint}
                    multiline
                    value={reason}
                    onChangeText={setReason}
                  />
                </View>

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[
                      styles.secondaryBtn,
                      { borderColor: palette.border, backgroundColor: palette.panelStrong, opacity: estimating ? 0.75 : 1 },
                    ]}
                    onPress={() => estimate()}
                    disabled={estimating}
                  >
                    {estimating ? (
                      <ActivityIndicator color={palette.text as any} />
                    ) : (
                      <>
                        <Ionicons name="calculator-outline" size={16} color={palette.text as any} />
                        <Text style={[styles.secondaryBtnText, { color: palette.text }]}>Estimate</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.primaryBtn,
                      {
                        backgroundColor: palette.indigo,
                        opacity: canSubmit ? 1 : 0.6,
                      },
                    ]}
                    onPress={handleSubmit}
                    disabled={!canSubmit}
                  >
                    {submitting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryBtnText}>Submit</Text>}
                  </TouchableOpacity>
                </View>

                {est !== null ? (
                  <View
                    style={[
                      styles.notice,
                      {
                        borderColor: palette.border,
                        backgroundColor: isOverBalance ? 'rgba(251,113,133,0.12)' : 'rgba(34,211,238,0.12)',
                      },
                    ]}
                  >
                    <Ionicons name={isOverBalance ? 'warning-outline' : 'information-circle-outline'} size={16} color={(isOverBalance ? palette.red : palette.cyan) as any} />
                    <Text style={[styles.noticeText, { color: palette.muted }]}>
                      Estimated: {est.toFixed(1)}h
                      {balanceHours !== null ? ` • Balance: ${Number(balanceHours).toFixed(1)}h` : ''}
                      {isOverBalance ? ' • Exceeds balance' : ''}
                    </Text>
                  </View>
                ) : null}
              </View>
            </>
          ) : (
            <>
              <View style={styles.filters}>
                {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((k) => {
                  const active = historyFilter === k;
                  return (
                    <TouchableOpacity
                      key={k}
                      style={[
                        styles.filterPill,
                        { borderColor: palette.border, backgroundColor: active ? palette.indigo : palette.panel },
                      ]}
                      onPress={() => setHistoryFilter(k)}
                    >
                      <Text style={[styles.filterText, { color: active ? '#ffffff' : palette.text }]}>{k}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {filteredRequests.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Ionicons name="calendar-outline" size={52} color={palette.faint as any} />
                  <Text style={[styles.emptyTitle, { color: palette.muted }]}>No requests found</Text>
                  <Text style={[styles.emptyHint, { color: palette.faint }]}>Submit a new request or change the filter.</Text>
                </View>
              ) : (
                <View style={styles.historyList}>
                  {filteredRequests.map((item) => {
                    const meta = statusMeta(item.status);
                    return (
                      <View key={item.id} style={[styles.historyItem, { borderColor: palette.border, backgroundColor: palette.panel }]}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[styles.historyType, { color: palette.text }]} numberOfLines={1}>
                            {item.leaveType?.name || 'Leave'}
                          </Text>
                          <Text style={[styles.historyDate, { color: palette.muted }]} numberOfLines={1}>
                            {new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}
                          </Text>
                          {item.reason ? (
                            <Text style={[styles.historyReason, { color: palette.faint }]} numberOfLines={1}>
                              {item.reason}
                            </Text>
                          ) : null}
                        </View>
                        <View style={[styles.statusPill, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                          <View style={[styles.dot, { backgroundColor: meta.color }]} />
                          <Text style={[styles.statusText, { color: palette.text }]}>{meta.label}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}
            </ScrollView>
          )}
        </>
      )}

      {/* Type Selection Modal */}
      <Modal visible={showTypeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
              <Text style={[styles.modalTitle, { color: palette.text }]}>Select leave type</Text>
              <TouchableOpacity onPress={() => setShowTypeModal(false)} style={[styles.modalClose, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                <Ionicons name="close" size={18} color={palette.text as any} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={leaveTypes}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, { borderBottomColor: palette.border }]}
                  onPress={() => {
                    setSelectedTypeId(item.id);
                    setShowTypeModal(false);
                    setEstimatedHours(null);
                  }}
                >
                  <Text style={[styles.modalItemText, { color: palette.text }]}>{item.name}</Text>
                  {selectedTypeId === item.id ? <Ionicons name="checkmark" size={18} color={palette.cyan as any} /> : null}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.modalEmpty}>
                  <Text style={[styles.modalEmptyText, { color: palette.muted }]}>No leave types available</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      <Modal visible={datePickerKind !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
              <Text style={[styles.modalTitle, { color: palette.text }]}>
                {datePickerKind === 'start' ? 'Select start date' : 'Select end date'}
              </Text>
              <TouchableOpacity
                onPress={() => setDatePickerKind(null)}
                style={[styles.modalClose, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
              >
                <Ionicons name="close" size={18} color={palette.text as any} />
              </TouchableOpacity>
            </View>

            <View style={{ paddingHorizontal: 18, paddingVertical: 14 }}>
              <DateTimePicker
                value={datePickerValue}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event: any, selectedDate?: Date) => {
                  if (Platform.OS === 'android') {
                    if (event?.type === 'dismissed') {
                      setDatePickerKind(null);
                      return;
                    }
                    if (event?.type === 'set' && selectedDate && datePickerKind) {
                      applyPickedDate(datePickerKind, selectedDate);
                      setDatePickerKind(null);
                    }
                    return;
                  }
                  if (selectedDate) setDatePickerValue(selectedDate);
                }}
              />

              {Platform.OS === 'ios' ? (
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  <TouchableOpacity
                    style={[styles.secondaryBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
                    onPress={() => setDatePickerKind(null)}
                  >
                    <Text style={[styles.secondaryBtnText, { color: palette.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: palette.indigo }]}
                    onPress={() => {
                      if (datePickerKind) applyPickedDate(datePickerKind, datePickerValue);
                      setDatePickerKind(null);
                    }}
                  >
                    <Text style={styles.primaryBtnText}>Done</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
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
    width: 360,
    height: 360,
    borderRadius: 240,
    transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }],
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 8,
    gap: 10,
  },
  tabPill: {
    flex: 1,
    height: 40,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 18,
    gap: 14,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  cardDesc: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
  },
  balanceRow: {
    gap: 12,
    paddingRight: 4,
  },
  balanceCard: {
    width: 140,
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  balanceValue: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  selectRow: {
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  field: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fieldTall: {
    height: 110,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 12,
  },
  input: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  secondaryBtn: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  primaryBtn: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  notice: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  filters: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  filterPill: {
    height: 38,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 26,
    paddingHorizontal: 18,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  emptyHint: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    textAlign: 'center',
  },
  historyList: {
    gap: 12,
  },
  historyItem: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyType: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  historyDate: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
  },
  historyReason: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  statusPill: {
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 8,
  },
  modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
  },
  modalContent: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '70%',
      borderWidth: 1,
  },
  modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderBottomWidth: 1,
  },
  modalTitle: {
      fontSize: 16,
      fontWeight: '900',
      letterSpacing: -0.2,
  },
  modalClose: {
    width: 38,
    height: 38,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderBottomWidth: 1,
  },
  modalItemText: {
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.2,
  },
  modalEmpty: {
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalEmptyText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
