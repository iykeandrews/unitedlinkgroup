import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Image, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

type IncidentListItem = {
  id: string;
  reportNumber?: string | null;
  title: string;
  description?: string | null;
  severity?: string | null;
  status?: string | null;
  type?: string | null;
  date?: string | null;
  createdAt?: string | null;
  location?: { id: string; name: string; address?: string | null } | null;
  evidence?: Array<any>;
};

const palette = {
  bg: '#050816',
  panel: '#0B1224',
  panelStrong: '#101B35',
  border: 'rgba(255,255,255,0.14)',
  text: '#E8EEF9',
  muted: 'rgba(232,238,249,0.66)',
  faint: 'rgba(232,238,249,0.40)',
  indigo: '#4F46E5',
  cyan: '#22D3EE',
  danger: '#FB7185',
  success: '#34D399',
  amber: '#FBBF24',
};

function normalizeApiError(err: any, fallback: string) {
  const apiMessage = err?.response?.data?.message;
  if (typeof apiMessage === 'string' && apiMessage.trim()) return apiMessage;
  if (Array.isArray(apiMessage) && apiMessage.length) return apiMessage.map((x) => String(x)).join('\n');
  if (typeof err?.message === 'string' && err.message.trim()) return err.message;
  return fallback;
}

function badgeColorForSeverity(severity: string) {
  const s = String(severity || '').toUpperCase();
  if (s === 'CRITICAL') return palette.danger;
  if (s === 'HIGH') return palette.amber;
  if (s === 'MEDIUM') return palette.cyan;
  return palette.success;
}

