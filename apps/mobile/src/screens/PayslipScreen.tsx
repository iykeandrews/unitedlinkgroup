import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { ActivityIndicator, Alert, Modal, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../context/AuthContext';

export default function PayslipScreen() {
  const { user, displayName, designation } = useAuth();
  const [payslips, setPayslips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selected, setSelected] = useState<any | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const isEmployee = useMemo(() => String(user?.role || '').toUpperCase() === 'EMPLOYEE', [user?.role]);

  const fetchPayslips = useCallback(async () => {
    try {
      const roleUpper = String(user?.role || '').toUpperCase();
      if (roleUpper !== 'EMPLOYEE') {
        setPayslips([]);
        return;
      }
      const response = await api.get('/payroll/my-paystubs');
      const data = response.data || [];
      setPayslips(data);

    } catch (error) {
      console.error('Failed to fetch payslips', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.role]);

  const downloadPayStub = useCallback(async () => {
    if (!selected?.id) return;
    if (downloading) return;

    try {
      setDownloading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Payslip', 'Please sign in again to download.');
        return;
      }

      const baseURL = String(api.defaults.baseURL || '').replace(/\/$/, '');
      if (!baseURL) {
        Alert.alert('Payslip', 'Unable to download: missing API URL.');
        return;
      }

      const url = `${baseURL}/payroll/paystubs/${selected.id}/download`;
      const payDate = selected?.payroll?.payDate ? new Date(selected.payroll.payDate) : new Date();
      const datePart = Number.isFinite(payDate.getTime()) ? payDate.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
      const fileName = `paystub_${datePart}.pdf`;

      if (Platform.OS === 'web') {
        const res = await api.get(`/payroll/paystubs/${selected.id}/download`, { responseType: 'blob' });
        const w: any = typeof window !== 'undefined' ? window : null;
        const d: any = typeof document !== 'undefined' ? document : null;
        if (!w || !d) {
          Alert.alert('Payslip', 'Unable to download in this environment.');
          return;
        }
        const objectUrl = w.URL.createObjectURL(res.data);
        const a = d.createElement('a');
        a.href = objectUrl;
        a.download = fileName;
        d.body.appendChild(a);
        a.click();
        a.remove();
        w.URL.revokeObjectURL(objectUrl);
        return;
      }

      const directory = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (!directory) {
        Alert.alert('Payslip', 'Unable to download: storage is not available in this environment.');
        return;
      }

      const fileUri = `${directory}${fileName}`;
      const result = await FileSystem.downloadAsync(url, fileUri, { headers: { Authorization: `Bearer ${token}` } });

      const status = (result as any)?.status;
      if (typeof status === 'number' && status !== 200) {
        try {
          const raw = await FileSystem.readAsStringAsync(result.uri);
          const parsed = JSON.parse(raw);
          const msg = parsed?.message ? String(parsed.message) : `Download failed (${status})`;
          Alert.alert('Payslip', msg);
        } catch {
          Alert.alert('Payslip', `Download failed (${status})`);
        }
        return;
      }

      const info = await FileSystem.getInfoAsync(result.uri);
      const fileSize = typeof (info as any)?.size === 'number' ? (info as any).size : 0;
      if (!info.exists || fileSize <= 0) {
        Alert.alert('Payslip', 'Download failed: empty file.');
        return;
      }

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Payslip', `Downloaded to:\n${result.uri}`);
        return;
      }

      await Sharing.shareAsync(result.uri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
      });
    } catch (e: any) {
      Alert.alert('Payslip', String(e?.response?.data?.message || e?.message || 'Unable to download paystub'));
    } finally {
      setDownloading(false);
    }
  }, [downloading, selected]);

  useEffect(() => {
    fetchPayslips();
  }, [fetchPayslips]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPayslips();
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const parseJson = (value: any) => {
    if (!value) return null;
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(String(value));
    } catch {
      return null;
    }
  };

  const getTaxesTotal = (stub: any) => {
    const td = parseJson(stub?.taxDetails);
    if (td) {
      const v =
        Number(td.federalTax || 0) +
        Number(td.stateTax || 0) +
        Number(td.socialSecurity || 0) +
        Number(td.medicare || 0);
      return Number.isFinite(v) ? v : 0;
    }
    const v = Number(stub?.taxes || 0);
    return Number.isFinite(v) ? v : 0;
  };

  const yearOptions = useMemo(() => {
    const years = Array.from(
      new Set((payslips || []).map((p: any) => new Date(p?.payroll?.payDate || p?.payroll?.periodEnd || Date.now()).getFullYear()))
    ).sort((a, b) => b - a);
    return years.length ? years : [new Date().getFullYear()];
  }, [payslips]);

  useEffect(() => {
    if (!yearOptions.includes(selectedYear)) {
      setSelectedYear(yearOptions[0]);
    }
  }, [selectedYear, yearOptions]);

  const yearStubs = useMemo(() => {
    const list = (payslips || []).slice();
    return list.filter((p: any) => new Date(p?.payroll?.payDate || p?.payroll?.periodEnd || Date.now()).getFullYear() === selectedYear);
  }, [payslips, selectedYear]);

  const ytd = useMemo(() => {
    const gross = yearStubs.reduce((sum: number, p: any) => sum + Number(p?.grossPay || 0), 0);
    const net = yearStubs.reduce((sum: number, p: any) => sum + Number(p?.netPay || 0), 0);
    const taxes = yearStubs.reduce((sum: number, p: any) => sum + getTaxesTotal(p), 0);
    return { gross, net, taxes };
  }, [yearStubs]);

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: palette.bg }]}>
        <ActivityIndicator size="large" color={palette.cyan as any} />
      </View>
    );
  }

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
          <Text style={[styles.headerTitle, { color: palette.text }]}>Payslips</Text>
          <Text style={[styles.headerSubtitle, { color: palette.muted }]}>Pay history • YTD totals</Text>
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
          <Text style={[styles.emptyHint, { color: palette.muted }]}>Payslips are available for employee accounts on the mobile app.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.cyan as any} />}
        >
        <View style={styles.yearRow}>
          {yearOptions.map((y) => {
            const active = y === selectedYear;
            return (
              <TouchableOpacity
                key={String(y)}
                style={[
                  styles.yearPill,
                  { borderColor: palette.border, backgroundColor: active ? palette.indigo : palette.panel },
                ]}
                onPress={() => setSelectedYear(y)}
              >
                <Text style={[styles.yearText, { color: active ? '#ffffff' : palette.text }]}>{y}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[styles.summaryCard, { backgroundColor: palette.panel, borderColor: palette.border }]}>
          <View style={styles.summaryTop}>
            <View style={[styles.iconWrap, { borderColor: palette.border, backgroundColor: 'rgba(34,211,238,0.16)' }]}>
              <Ionicons name="cash-outline" size={18} color={palette.cyan as any} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.summaryTitle, { color: palette.text }]}>Year to date</Text>
              <Text style={[styles.summarySub, { color: palette.muted }]}>Gross • Net • Taxes</Text>
            </View>
          </View>

          <View style={styles.summaryGrid}>
            <View style={[styles.summaryTile, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
              <Text style={[styles.tileLabel, { color: palette.muted }]}>Gross</Text>
              <Text style={[styles.tileValue, { color: palette.text }]}>{formatCurrency(ytd.gross)}</Text>
            </View>
            <View style={[styles.summaryTile, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
              <Text style={[styles.tileLabel, { color: palette.muted }]}>Net</Text>
              <Text style={[styles.tileValue, { color: palette.text }]}>{formatCurrency(ytd.net)}</Text>
            </View>
            <View style={[styles.summaryTile, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
              <Text style={[styles.tileLabel, { color: palette.muted }]}>Taxes</Text>
              <Text style={[styles.tileValue, { color: palette.text }]}>{formatCurrency(ytd.taxes)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Pay stubs</Text>
          <Text style={[styles.sectionHint, { color: palette.faint }]}>{yearStubs.length} items</Text>
        </View>

        {yearStubs.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="document-text-outline" size={52} color={palette.faint as any} />
            <Text style={[styles.emptyTitle, { color: palette.muted }]}>No payslips found</Text>
            <Text style={[styles.emptyHint, { color: palette.faint }]}>Try a different year or pull to refresh.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {yearStubs.map((item) => {
              const status = String(item?.payroll?.status || '').toUpperCase() || 'PAID';
              const statusColor = status === 'PAID' ? palette.green : palette.amber;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.card, { borderColor: palette.border, backgroundColor: palette.panel }]}
                  onPress={() => {
                    setSelected(item);
                    setShowDetails(true);
                  }}
                >
                  <View style={styles.cardHeader}>
                    <Text style={[styles.period, { color: palette.text }]} numberOfLines={1}>
                      {formatDate(item.payroll.periodStart)} - {formatDate(item.payroll.periodEnd)}
                    </Text>
                    <Text style={[styles.amount, { color: palette.text }]}>{formatCurrency(item.netPay)}</Text>
                  </View>
                  <View style={styles.cardFooter}>
                    <Text style={[styles.date, { color: palette.muted }]} numberOfLines={1}>
                      Paid on {formatDate(item.payroll.payDate)}
                    </Text>
                    <View style={[styles.statusPill, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                      <View style={[styles.dot, { backgroundColor: statusColor }]} />
                      <Text style={[styles.statusText, { color: palette.text }]}>{status}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        </ScrollView>
      )}

      <Modal visible={showDetails} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
              <Text style={[styles.modalTitle, { color: palette.text }]}>Pay stub details</Text>
              <TouchableOpacity
                onPress={downloadPayStub}
                disabled={!selected || downloading}
                style={[
                  styles.modalClose,
                  { borderColor: palette.border, backgroundColor: palette.panelStrong, opacity: !selected || downloading ? 0.6 : 1 },
                ]}
              >
                {downloading ? (
                  <ActivityIndicator size="small" color={palette.text as any} />
                ) : (
                  <Ionicons name="download-outline" size={18} color={palette.text as any} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setShowDetails(false);
                  setSelected(null);
                }}
                style={[styles.modalClose, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
              >
                <Ionicons name="close" size={18} color={palette.text as any} />
              </TouchableOpacity>
            </View>

            {selected ? (
              <ScrollView contentContainerStyle={styles.modalBody}>
                <View style={[styles.detailRow, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                  <Text style={[styles.detailLabel, { color: palette.muted }]}>Period</Text>
                  <Text style={[styles.detailValue, { color: palette.text }]}>
                    {formatDate(selected.payroll.periodStart)} - {formatDate(selected.payroll.periodEnd)}
                  </Text>
                </View>
                <View style={[styles.detailRow, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                  <Text style={[styles.detailLabel, { color: palette.muted }]}>Pay date</Text>
                  <Text style={[styles.detailValue, { color: palette.text }]}>{formatDate(selected.payroll.payDate)}</Text>
                </View>

                <View style={styles.detailGrid}>
                  <View style={[styles.detailTile, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                    <Text style={[styles.tileLabel, { color: palette.muted }]}>Gross</Text>
                    <Text style={[styles.tileValue, { color: palette.text }]}>{formatCurrency(selected.grossPay)}</Text>
                  </View>
                  <View style={[styles.detailTile, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                    <Text style={[styles.tileLabel, { color: palette.muted }]}>Net</Text>
                    <Text style={[styles.tileValue, { color: palette.text }]}>{formatCurrency(selected.netPay)}</Text>
                  </View>
                  <View style={[styles.detailTile, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                    <Text style={[styles.tileLabel, { color: palette.muted }]}>Taxes</Text>
                    <Text style={[styles.tileValue, { color: palette.text }]}>{formatCurrency(getTaxesTotal(selected))}</Text>
                  </View>
                </View>

                <View style={styles.detailGrid}>
                  <View style={[styles.detailTile, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                    <Text style={[styles.tileLabel, { color: palette.muted }]}>Regular</Text>
                    <Text style={[styles.tileValue, { color: palette.text }]}>{Number(selected.regularHours ?? 0).toFixed(2)}h</Text>
                  </View>
                  <View style={[styles.detailTile, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                    <Text style={[styles.tileLabel, { color: palette.muted }]}>Overtime</Text>
                    <Text style={[styles.tileValue, { color: palette.text }]}>{Number(selected.overtimeHours ?? 0).toFixed(2)}h</Text>
                  </View>
                  <View style={[styles.detailTile, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                    <Text style={[styles.tileLabel, { color: palette.muted }]}>Deductions</Text>
                    <Text style={[styles.tileValue, { color: palette.text }]}>{formatCurrency(selected.deductions || 0)}</Text>
                  </View>
                </View>
              </ScrollView>
            ) : (
              <View style={styles.modalLoading}>
                <ActivityIndicator color={palette.cyan as any} />
              </View>
            )}
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
  center: {
    justifyContent: 'center',
    alignItems: 'center',
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
  content: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 18,
    gap: 14,
  },
  yearRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  yearPill: {
    height: 38,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  summaryCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
  },
  summaryTop: {
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
  summaryTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  summarySub: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  summaryTile: {
    flexGrow: 1,
    flexBasis: 110,
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
  },
  tileLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  tileValue: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  sectionHint: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  list: {
    gap: 12,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  period: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: -0.2,
    flex: 1,
  },
  amount: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  date: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
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
  modalBody: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 22,
    gap: 10,
  },
  modalLoading: {
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailRow: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '900',
  },
  detailGrid: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  detailTile: {
    flexGrow: 1,
    flexBasis: 110,
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
  },
});
