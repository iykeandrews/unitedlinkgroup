"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PayslipScreen;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const api_1 = __importDefault(require("../services/api"));
const vector_icons_1 = require("@expo/vector-icons");
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const FileSystem = __importStar(require("expo-file-system/legacy"));
const Sharing = __importStar(require("expo-sharing"));
const AuthContext_1 = require("../context/AuthContext");
function PayslipScreen() {
    var _a, _b;
    const { user, displayName, designation } = (0, AuthContext_1.useAuth)();
    const [payslips, setPayslips] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [refreshing, setRefreshing] = (0, react_1.useState)(false);
    const [selectedYear, setSelectedYear] = (0, react_1.useState)(new Date().getFullYear());
    const [selected, setSelected] = (0, react_1.useState)(null);
    const [showDetails, setShowDetails] = (0, react_1.useState)(false);
    const [downloading, setDownloading] = (0, react_1.useState)(false);
    const isEmployee = (0, react_1.useMemo)(() => String((user === null || user === void 0 ? void 0 : user.role) || '').toUpperCase() === 'EMPLOYEE', [user === null || user === void 0 ? void 0 : user.role]);
    const fetchPayslips = (0, react_1.useCallback)(async () => {
        try {
            const roleUpper = String((user === null || user === void 0 ? void 0 : user.role) || '').toUpperCase();
            if (roleUpper !== 'EMPLOYEE') {
                setPayslips([]);
                return;
            }
            const response = await api_1.default.get('/payroll/my-paystubs');
            const data = response.data || [];
            setPayslips(data);
        }
        catch (error) {
            console.error('Failed to fetch payslips', error);
        }
        finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user === null || user === void 0 ? void 0 : user.role]);
    const downloadPayStub = (0, react_1.useCallback)(async () => {
        var _a, _b, _c;
        if (!(selected === null || selected === void 0 ? void 0 : selected.id))
            return;
        if (downloading)
            return;
        try {
            setDownloading(true);
            const token = await async_storage_1.default.getItem('token');
            if (!token) {
                react_native_1.Alert.alert('Payslip', 'Please sign in again to download.');
                return;
            }
            const baseURL = String(api_1.default.defaults.baseURL || '').replace(/\/$/, '');
            if (!baseURL) {
                react_native_1.Alert.alert('Payslip', 'Unable to download: missing API URL.');
                return;
            }
            const url = `${baseURL}/payroll/paystubs/${selected.id}/download`;
            const payDate = ((_a = selected === null || selected === void 0 ? void 0 : selected.payroll) === null || _a === void 0 ? void 0 : _a.payDate) ? new Date(selected.payroll.payDate) : new Date();
            const datePart = Number.isFinite(payDate.getTime()) ? payDate.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
            const fileName = `paystub_${datePart}.pdf`;
            if (react_native_1.Platform.OS === 'web') {
                const res = await api_1.default.get(`/payroll/paystubs/${selected.id}/download`, { responseType: 'blob' });
                const w = typeof window !== 'undefined' ? window : null;
                const d = typeof document !== 'undefined' ? document : null;
                if (!w || !d) {
                    react_native_1.Alert.alert('Payslip', 'Unable to download in this environment.');
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
                react_native_1.Alert.alert('Payslip', 'Unable to download: storage is not available in this environment.');
                return;
            }
            const fileUri = `${directory}${fileName}`;
            const result = await FileSystem.downloadAsync(url, fileUri, { headers: { Authorization: `Bearer ${token}` } });
            const status = result === null || result === void 0 ? void 0 : result.status;
            if (typeof status === 'number' && status !== 200) {
                try {
                    const raw = await FileSystem.readAsStringAsync(result.uri);
                    const parsed = JSON.parse(raw);
                    const msg = (parsed === null || parsed === void 0 ? void 0 : parsed.message) ? String(parsed.message) : `Download failed (${status})`;
                    react_native_1.Alert.alert('Payslip', msg);
                }
                catch {
                    react_native_1.Alert.alert('Payslip', `Download failed (${status})`);
                }
                return;
            }
            const info = await FileSystem.getInfoAsync(result.uri);
            const fileSize = typeof (info === null || info === void 0 ? void 0 : info.size) === 'number' ? info.size : 0;
            if (!info.exists || fileSize <= 0) {
                react_native_1.Alert.alert('Payslip', 'Download failed: empty file.');
                return;
            }
            const canShare = await Sharing.isAvailableAsync();
            if (!canShare) {
                react_native_1.Alert.alert('Payslip', `Downloaded to:\n${result.uri}`);
                return;
            }
            await Sharing.shareAsync(result.uri, {
                mimeType: 'application/pdf',
                UTI: 'com.adobe.pdf',
            });
        }
        catch (e) {
            react_native_1.Alert.alert('Payslip', String(((_c = (_b = e === null || e === void 0 ? void 0 : e.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message) || (e === null || e === void 0 ? void 0 : e.message) || 'Unable to download paystub'));
        }
        finally {
            setDownloading(false);
        }
    }, [downloading, selected]);
    (0, react_1.useEffect)(() => {
        fetchPayslips();
    }, [fetchPayslips]);
    const onRefresh = () => {
        setRefreshing(true);
        fetchPayslips();
    };
    const palette = (0, react_1.useMemo)(() => ({
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
    }), []);
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount || 0);
    };
    const parseJson = (value) => {
        if (!value)
            return null;
        if (typeof value === 'object')
            return value;
        try {
            return JSON.parse(String(value));
        }
        catch {
            return null;
        }
    };
    const getTaxesTotal = (stub) => {
        const td = parseJson(stub === null || stub === void 0 ? void 0 : stub.taxDetails);
        if (td) {
            const v = Number(td.federalTax || 0) +
                Number(td.stateTax || 0) +
                Number(td.socialSecurity || 0) +
                Number(td.medicare || 0);
            return Number.isFinite(v) ? v : 0;
        }
        const v = Number((stub === null || stub === void 0 ? void 0 : stub.taxes) || 0);
        return Number.isFinite(v) ? v : 0;
    };
    const yearOptions = (0, react_1.useMemo)(() => {
        const years = Array.from(new Set((payslips || []).map((p) => { var _a, _b; return new Date(((_a = p === null || p === void 0 ? void 0 : p.payroll) === null || _a === void 0 ? void 0 : _a.payDate) || ((_b = p === null || p === void 0 ? void 0 : p.payroll) === null || _b === void 0 ? void 0 : _b.periodEnd) || Date.now()).getFullYear(); }))).sort((a, b) => b - a);
        return years.length ? years : [new Date().getFullYear()];
    }, [payslips]);
    (0, react_1.useEffect)(() => {
        if (!yearOptions.includes(selectedYear)) {
            setSelectedYear(yearOptions[0]);
        }
    }, [selectedYear, yearOptions]);
    const yearStubs = (0, react_1.useMemo)(() => {
        const list = (payslips || []).slice();
        return list.filter((p) => { var _a, _b; return new Date(((_a = p === null || p === void 0 ? void 0 : p.payroll) === null || _a === void 0 ? void 0 : _a.payDate) || ((_b = p === null || p === void 0 ? void 0 : p.payroll) === null || _b === void 0 ? void 0 : _b.periodEnd) || Date.now()).getFullYear() === selectedYear; });
    }, [payslips, selectedYear]);
    const ytd = (0, react_1.useMemo)(() => {
        const gross = yearStubs.reduce((sum, p) => sum + Number((p === null || p === void 0 ? void 0 : p.grossPay) || 0), 0);
        const net = yearStubs.reduce((sum, p) => sum + Number((p === null || p === void 0 ? void 0 : p.netPay) || 0), 0);
        const taxes = yearStubs.reduce((sum, p) => sum + getTaxesTotal(p), 0);
        return { gross, net, taxes };
    }, [yearStubs]);
    if (loading && !refreshing) {
        return (<react_native_1.View style={[styles.container, styles.center, { backgroundColor: palette.bg }]}>
        <react_native_1.ActivityIndicator size="large" color={palette.cyan}/>
      </react_native_1.View>);
    }
    return (<react_native_safe_area_context_1.SafeAreaView style={[styles.container, { backgroundColor: palette.bg }]}>
      <react_native_1.StatusBar barStyle="light-content"/>
      <react_native_1.View style={styles.bgGlowWrap} pointerEvents="none">
        <react_native_1.View style={[styles.bgGlow, { backgroundColor: palette.indigo, top: -160, left: -160, opacity: 0.22 }]}/>
        <react_native_1.View style={[styles.bgGlow, { backgroundColor: palette.cyan, bottom: -170, right: -170, opacity: 0.18 }]}/>
        <react_native_1.View style={[styles.bgGlow, { backgroundColor: palette.green, top: 240, right: -220, opacity: 0.10 }]}/>
      </react_native_1.View>

      <react_native_1.View style={styles.header}>
        <react_native_1.View style={{ flex: 1, minWidth: 0 }}>
          <react_native_1.Text style={[styles.headerTitle, { color: palette.text }]}>Payslips</react_native_1.Text>
          <react_native_1.Text style={[styles.headerSubtitle, { color: palette.muted }]}>Pay history • YTD totals</react_native_1.Text>
          <react_native_1.Text style={[styles.headerSubtitle, { color: palette.faint }]} numberOfLines={1}>
            {displayName}{designation ? ` • ${designation}` : ''}
          </react_native_1.Text>
        </react_native_1.View>
        <react_native_1.TouchableOpacity style={[styles.headerBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong, opacity: refreshing ? 0.7 : 1 }]} onPress={onRefresh} disabled={refreshing}>
          <vector_icons_1.Ionicons name="refresh" size={18} color={palette.text}/>
        </react_native_1.TouchableOpacity>
      </react_native_1.View>

      {!isEmployee ? (<react_native_1.View style={styles.emptyWrap}>
          <vector_icons_1.Ionicons name="lock-closed-outline" size={52} color={palette.faint}/>
          <react_native_1.Text style={[styles.emptyTitle, { color: palette.text }]}>Employee access only</react_native_1.Text>
          <react_native_1.Text style={[styles.emptyHint, { color: palette.muted }]}>Payslips are available for employee accounts on the mobile app.</react_native_1.Text>
        </react_native_1.View>) : (<react_native_1.ScrollView contentContainerStyle={styles.content} refreshControl={<react_native_1.RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.cyan}/>}>
        <react_native_1.View style={styles.yearRow}>
          {yearOptions.map((y) => {
                const active = y === selectedYear;
                return (<react_native_1.TouchableOpacity key={String(y)} style={[
                        styles.yearPill,
                        { borderColor: palette.border, backgroundColor: active ? palette.indigo : palette.panel },
                    ]} onPress={() => setSelectedYear(y)}>
                <react_native_1.Text style={[styles.yearText, { color: active ? '#ffffff' : palette.text }]}>{y}</react_native_1.Text>
              </react_native_1.TouchableOpacity>);
            })}
        </react_native_1.View>

        <react_native_1.View style={[styles.summaryCard, { backgroundColor: palette.panel, borderColor: palette.border }]}>
          <react_native_1.View style={styles.summaryTop}>
            <react_native_1.View style={[styles.iconWrap, { borderColor: palette.border, backgroundColor: 'rgba(34,211,238,0.16)' }]}>
              <vector_icons_1.Ionicons name="cash-outline" size={18} color={palette.cyan}/>
            </react_native_1.View>
            <react_native_1.View style={{ flex: 1, minWidth: 0 }}>
              <react_native_1.Text style={[styles.summaryTitle, { color: palette.text }]}>Year to date</react_native_1.Text>
              <react_native_1.Text style={[styles.summarySub, { color: palette.muted }]}>Gross • Net • Taxes</react_native_1.Text>
            </react_native_1.View>
          </react_native_1.View>

          <react_native_1.View style={styles.summaryGrid}>
            <react_native_1.View style={[styles.summaryTile, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
              <react_native_1.Text style={[styles.tileLabel, { color: palette.muted }]}>Gross</react_native_1.Text>
              <react_native_1.Text style={[styles.tileValue, { color: palette.text }]}>{formatCurrency(ytd.gross)}</react_native_1.Text>
            </react_native_1.View>
            <react_native_1.View style={[styles.summaryTile, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
              <react_native_1.Text style={[styles.tileLabel, { color: palette.muted }]}>Net</react_native_1.Text>
              <react_native_1.Text style={[styles.tileValue, { color: palette.text }]}>{formatCurrency(ytd.net)}</react_native_1.Text>
            </react_native_1.View>
            <react_native_1.View style={[styles.summaryTile, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
              <react_native_1.Text style={[styles.tileLabel, { color: palette.muted }]}>Taxes</react_native_1.Text>
              <react_native_1.Text style={[styles.tileValue, { color: palette.text }]}>{formatCurrency(ytd.taxes)}</react_native_1.Text>
            </react_native_1.View>
          </react_native_1.View>
        </react_native_1.View>

        <react_native_1.View style={styles.sectionHeader}>
          <react_native_1.Text style={[styles.sectionTitle, { color: palette.text }]}>Pay stubs</react_native_1.Text>
          <react_native_1.Text style={[styles.sectionHint, { color: palette.faint }]}>{yearStubs.length} items</react_native_1.Text>
        </react_native_1.View>

        {yearStubs.length === 0 ? (<react_native_1.View style={styles.emptyWrap}>
            <vector_icons_1.Ionicons name="document-text-outline" size={52} color={palette.faint}/>
            <react_native_1.Text style={[styles.emptyTitle, { color: palette.muted }]}>No payslips found</react_native_1.Text>
            <react_native_1.Text style={[styles.emptyHint, { color: palette.faint }]}>Try a different year or pull to refresh.</react_native_1.Text>
          </react_native_1.View>) : (<react_native_1.View style={styles.list}>
            {yearStubs.map((item) => {
                    var _a;
                    const status = String(((_a = item === null || item === void 0 ? void 0 : item.payroll) === null || _a === void 0 ? void 0 : _a.status) || '').toUpperCase() || 'PAID';
                    const statusColor = status === 'PAID' ? palette.green : palette.amber;
                    return (<react_native_1.TouchableOpacity key={item.id} style={[styles.card, { borderColor: palette.border, backgroundColor: palette.panel }]} onPress={() => {
                            setSelected(item);
                            setShowDetails(true);
                        }}>
                  <react_native_1.View style={styles.cardHeader}>
                    <react_native_1.Text style={[styles.period, { color: palette.text }]} numberOfLines={1}>
                      {formatDate(item.payroll.periodStart)} - {formatDate(item.payroll.periodEnd)}
                    </react_native_1.Text>
                    <react_native_1.Text style={[styles.amount, { color: palette.text }]}>{formatCurrency(item.netPay)}</react_native_1.Text>
                  </react_native_1.View>
                  <react_native_1.View style={styles.cardFooter}>
                    <react_native_1.Text style={[styles.date, { color: palette.muted }]} numberOfLines={1}>
                      Paid on {formatDate(item.payroll.payDate)}
                    </react_native_1.Text>
                    <react_native_1.View style={[styles.statusPill, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                      <react_native_1.View style={[styles.dot, { backgroundColor: statusColor }]}/>
                      <react_native_1.Text style={[styles.statusText, { color: palette.text }]}>{status}</react_native_1.Text>
                    </react_native_1.View>
                  </react_native_1.View>
                </react_native_1.TouchableOpacity>);
                })}
          </react_native_1.View>)}
        </react_native_1.ScrollView>)}

      <react_native_1.Modal visible={showDetails} animationType="slide" transparent>
        <react_native_1.View style={styles.modalOverlay}>
          <react_native_1.View style={[styles.modalContent, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <react_native_1.View style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
              <react_native_1.Text style={[styles.modalTitle, { color: palette.text }]}>Pay stub details</react_native_1.Text>
              <react_native_1.TouchableOpacity onPress={downloadPayStub} disabled={!selected || downloading} style={[
            styles.modalClose,
            { borderColor: palette.border, backgroundColor: palette.panelStrong, opacity: !selected || downloading ? 0.6 : 1 },
        ]}>
                {downloading ? (<react_native_1.ActivityIndicator size="small" color={palette.text}/>) : (<vector_icons_1.Ionicons name="download-outline" size={18} color={palette.text}/>)}
              </react_native_1.TouchableOpacity>
              <react_native_1.TouchableOpacity onPress={() => {
            setShowDetails(false);
            setSelected(null);
        }} style={[styles.modalClose, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                <vector_icons_1.Ionicons name="close" size={18} color={palette.text}/>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>

            {selected ? (<react_native_1.ScrollView contentContainerStyle={styles.modalBody}>
                <react_native_1.View style={[styles.detailRow, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                  <react_native_1.Text style={[styles.detailLabel, { color: palette.muted }]}>Period</react_native_1.Text>
                  <react_native_1.Text style={[styles.detailValue, { color: palette.text }]}>
                    {formatDate(selected.payroll.periodStart)} - {formatDate(selected.payroll.periodEnd)}
                  </react_native_1.Text>
                </react_native_1.View>
                <react_native_1.View style={[styles.detailRow, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                  <react_native_1.Text style={[styles.detailLabel, { color: palette.muted }]}>Pay date</react_native_1.Text>
                  <react_native_1.Text style={[styles.detailValue, { color: palette.text }]}>{formatDate(selected.payroll.payDate)}</react_native_1.Text>
                </react_native_1.View>

                <react_native_1.View style={styles.detailGrid}>
                  <react_native_1.View style={[styles.detailTile, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                    <react_native_1.Text style={[styles.tileLabel, { color: palette.muted }]}>Gross</react_native_1.Text>
                    <react_native_1.Text style={[styles.tileValue, { color: palette.text }]}>{formatCurrency(selected.grossPay)}</react_native_1.Text>
                  </react_native_1.View>
                  <react_native_1.View style={[styles.detailTile, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                    <react_native_1.Text style={[styles.tileLabel, { color: palette.muted }]}>Net</react_native_1.Text>
                    <react_native_1.Text style={[styles.tileValue, { color: palette.text }]}>{formatCurrency(selected.netPay)}</react_native_1.Text>
                  </react_native_1.View>
                  <react_native_1.View style={[styles.detailTile, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                    <react_native_1.Text style={[styles.tileLabel, { color: palette.muted }]}>Taxes</react_native_1.Text>
                    <react_native_1.Text style={[styles.tileValue, { color: palette.text }]}>{formatCurrency(getTaxesTotal(selected))}</react_native_1.Text>
                  </react_native_1.View>
                </react_native_1.View>

                <react_native_1.View style={styles.detailGrid}>
                  <react_native_1.View style={[styles.detailTile, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                    <react_native_1.Text style={[styles.tileLabel, { color: palette.muted }]}>Regular</react_native_1.Text>
                    <react_native_1.Text style={[styles.tileValue, { color: palette.text }]}>{Number((_a = selected.regularHours) !== null && _a !== void 0 ? _a : 0).toFixed(2)}h</react_native_1.Text>
                  </react_native_1.View>
                  <react_native_1.View style={[styles.detailTile, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                    <react_native_1.Text style={[styles.tileLabel, { color: palette.muted }]}>Overtime</react_native_1.Text>
                    <react_native_1.Text style={[styles.tileValue, { color: palette.text }]}>{Number((_b = selected.overtimeHours) !== null && _b !== void 0 ? _b : 0).toFixed(2)}h</react_native_1.Text>
                  </react_native_1.View>
                  <react_native_1.View style={[styles.detailTile, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                    <react_native_1.Text style={[styles.tileLabel, { color: palette.muted }]}>Deductions</react_native_1.Text>
                    <react_native_1.Text style={[styles.tileValue, { color: palette.text }]}>{formatCurrency(selected.deductions || 0)}</react_native_1.Text>
                  </react_native_1.View>
                </react_native_1.View>
              </react_native_1.ScrollView>) : (<react_native_1.View style={styles.modalLoading}>
                <react_native_1.ActivityIndicator color={palette.cyan}/>
              </react_native_1.View>)}
          </react_native_1.View>
        </react_native_1.View>
      </react_native_1.Modal>
    </react_native_safe_area_context_1.SafeAreaView>);
}
const styles = react_native_1.StyleSheet.create({
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