export default function IncidentReportHistoryScreen() {
  const navigation = useNavigation<any>();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [items, setItems] = useState<IncidentListItem[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | 'OPEN' | 'RESOLVED' | 'CLOSED'>('ALL');
  const [error, setError] = useState<string>('');

  const toAuthedUrl = useCallback(
    (pathOrUrl: string) => {
      const base = String((api.defaults as any).baseURL || '').replace(/\/$/, '');
      const p = String(pathOrUrl || '').trim();
      const url = p.startsWith('http') ? p : `${base}${p.startsWith('/') ? '' : '/'}${p}`;
      const t = String(token || '').trim();
      if (!t) return url;
      const sep = url.includes('?') ? '&' : '?';
      return `${url}${sep}token=${encodeURIComponent(t)}`;
    },
    [token]
  );

  const getPreviewImageUrl = useCallback(
    (evidence: any) => {
      const list = Array.isArray(evidence) ? evidence : [];
      const candidate = list.find((x) => {
        const kind = String(x?.kind || '').toUpperCase();
        const mime = String(x?.mimeType || '');
        return kind === 'IMAGE' || mime.startsWith('image/');
      });
      const url = candidate?.url ? String(candidate.url) : '';
      return url ? toAuthedUrl(url) : '';
    },
    [toAuthedUrl]
  );

  const fetchEmployeeId = useCallback(async () => {
    if (employeeId) return employeeId;
    const res = await api.get('/employees/me');
    const id = res?.data?.id ? String(res.data.id) : '';
    if (!id) throw new Error('Employee profile not found');
    setEmployeeId(id);
    return id;
  }, [employeeId]);

  const fetchIncidents = useCallback(
    async (opts?: { showSpinner?: boolean }) => {
      setError('');
      if (opts?.showSpinner) setLoading(true);
      try {
        const storedToken = await AsyncStorage.getItem('token');
        setToken(String(storedToken || '').trim());
        const eid = await fetchEmployeeId();
        const res = await api.get('/incident-reports', {
          params: {
            page: 1,
            pageSize: 50,
            reportingOfficerEmployeeId: eid,
            search: search.trim() || undefined,
            status: status === 'ALL' ? undefined : status,
          },
        });
        const nextItems = Array.isArray(res?.data?.items) ? res.data.items : [];
        setItems(nextItems);
      } catch (e: any) {
        setError(normalizeApiError(e, 'Failed to load incident reports.'));
        setItems([]);
      } finally {
        if (opts?.showSpinner) setLoading(false);
      }
    },
    [fetchEmployeeId, search, status]
  );

  useFocusEffect(
    useCallback(() => {
      fetchIncidents({ showSpinner: true });
    }, [fetchIncidents])
  );

  const filteredTitle = useMemo(() => {
    if (status === 'ALL') return 'Incident history';
    return `Incident history • ${status}`;
  }, [status]);

  const grouped = useMemo(() => {
    const groups = new Map<string, { key: string; label: string; items: IncidentListItem[] }>();
    for (const it of items) {
      const key = it.location?.id || 'UNASSIGNED';
      const label = it.location?.name ? String(it.location.name) : 'Unassigned';
      const existing = groups.get(key);
      if (existing) existing.items.push(it);
      else groups.set(key, { key, label, items: [it] });
    }
    return Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [items]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchIncidents();
    } finally {
      setRefreshing(false);
    }
  }, [fetchIncidents]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={palette.text as any} />
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.titleText} numberOfLines={1}>
            {filteredTitle}
          </Text>
          <Text style={styles.subtitleText} numberOfLines={1}>
            Your submitted incident reports
          </Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('IncidentReportCreate')} style={styles.newBtn}>
          <Ionicons name="add" size={18} color={'#ffffff' as any} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.cyan as any} />}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.label}>Search</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Uploader, description, upload date (YYYY-MM-DD)…"
            placeholderTextColor={palette.faint}
            style={styles.input}
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={() => fetchIncidents({ showSpinner: true })}
          />

          <View style={styles.filterRow}>
            {(['ALL', 'OPEN', 'RESOLVED', 'CLOSED'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setStatus(s)}
                style={[styles.chip, s === status ? styles.chipActive : null]}
              >
                <Text style={[styles.chipText, s === status ? styles.chipTextActive : null]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity onPress={() => fetchIncidents({ showSpinner: true })} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={18} color={palette.text as any} />
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={palette.cyan as any} />
            <Text style={styles.loadingText}>Loading…</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Unable to load</Text>
            <Text style={styles.emptyText}>{error}</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No reports yet</Text>
            <Text style={styles.emptyText}>Create your first incident report from the + button.</Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {grouped.map((group) => (
              <View key={group.key} style={{ gap: 12 }}>
                <View style={styles.groupHeader}>
                  <View style={styles.groupHeaderLeft}>
                    <Ionicons name="location-outline" size={16} color={palette.muted as any} />
                    <Text style={styles.groupHeaderText} numberOfLines={1}>
                      {group.label}
                    </Text>
                  </View>
                  <Text style={styles.groupHeaderCount}>{group.items.length}</Text>
                </View>

                {group.items.map((it) => {
                  const reportLabel = it.reportNumber ? String(it.reportNumber) : it.id.slice(0, 8);
                  const dateLabel = it.createdAt || it.date ? new Date(String(it.createdAt || it.date)).toLocaleString() : '';
                  const sev = String(it.severity || 'LOW').toUpperCase();
                  const stat = String(it.status || 'OPEN').toUpperCase();
                  const evidenceCount = Array.isArray(it.evidence) ? it.evidence.length : 0;

                  return (
                    <TouchableOpacity
                      key={it.id}
                      onPress={() => navigation.navigate('IncidentReportDetail', { id: it.id })}
                      style={styles.itemCard}
                    >
                      <View style={styles.itemTopRow}>
                        <View style={[styles.badge, { backgroundColor: badgeColorForSeverity(sev) }]}>
                          <Text style={styles.badgeText}>{sev}</Text>
                        </View>
                        <Text style={styles.itemMetaText} numberOfLines={1}>
                          {stat} • {reportLabel}
                        </Text>
                      </View>
                      <View style={styles.itemBodyRow}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.itemTitle} numberOfLines={1}>
                            {it.title}
                          </Text>
                          <Text style={styles.itemSub} numberOfLines={2}>
                            {dateLabel}
                          </Text>
                          <Text style={styles.itemSub} numberOfLines={1}>
                            Evidence: {evidenceCount}
                          </Text>
                        </View>
                        {getPreviewImageUrl(it.evidence) ? (
                          <Image source={{ uri: getPreviewImageUrl(it.evidence) }} style={styles.previewImage} />
                        ) : (
                          <View style={styles.previewPlaceholder}>
                            <Ionicons name="image-outline" size={18} color={palette.faint as any} />
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newBtn: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: palette.indigo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 16,
    fontWeight: '900',
    color: palette.text,
    letterSpacing: -0.2,
  },
  subtitleText: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.muted,
    marginTop: 2,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 14,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.panel,
    padding: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '900',
    color: palette.muted,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.panelStrong,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: palette.text,
    fontSize: 14,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  chipActive: {
    borderColor: 'rgba(34,211,238,0.65)',
    backgroundColor: 'rgba(34,211,238,0.14)',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '900',
    color: palette.text,
    opacity: 0.72,
  },
  chipTextActive: {
    opacity: 1,
  },
  refreshBtn: {
    marginTop: 12,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  refreshText: {
    fontSize: 13,
    fontWeight: '900',
    color: palette.text,
  },
  loadingWrap: {
    paddingTop: 24,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.panel,
    padding: 16,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: palette.text,
  },
  emptyText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
    color: palette.muted,
    lineHeight: 18,
  },
  itemCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.panel,
    padding: 14,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  groupHeaderText: {
    color: palette.text,
    fontSize: 12,
    fontWeight: '900',
  },
  groupHeaderCount: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  itemBodyRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  itemMetaText: {
    flex: 1,
    textAlign: 'right',
    color: palette.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  itemTitle: {
    marginTop: 10,
    color: palette.text,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.1,
  },
  itemSub: {
    marginTop: 6,
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  previewImage: {
    width: 64,
    height: 64,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.panelStrong,
  },
  previewPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.panelStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
