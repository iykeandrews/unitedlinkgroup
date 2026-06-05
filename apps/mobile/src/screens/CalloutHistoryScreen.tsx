'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Linking, RefreshControl, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

type CalloutItem = {
  id: string;
  createdAt: string;
  status: 'PENDING' | 'APPROVED_OPEN' | 'COVERED' | 'REJECTED' | string;
  reasonCode: string;
  reasonNote?: string | null;
  documentationUrl?: string | null;
  noticeAt?: string | null;
  shift?: {
    id: string;
    startTime: string;
    endTime?: string | null;
    location?: { name?: string | null } | null;
  } | null;
};

export default function CalloutHistoryScreen() {
  const [items, setItems] = useState<CalloutItem[]>([]);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<any>();

  const palette = useMemo(
    () => ({
      bg: '#050816',
      panel: 'rgba(255,255,255,0.08)',
      panelStrong: 'rgba(255,255,255,0.11)',
      border: 'rgba(255,255,255,0.14)',
      text: '#E8EEF9',
      muted: '#99A7C2',
      faint: '#7081A7',
      cyan: '#67E8F9',
      green: '#34D399',
      amber: '#FBBF24',
      red: '#FB7185',
      indigo: '#818CF8',
    }),
    []
  );

  const fetchCallouts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/scheduling/my-callouts');
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.log('Error fetching callouts', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchCallouts();
    }, [fetchCallouts])
  );

  const formatDateTime = (value?: string | null) => {
    if (!value) return 'N/A';
    return new Date(value).toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusMeta = (status?: string) => {
    const normalized = String(status || '').toUpperCase();
    if (normalized === 'APPROVED_OPEN') return { label: 'Approved', color: palette.cyan };
    if (normalized === 'COVERED') return { label: 'Covered', color: palette.green };
    if (normalized === 'REJECTED') return { label: 'Rejected', color: palette.red };
    return { label: 'Pending', color: palette.amber };
  };

  const summary = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        const normalized = String(item.status || '').toUpperCase();
        acc.total += 1;
        if (normalized === 'PENDING') acc.pending += 1;
        if (normalized === 'APPROVED_OPEN' || normalized === 'COVERED') acc.approved += 1;
        if (normalized === 'REJECTED') acc.rejected += 1;
        return acc;
      },
      { total: 0, pending: 0, approved: 0, rejected: 0 }
    );
  }, [items]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.bg }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.bgGlowWrap} pointerEvents="none">
        <View style={[styles.bgGlow, { backgroundColor: palette.indigo, top: -160, left: -160, opacity: 0.22 }]} />
        <View style={[styles.bgGlow, { backgroundColor: palette.cyan, bottom: -180, right: -180, opacity: 0.16 }]} />
        <View style={[styles.bgGlow, { backgroundColor: palette.green, top: 240, right: -210, opacity: 0.1 }]} />
      </View>

      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.headerTitle, { color: palette.text }]}>My Call-Outs</Text>
          <Text style={[styles.headerSubtitle, { color: palette.muted }]}>
            Review submitted call-outs and track their approval status.
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.actionPill, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
            onPress={() => {
              if (navigation.canGoBack()) navigation.goBack();
              else navigation.navigate('ScheduleHome');
            }}
          >
            <Ionicons name="arrow-back" size={18} color={palette.text as any} />
            <Text style={[styles.actionPillText, { color: palette.text }]}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong, opacity: loading ? 0.7 : 1 }]}
            onPress={fetchCallouts}
            disabled={loading}
          >
            <Ionicons name="refresh" size={18} color={palette.text as any} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.summaryCard, { backgroundColor: palette.panel, borderColor: palette.border }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: palette.muted }]}>Submitted</Text>
          <Text style={[styles.summaryValue, { color: palette.text }]}>{summary.total}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: palette.muted }]}>Pending</Text>
          <Text style={[styles.summaryValue, { color: palette.text }]}>{summary.pending}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: palette.muted }]}>Approved</Text>
          <Text style={[styles.summaryValue, { color: palette.text }]}>{summary.approved}</Text>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchCallouts} tintColor={palette.cyan as any} />}
        contentContainerStyle={items.length ? styles.listContent : styles.emptyContent}
        renderItem={({ item }) => {
          const status = statusMeta(item.status);
          const locationName = item.shift?.location?.name || 'Unassigned location';
          return (
            <View style={[styles.card, { borderColor: palette.border, backgroundColor: palette.panel }]}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: palette.text }]}>
                    {item.reasonCode.replace(/_/g, ' ')}
                  </Text>
                  <Text style={[styles.cardSubtitle, { color: palette.muted }]}>
                    Submitted {formatDateTime(item.createdAt)}
                  </Text>
                </View>
                <View style={[styles.statusPill, { borderColor: status.color, backgroundColor: `${status.color}22` }]}>
                  <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                  <Text style={[styles.statusText, { color: palette.text }]}>{status.label}</Text>
                </View>
              </View>

              <View style={styles.row}>
                <Ionicons name="calendar-outline" size={14} color={palette.cyan as any} />
                <Text style={[styles.rowText, { color: palette.text }]}>
                  {formatDateTime(item.shift?.startTime)}
                  {item.shift?.endTime ? ` - ${new Date(item.shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                </Text>
              </View>
              <View style={styles.row}>
                <Ionicons name="location-outline" size={14} color={palette.cyan as any} />
                <Text style={[styles.rowText, { color: palette.text }]}>{locationName}</Text>
              </View>
              {item.noticeAt ? (
                <View style={styles.row}>
                  <Ionicons name="time-outline" size={14} color={palette.cyan as any} />
                  <Text style={[styles.rowText, { color: palette.text }]}>Notice sent {formatDateTime(item.noticeAt)}</Text>
                </View>
              ) : null}
              {item.reasonNote ? (
                <View style={[styles.noteBox, { borderColor: palette.border, backgroundColor: palette.panel }]}>
                  <Text style={[styles.noteLabel, { color: palette.faint }]}>Note</Text>
                  <Text style={[styles.noteText, { color: palette.text }]}>{item.reasonNote}</Text>
                </View>
              ) : null}
              {item.documentationUrl ? (
                <TouchableOpacity
                  style={[styles.attachmentBtn, { borderColor: palette.border, backgroundColor: palette.panel }]}
                  onPress={() => Linking.openURL(String(item.documentationUrl))}
                >
                  <Ionicons name="document-attach-outline" size={16} color={palette.cyan as any} />
                  <Text style={[styles.attachmentText, { color: palette.text }]}>Open Attachment</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="file-tray-outline" size={30} color={palette.faint as any} />
            <Text style={[styles.emptyTitle, { color: palette.text }]}>No Call-Outs Yet</Text>
            <Text style={[styles.emptyText, { color: palette.muted }]}>
              Submitted call-outs will appear here with their approval status.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionPill: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionPillText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingBottom: 110,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 110,
  },
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    gap: 10,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.2,
    textTransform: 'capitalize',
  },
  cardSubtitle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  noteBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  noteLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  noteText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  attachmentBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attachmentText: {
    fontSize: 12,
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    fontWeight: '600',
  },
});
