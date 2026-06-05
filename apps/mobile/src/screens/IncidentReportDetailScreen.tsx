import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

type EvidenceItem = {
  id: string;
  kind?: string | null;
  url: string;
  originalName?: string | null;
  mimeType?: string | null;
};

type IncidentDetail = {
  id: string;
  reportNumber?: string | null;
  title: string;
  description?: string | null;
  severity?: string | null;
  status?: string | null;
  type?: string | null;
  date?: string | null;
  incidentAt?: string | null;
  location?: { id: string; name: string; address?: string | null } | null;
  evidence?: EvidenceItem[];
  timeline?: Array<{ id: string; eventType: string; createdAt: string; payload?: string | null }>;
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

export default function IncidentReportDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const incidentId = String(route?.params?.id || '').trim();

  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>('');
  const [incident, setIncident] = useState<IncidentDetail | null>(null);

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

  const fetchDetail = useCallback(
    async (opts?: { showSpinner?: boolean }) => {
      if (!incidentId) return;
      setError('');
      if (opts?.showSpinner) setLoading(true);
      try {
        const storedToken = await AsyncStorage.getItem('token');
        setToken(String(storedToken || '').trim());
        const res = await api.get(`/incident-reports/${encodeURIComponent(incidentId)}`);
        setIncident(res?.data || null);
      } catch (e: any) {
        setError(normalizeApiError(e, 'Failed to load incident report.'));
        setIncident(null);
      } finally {
        if (opts?.showSpinner) setLoading(false);
      }
    },
    [incidentId]
  );

  useFocusEffect(
    useCallback(() => {
      fetchDetail({ showSpinner: true });
    }, [fetchDetail])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchDetail();
    } finally {
      setRefreshing(false);
    }
  }, [fetchDetail]);

  const openUrl = useCallback(async (url: string) => {
    const u = String(url || '').trim();
    if (!u) return;
    try {
      await Linking.openURL(toAuthedUrl(u));
    } catch {
      Alert.alert('Unable to open', 'Could not open this file.');
    }
  }, [toAuthedUrl]);

  const reportNumber = incident?.reportNumber ? String(incident.reportNumber) : incident?.id ? incident.id.slice(0, 8) : '';
  const sev = String(incident?.severity || 'LOW').toUpperCase();
  const stat = String(incident?.status || 'OPEN').toUpperCase();
  const dateLabel = incident?.date ? new Date(String(incident.date)).toLocaleString() : '';
  const locationName = incident?.location?.name ? String(incident.location.name) : 'Site';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={palette.text as any} />
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.titleText} numberOfLines={1}>
            {incident?.title || 'Incident report'}
          </Text>
          <Text style={styles.subtitleText} numberOfLines={1}>
            {stat} • {reportNumber}
          </Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('IncidentReportCreate')} style={styles.newBtn}>
          <Ionicons name="add" size={18} color={'#ffffff' as any} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.cyan as any} />}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={palette.cyan as any} />
            <Text style={styles.loadingText}>Loading…</Text>
          </View>
        ) : error ? (
          <View style={styles.card}>
            <Text style={styles.emptyTitle}>Unable to load</Text>
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity onPress={() => fetchDetail({ showSpinner: true })} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : !incident ? (
          <View style={styles.card}>
            <Text style={styles.emptyTitle}>Not found</Text>
            <Text style={styles.emptyText}>This report could not be loaded.</Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.metaRow}>
                <View style={[styles.badge, { backgroundColor: badgeColorForSeverity(sev) }]}>
                  <Text style={styles.badgeText}>{sev}</Text>
                </View>
                <Text style={styles.metaText} numberOfLines={1}>
                  {locationName} • {dateLabel}
                </Text>
              </View>
              <Text style={styles.sectionTitle}>Details</Text>
              <Text style={styles.bodyText}>{incident.description || ''}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Evidence</Text>
              {Array.isArray(incident.evidence) && incident.evidence.length ? (
                <View style={styles.evidenceGrid}>
                  {incident.evidence.map((ev) => {
                    const kind = String(ev.kind || '').toUpperCase();
                    const isImage = kind === 'IMAGE' || String(ev.mimeType || '').startsWith('image/');
                    const isVideo = kind === 'VIDEO' || String(ev.mimeType || '').startsWith('video/');
                    const label = ev.originalName ? String(ev.originalName) : isVideo ? 'Video' : isImage ? 'Image' : 'File';

                    return (
                      <TouchableOpacity key={ev.id} onPress={() => openUrl(ev.url)} style={styles.evidenceTile}>
                        {isImage ? (
                          <Image source={{ uri: toAuthedUrl(ev.url) }} style={styles.evidenceImage} />
                        ) : (
                          <View style={styles.evidenceFileTile}>
                            <Ionicons name={isVideo ? 'videocam-outline' : 'document-outline'} size={22} color={palette.text as any} />
                            <Text style={styles.evidenceLabel} numberOfLines={2}>
                              {label}
                            </Text>
                            <Text style={styles.evidenceHint}>Tap to open</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.emptyText}>No evidence uploaded.</Text>
              )}
            </View>
          </>
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
  metaRow: {
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
  metaText: {
    flex: 1,
    textAlign: 'right',
    color: palette.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  sectionTitle: {
    marginTop: 14,
    fontSize: 13,
    fontWeight: '900',
    color: palette.text,
  },
  bodyText: {
    marginTop: 8,
    color: palette.text,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    opacity: 0.92,
  },
  evidenceGrid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  evidenceTile: {
    width: 110,
    height: 110,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.panelStrong,
    overflow: 'hidden',
  },
  evidenceImage: {
    width: '100%',
    height: '100%',
  },
  evidenceFileTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    gap: 6,
  },
  evidenceLabel: {
    textAlign: 'center',
    color: palette.text,
    fontSize: 12,
    fontWeight: '900',
    opacity: 0.85,
  },
  evidenceHint: {
    textAlign: 'center',
    color: palette.muted,
    fontSize: 11,
    fontWeight: '800',
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
  primaryBtn: {
    marginTop: 12,
    height: 44,
    borderRadius: 16,
    backgroundColor: palette.indigo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
});
