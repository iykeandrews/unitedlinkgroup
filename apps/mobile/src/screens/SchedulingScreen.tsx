import React, { useMemo, useState, useCallback } from 'react';
import { Alert, FlatList, Linking, Modal, Platform, RefreshControl, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import * as DocumentPicker from 'expo-document-picker';
import { navigate } from '../navigation/NavigationService';

export default function SchedulingScreen() {
  const { user, displayName, designation } = useAuth();
  const [shifts, setShifts] = useState<any[]>([]);
  const [summary, setSummary] = useState<{ totalHours?: number; totalBreakMinutes?: number; payableHours?: number; estimatedEarnings?: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'UPCOMING' | 'ALL' | 'PAST'>('ALL');
  const [calloutShiftId, setCalloutShiftId] = useState<string | null>(null);
  const [calloutReasonCode, setCalloutReasonCode] = useState<'SICK' | 'EMERGENCY' | 'PERSONAL'>('SICK');
  const [calloutReasonNote, setCalloutReasonNote] = useState('');
  const [calloutSubmittingId, setCalloutSubmittingId] = useState<string | null>(null);
  const [calloutAttachment, setCalloutAttachment] = useState<{ uri: string; name: string; mimeType: string } | null>(null);
  const [calloutUploading, setCalloutUploading] = useState(false);

  const roleUpper = useMemo(
    () => String(user?.employeeRole || user?.role || '').toUpperCase(),
    [user?.employeeRole, user?.role]
  );
  const isEmployee = roleUpper === 'EMPLOYEE';

  const fetchShifts = async () => {
    if (!isEmployee) {
      setLoading(false);
      setShifts([]);
      setSummary(null);
      return;
    }
    setLoading(true);
    try {
      const now = new Date();
      // Fetch for previous 7 days and next 30 days
      const start = new Date();
      start.setDate(now.getDate() - 7);
      const end = new Date();
      end.setDate(now.getDate() + 30);

      const res = await api.get('/scheduling/my', {
        params: {
          start: start.toISOString(),
          end: end.toISOString()
        }
      });
      setShifts(res.data.shifts || []);
      setSummary(res.data.summary || null);
    } catch (e) {
      console.log('Error fetching shifts', e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchShifts();
    }, [])
  );

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

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

  const openMaps = async (address: string) => {
    const q = encodeURIComponent(address);
    const url = Platform.select({
      ios: `http://maps.apple.com/?q=${q}`,
      android: `geo:0,0?q=${q}`,
      default: `https://www.google.com/maps/search/?api=1&query=${q}`,
    }) as string;
    try {
      await Linking.openURL(url);
    } catch {}
  };

  const filteredShifts = useMemo(() => {
    const now = Date.now();
    const list = (shifts || []).slice();
    if (filter === 'UPCOMING') {
      return list.filter((s) => {
        const endMs = new Date(s.endTime ?? s.startTime ?? 0).getTime();
        if (!Number.isFinite(endMs)) return true;
        return endMs >= now;
      });
    }
    if (filter === 'PAST') {
      return list.filter((s) => {
        const endMs = new Date(s.endTime ?? s.startTime ?? 0).getTime();
        if (!Number.isFinite(endMs)) return false;
        return endMs < now;
      });
    }
    return list;
  }, [filter, shifts]);

  const handleSubmitCallout = async (shiftId: string) => {
    try {
      setCalloutSubmittingId(shiftId);
      let documentationUrl: string | undefined;
      if (calloutAttachment) {
        const form = new FormData();
        form.append('file', { uri: calloutAttachment.uri, name: calloutAttachment.name, type: calloutAttachment.mimeType } as any);
        const endpoint = calloutAttachment.mimeType.startsWith('image/') ? '/uploads/images' : '/uploads';
        const upload = await api.post(endpoint, form, { headers: { 'Content-Type': 'multipart/form-data' } });
        documentationUrl = String(upload.data?.url || '') || undefined;
      }
      await api.post(`/scheduling/shifts/${shiftId}/callout`, {
        reasonCode: calloutReasonCode,
        reasonNote: calloutReasonNote.trim() || undefined,
        type: 'EXCUSED',
        noticeAt: new Date().toISOString(),
        documentationUrl,
      });
      Alert.alert('Submitted', 'Your call-out has been submitted for approval.');
      setCalloutShiftId(null);
      setCalloutReasonCode('SICK');
      setCalloutReasonNote('');
      setCalloutAttachment(null);
      fetchShifts();
    } catch (e: any) {
      const apiMessage = e?.response?.data?.message;
      const msg = typeof apiMessage === 'string' ? apiMessage : 'Failed to submit call-out';
      Alert.alert('Call-out failed', msg);
    } finally {
      setCalloutSubmittingId(null);
    }
  };

  const closeCalloutModal = () => {
    if (calloutSubmittingId) return;
    setCalloutShiftId(null);
    setCalloutReasonCode('SICK');
    setCalloutReasonNote('');
    setCalloutAttachment(null);
  };

  const pickCalloutDocument = async () => {
    try {
      setCalloutUploading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) return;
      setCalloutAttachment({
        uri: asset.uri,
        name: String(asset.name || `callout-${Date.now()}`),
        mimeType: String(asset.mimeType || 'application/octet-stream'),
      });
    } catch (e: any) {
      Alert.alert('Attachment', String(e?.message || 'Unable to pick document'));
    } finally {
      setCalloutUploading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const start = new Date(item.startTime);
    const end = new Date(item.endTime ?? item.startTime);
    const address = String(item.location?.address || '').trim();
    const locationName = String(item.location?.name || 'No Location').trim();
    const fullLocation = address ? `${locationName} • ${address}` : locationName;
    const isToday = start.toDateString() === new Date().toDateString();
    const isActive = start.getTime() <= Date.now() && end.getTime() >= Date.now();
    const canCallOut = end.getTime() >= Date.now();
    const hasPendingCallout = !!item?.callout && !item?.callout?.resolvedAt && String(item?.status || '').toUpperCase() !== 'OPEN';
    const accent = isActive ? palette.green : isToday ? palette.cyan : palette.indigo;

    return (
      <View style={[styles.shiftCard, { backgroundColor: palette.panel, borderColor: palette.border }]}>
        <View style={[styles.cardLeft, { borderRightColor: palette.border }]}>
          <Text style={[styles.dateDay, { color: palette.text }]}>{start.getDate()}</Text>
          <Text style={[styles.dateMonth, { color: palette.muted }]}>{start.toLocaleDateString([], { month: 'short' }).toUpperCase()}</Text>
          <View style={[styles.line, { backgroundColor: accent }]} />
        </View>
        <View style={styles.cardRight}>
          <View style={styles.topRow}>
            <Text style={[styles.timeText, { color: palette.text }]}>
              {formatDate(item.startTime)} • {formatTime(item.startTime)} - {formatTime(item.endTime ?? item.startTime)}
            </Text>
            {address ? (
              <TouchableOpacity
                style={[styles.mapBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
                onPress={() => openMaps(address)}
              >
                <Ionicons name="navigate-outline" size={16} color={palette.text as any} />
              </TouchableOpacity>
            ) : null}
          </View>

          <Text style={[styles.locationText, { color: palette.text }]} numberOfLines={2}>
            {fullLocation}
          </Text>

          <View style={styles.metaRow}>
            {item.role ? (
              <View style={[styles.pill, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                <Ionicons name="shield-outline" size={14} color={palette.cyan as any} />
                <Text style={[styles.pillText, { color: palette.text }]}>{String(item.role).replace(/_/g, ' ')}</Text>
              </View>
            ) : null}
            {isActive ? (
              <View style={[styles.pill, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                <View style={[styles.dot, { backgroundColor: palette.green }]} />
                <Text style={[styles.pillText, { color: palette.text }]}>Active</Text>
              </View>
            ) : isToday ? (
              <View style={[styles.pill, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                <View style={[styles.dot, { backgroundColor: palette.cyan }]} />
                <Text style={[styles.pillText, { color: palette.text }]}>Today</Text>
              </View>
            ) : null}
            {hasPendingCallout ? (
              <View style={[styles.pill, { borderColor: palette.border, backgroundColor: 'rgba(251,113,133,0.16)' }]}>
                <View style={[styles.dot, { backgroundColor: palette.red }]} />
                <Text style={[styles.pillText, { color: palette.text }]}>Call-out Pending</Text>
              </View>
            ) : null}
          </View>

          {canCallOut ? (
            <View style={styles.calloutWrap}>
              <TouchableOpacity
                style={[
                  styles.calloutToggle,
                  {
                    borderColor: palette.border,
                    backgroundColor: hasPendingCallout ? 'rgba(251,113,133,0.18)' : calloutShiftId === item.id ? 'rgba(251,113,133,0.18)' : palette.panelStrong,
                    opacity: hasPendingCallout ? 0.72 : 1,
                  },
                ]}
                disabled={hasPendingCallout}
                onPress={() => {
                  setCalloutReasonCode('SICK');
                  setCalloutReasonNote('');
                  setCalloutAttachment(null);
                  setCalloutShiftId(item.id);
                }}
              >
                <Ionicons name="alert-circle-outline" size={15} color={palette.red as any} />
                <Text style={[styles.calloutToggleText, { color: palette.text }]}>{hasPendingCallout ? 'Awaiting Approval' : 'Call Out'}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.bg }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.bgGlowWrap} pointerEvents="none">
        <View style={[styles.bgGlow, { backgroundColor: palette.indigo, top: -160, left: -160, opacity: 0.22 }]} />
        <View style={[styles.bgGlow, { backgroundColor: palette.cyan, bottom: -180, right: -180, opacity: 0.16 }]} />
        <View style={[styles.bgGlow, { backgroundColor: palette.green, top: 240, right: -210, opacity: 0.10 }]} />
      </View>

      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.headerTitle, { color: palette.text }]}>Schedule</Text>
          <Text style={[styles.headerSubtitle, { color: palette.muted }]}>Your published shifts</Text>
          <Text style={[styles.headerSubtitle, { color: palette.faint }]} numberOfLines={1}>
            {displayName}{designation ? ` • ${designation}` : ''}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.historyBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
            onPress={() => navigate('Schedule', { screen: 'CalloutHistory' })}
          >
            <Ionicons name="time-outline" size={15} color={palette.cyan as any} />
            <Text style={[styles.historyBtnText, { color: palette.text }]}>Call-Outs</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.refreshBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong, opacity: loading ? 0.7 : 1 }]}
            onPress={fetchShifts}
            disabled={loading}
          >
            <Ionicons name="refresh" size={18} color={palette.text as any} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filters}>
        {(['UPCOMING', 'ALL', 'PAST'] as const).map((k) => {
          const active = filter === k;
          const label = k === 'UPCOMING' ? 'Upcoming' : k === 'PAST' ? 'Past' : 'All';
          return (
            <TouchableOpacity
              key={k}
              style={[
                styles.filterPill,
                {
                  borderColor: palette.border,
                  backgroundColor: active ? palette.indigo : palette.panel,
                  opacity: loading ? 0.75 : 1,
                },
              ]}
              onPress={() => setFilter(k)}
              disabled={loading}
            >
              <Text style={[styles.filterText, { color: active ? '#ffffff' : palette.text }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {summary ? (
        <View style={[styles.summaryCard, { backgroundColor: palette.panel, borderColor: palette.border }]}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: palette.muted }]}>Total</Text>
            <Text style={[styles.summaryValue, { color: palette.text }]}>{Number(summary.totalHours ?? 0).toFixed(1)}h</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: palette.muted }]}>Payable</Text>
            <Text style={[styles.summaryValue, { color: palette.text }]}>{Number(summary.payableHours ?? 0).toFixed(1)}h</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: palette.muted }]}>Est.</Text>
            <Text style={[styles.summaryValue, { color: palette.text }]}>${Number(summary.estimatedEarnings ?? 0).toFixed(0)}</Text>
          </View>
        </View>
      ) : null}
      
      {!isEmployee ? (
         <View style={styles.emptyContainer}>
            <Ionicons name="lock-closed-outline" size={52} color={palette.faint as any} />
            <Text style={[styles.emptyText, { color: palette.muted }]}>Employee access only.</Text>
            <Text style={[styles.emptyHint, { color: palette.faint }]}>Schedule is available for employee accounts on the mobile app.</Text>
         </View>
      ) : filteredShifts.length === 0 && !loading ? (
         <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={52} color={palette.faint as any} />
            <Text style={[styles.emptyText, { color: palette.muted }]}>No shifts found.</Text>
            <Text style={[styles.emptyHint, { color: palette.faint }]}>Pull to refresh or change the filter.</Text>
         </View>
      ) : (
        <FlatList
          data={filteredShifts}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchShifts} tintColor={palette.cyan as any} />}
        />
      )}

      <Modal visible={!!calloutShiftId} transparent animationType="fade" onRequestClose={closeCalloutModal}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { borderColor: palette.border, backgroundColor: '#0B1020' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: palette.text }]}>Call Out</Text>
                <Text style={[styles.modalSubtitle, { color: palette.muted }]}>Submit your absence for approval.</Text>
              </View>
              <TouchableOpacity
                style={[styles.modalClose, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
                onPress={closeCalloutModal}
                disabled={!!calloutSubmittingId}
              >
                <Ionicons name="close" size={16} color={palette.text as any} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.calloutLabel, { color: palette.text }]}>Reason</Text>
            <View style={styles.calloutChips}>
              {(['SICK', 'EMERGENCY', 'PERSONAL'] as const).map((code) => {
                const active = calloutReasonCode === code;
                return (
                  <TouchableOpacity
                    key={code}
                    style={[
                      styles.calloutChip,
                      {
                        borderColor: active ? palette.red : palette.border,
                        backgroundColor: active ? 'rgba(251,113,133,0.18)' : palette.panel,
                      },
                    ]}
                    onPress={() => setCalloutReasonCode(code)}
                  >
                    <Text style={[styles.calloutChipText, { color: palette.text }]}>{code}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              value={calloutReasonNote}
              onChangeText={setCalloutReasonNote}
              placeholder="Add note (optional)"
              placeholderTextColor={palette.faint as any}
              multiline
              style={[
                styles.calloutInput,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.panel,
                  color: palette.text,
                },
              ]}
            />

            <TouchableOpacity
              style={[styles.attachmentBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong, opacity: calloutUploading ? 0.7 : 1 }]}
              onPress={pickCalloutDocument}
              disabled={calloutUploading || !!calloutSubmittingId}
            >
              <Ionicons name="attach-outline" size={16} color={palette.cyan as any} />
              <Text style={[styles.attachmentBtnText, { color: palette.text }]}>
                {calloutUploading ? 'Picking file...' : calloutAttachment ? 'Change Attachment' : 'Add Attachment'}
              </Text>
            </TouchableOpacity>
            {calloutAttachment ? (
              <View style={[styles.attachmentInfo, { borderColor: palette.border, backgroundColor: palette.panel }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.attachmentName, { color: palette.text }]} numberOfLines={1}>
                    {calloutAttachment.name}
                  </Text>
                  <Text style={[styles.attachmentHint, { color: palette.muted }]}>Optional supporting document</Text>
                </View>
                <TouchableOpacity onPress={() => setCalloutAttachment(null)}>
                  <Ionicons name="close-circle" size={18} color={palette.red as any} />
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.calloutActions}>
              <TouchableOpacity
                style={[styles.calloutSecondaryBtn, { borderColor: palette.border, backgroundColor: palette.panel }]}
                onPress={closeCalloutModal}
                disabled={!!calloutSubmittingId}
              >
                <Text style={[styles.calloutSecondaryText, { color: palette.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.calloutPrimaryBtn, { backgroundColor: palette.red, opacity: calloutSubmittingId === calloutShiftId ? 0.75 : 1 }]}
                disabled={calloutSubmittingId === calloutShiftId}
                onPress={() => calloutShiftId && handleSubmitCallout(calloutShiftId)}
              >
                <Text style={styles.calloutPrimaryText}>
                  {calloutSubmittingId === calloutShiftId ? 'Submitting...' : 'Submit Call Out'}
                </Text>
              </TouchableOpacity>
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
  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  refreshBtn: {
    width: 42,
    height: 42,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBtn: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  historyBtnText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
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
  filters: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 8,
    flexDirection: 'row',
    gap: 10,
  },
  filterPill: {
    flex: 1,
    height: 40,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  summaryCard: {
    marginHorizontal: 18,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  summaryValue: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 18,
  },
  shiftCard: {
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  cardLeft: {
    width: 86,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRightWidth: 1,
  },
  dateDay: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  dateMonth: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  line: {
    width: 30,
    height: 3,
    borderRadius: 999,
    marginTop: 12,
  },
  cardRight: {
    flex: 1,
    padding: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    flex: 1,
  },
  mapBtn: {
    width: 34,
    height: 34,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  metaRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  calloutWrap: {
    marginTop: 12,
    gap: 10,
  },
  calloutToggle: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calloutToggleText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  calloutPanel: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    gap: 10,
  },
  calloutLabel: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  calloutChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  calloutChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  calloutChipText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  calloutInput: {
    minHeight: 84,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
    fontSize: 13,
  },
  calloutActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  calloutSecondaryBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  calloutSecondaryText: {
    fontSize: 12,
    fontWeight: '800',
  },
  calloutPrimaryBtn: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  calloutPrimaryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.58)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  modalSubtitle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attachmentBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  attachmentInfo: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  attachmentName: {
    fontSize: 12,
    fontWeight: '800',
  },
  attachmentHint: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
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
  pillText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  emptyText: {
    marginTop: 14,
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
});
