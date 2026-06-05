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
exports.default = LeaveScreen;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const AuthContext_1 = require("../context/AuthContext");
const api_1 = __importDefault(require("../services/api"));
const vector_icons_1 = require("@expo/vector-icons");
const datetimepicker_1 = __importDefault(require("@react-native-community/datetimepicker"));
function LeaveScreen() {
    var _a;
    const { user, displayName, designation } = (0, AuthContext_1.useAuth)();
    const [activeTab, setActiveTab] = (0, react_1.useState)('request');
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [refreshing, setRefreshing] = (0, react_1.useState)(false);
    const [historyFilter, setHistoryFilter] = (0, react_1.useState)('ALL');
    // Data
    const [requests, setRequests] = (0, react_1.useState)([]);
    const [balances, setBalances] = (0, react_1.useState)([]);
    const [leaveTypes, setLeaveTypes] = (0, react_1.useState)([]);
    // Form State
    const [selectedTypeId, setSelectedTypeId] = (0, react_1.useState)('');
    const [startDate, setStartDate] = (0, react_1.useState)('');
    const [endDate, setEndDate] = (0, react_1.useState)('');
    const [reason, setReason] = (0, react_1.useState)('');
    const [showTypeModal, setShowTypeModal] = (0, react_1.useState)(false);
    const [submitting, setSubmitting] = (0, react_1.useState)(false);
    const [estimatedHours, setEstimatedHours] = (0, react_1.useState)(null);
    const [estimating, setEstimating] = (0, react_1.useState)(false);
    const [datePickerKind, setDatePickerKind] = (0, react_1.useState)(null);
    const [datePickerValue, setDatePickerValue] = (0, react_1.useState)(new Date());
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
    const roleUpper = (0, react_1.useMemo)(() => String((user === null || user === void 0 ? void 0 : user.role) || '').toUpperCase(), [user === null || user === void 0 ? void 0 : user.role]);
    const isEmployee = roleUpper === 'EMPLOYEE';
    const fetchData = (0, react_1.useCallback)(async () => {
        try {
            if (!isEmployee) {
                setRequests([]);
                setBalances([]);
                setLeaveTypes([]);
                return;
            }
            const [requestsRes, balancesRes] = await Promise.all([
                api_1.default.get('/leave/my-requests'),
                api_1.default.get('/leave/my-balances')
            ]);
            setRequests(requestsRes.data || []);
            setBalances(balancesRes.data || []);
            const typesFromBalances = (balancesRes.data || [])
                .map((b) => b.leaveType)
                .filter(Boolean)
                .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i);
            setLeaveTypes(typesFromBalances);
        }
        catch (error) {
            console.error('Failed to fetch leave data', error);
            react_native_1.Alert.alert('Error', 'Failed to load leave data');
        }
        finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [isEmployee, user]);
    (0, react_1.useEffect)(() => {
        fetchData();
    }, [fetchData]);
    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };
    const selectedType = (0, react_1.useMemo)(() => leaveTypes.find((t) => t.id === selectedTypeId) || null, [leaveTypes, selectedTypeId]);
    const selectedBalance = (0, react_1.useMemo)(() => balances.find((b) => { var _a; return ((_a = b.leaveType) === null || _a === void 0 ? void 0 : _a.id) === selectedTypeId; }) || null, [balances, selectedTypeId]);
    const toLocalISODate = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };
    const parseISODate = (s) => {
        if (!s)
            return null;
        const d = new Date(`${s}T00:00:00`);
        if (!Number.isFinite(d.getTime()))
            return null;
        return d;
    };
    const applyPickedDate = (kind, d) => {
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
    const openDatePicker = (kind) => {
        const current = kind === 'start' ? parseISODate(startDate) : parseISODate(endDate);
        setDatePickerValue(current || new Date());
        setDatePickerKind(kind);
    };
    const estimate = async (opts) => {
        var _a, _b, _c;
        if (!selectedTypeId || !startDate || !endDate) {
            if (!(opts === null || opts === void 0 ? void 0 : opts.silent))
                react_native_1.Alert.alert('Estimate', 'Select leave type and dates first.');
            return null;
        }
        if (!(user === null || user === void 0 ? void 0 : user.employeeId)) {
            if (!(opts === null || opts === void 0 ? void 0 : opts.silent))
                react_native_1.Alert.alert('Estimate', 'Employee ID missing on your profile. Contact admin.');
            return null;
        }
        try {
            setEstimating(true);
            const res = await api_1.default.get('/leave/calculate-hours', {
                params: {
                    employeeId: user.employeeId,
                    startDate,
                    endDate,
                    isAllDay: true,
                },
            });
            const h = Number((_a = res.data) === null || _a === void 0 ? void 0 : _a.totalHours);
            const next = Number.isFinite(h) ? h : null;
            setEstimatedHours(next);
            return next;
        }
        catch (e) {
            setEstimatedHours(null);
            if (!(opts === null || opts === void 0 ? void 0 : opts.silent))
                react_native_1.Alert.alert('Estimate', ((_c = (_b = e === null || e === void 0 ? void 0 : e.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message) || 'Unable to calculate leave hours');
            return null;
        }
        finally {
            setEstimating(false);
        }
    };
    (0, react_1.useEffect)(() => {
        if (activeTab !== 'request')
            return;
        if (!selectedTypeId || !startDate || !endDate)
            return;
        const id = setTimeout(() => {
            estimate({ silent: true });
        }, 450);
        return () => clearTimeout(id);
    }, [activeTab, endDate, selectedTypeId, startDate]);
    const handleSubmit = async () => {
        var _a, _b, _c;
        if (!selectedTypeId || !startDate || !endDate) {
            react_native_1.Alert.alert('Error', 'Please fill in all required fields');
            return;
        }
        if (!(user === null || user === void 0 ? void 0 : user.employeeId)) {
            react_native_1.Alert.alert('Error', 'User profile not fully linked (missing employee ID). Contact admin.');
            return;
        }
        try {
            const hours = await estimate({ silent: true });
            const requested = hours !== null && hours !== void 0 ? hours : estimatedHours;
            if (requested === null) {
                react_native_1.Alert.alert('Error', 'Unable to calculate requested leave hours. Check dates and try again.');
                return;
            }
            const bal = balances.find((b) => { var _a; return ((_a = b.leaveType) === null || _a === void 0 ? void 0 : _a.id) === selectedTypeId; });
            const available = bal ? Number((_a = bal.balanceHours) !== null && _a !== void 0 ? _a : 0) : null;
            if (available === null || !Number.isFinite(available)) {
                react_native_1.Alert.alert('Error', 'This leave type is not available for your profile.');
                return;
            }
            if (requested > available) {
                react_native_1.Alert.alert('Error', `Insufficient leave balance. You have ${available.toFixed(1)} hours.`);
                return;
            }
            setSubmitting(true);
            await api_1.default.post('/leave/request', {
                employeeId: user.employeeId,
                leaveTypeId: selectedTypeId,
                startDate,
                endDate,
                reason,
                isAllDay: true // Default to all day for now
            });
            react_native_1.Alert.alert('Success', 'Leave request submitted!');
            setStartDate('');
            setEndDate('');
            setReason('');
            setSelectedTypeId('');
            setEstimatedHours(null);
            setActiveTab('history');
            fetchData();
        }
        catch (error) {
            const msg = ((_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message) || 'Failed to submit request';
            react_native_1.Alert.alert('Error', msg);
        }
        finally {
            setSubmitting(false);
        }
    };
    const statusMeta = (status) => {
        const s = String(status || '').toUpperCase();
        if (s === 'APPROVED')
            return { label: 'APPROVED', color: palette.green };
        if (s === 'REJECTED')
            return { label: 'REJECTED', color: palette.red };
        return { label: s || 'PENDING', color: palette.amber };
    };
    const filteredRequests = (0, react_1.useMemo)(() => {
        const list = (requests || []).slice();
        if (historyFilter === 'ALL')
            return list;
        return list.filter((r) => String(r.status || '').toUpperCase() === historyFilter);
    }, [historyFilter, requests]);
    const est = estimatedHours !== null && estimatedHours !== void 0 ? estimatedHours : null;
    const balanceHours = selectedBalance ? Number((_a = selectedBalance.balanceHours) !== null && _a !== void 0 ? _a : 0) : null;
    const isOverBalance = est !== null && balanceHours !== null && Number.isFinite(balanceHours) && est > balanceHours;
    const canSubmit = !!selectedTypeId && !!startDate && !!endDate && !submitting && !isOverBalance;
    return (<react_native_safe_area_context_1.SafeAreaView style={[styles.container, { backgroundColor: palette.bg }]}>
      <react_native_1.StatusBar barStyle="light-content"/>
      <react_native_1.View style={styles.bgGlowWrap} pointerEvents="none">
        <react_native_1.View style={[styles.bgGlow, { backgroundColor: palette.indigo, top: -160, left: -160, opacity: 0.22 }]}/>
        <react_native_1.View style={[styles.bgGlow, { backgroundColor: palette.cyan, bottom: -170, right: -170, opacity: 0.18 }]}/>
        <react_native_1.View style={[styles.bgGlow, { backgroundColor: palette.green, top: 240, right: -220, opacity: 0.10 }]}/>
      </react_native_1.View>

      <react_native_1.View style={styles.header}>
        <react_native_1.View style={{ flex: 1, minWidth: 0 }}>
          <react_native_1.Text style={[styles.headerTitle, { color: palette.text }]}>Leave</react_native_1.Text>
          <react_native_1.Text style={[styles.headerSubtitle, { color: palette.muted }]}>Requests • balances • history</react_native_1.Text>
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
          <react_native_1.Text style={[styles.emptyHint, { color: palette.muted }]}>Leave is available for employee accounts on the mobile app.</react_native_1.Text>
        </react_native_1.View>) : (<>
          <react_native_1.View style={styles.tabs}>
            {['request', 'history'].map((k) => {
                const active = activeTab === k;
                return (<react_native_1.TouchableOpacity key={k} style={[
                        styles.tabPill,
                        {
                            borderColor: palette.border,
                            backgroundColor: active ? palette.indigo : palette.panel,
                        },
                    ]} onPress={() => setActiveTab(k)}>
                  <react_native_1.Text style={[styles.tabText, { color: active ? '#ffffff' : palette.text }]}>{k === 'request' ? 'Request' : 'History'}</react_native_1.Text>
                </react_native_1.TouchableOpacity>);
            })}
          </react_native_1.View>

          {loading && !refreshing ? (<react_native_1.View style={styles.center}>
              <react_native_1.ActivityIndicator size="large" color={palette.cyan}/>
            </react_native_1.View>) : (<react_native_1.ScrollView contentContainerStyle={styles.content} refreshControl={<react_native_1.RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.cyan}/>}>
              {activeTab === 'request' ? (<>
              <react_native_1.View style={[styles.card, { backgroundColor: palette.panel, borderColor: palette.border }]}>
                <react_native_1.View style={styles.cardHeader}>
                  <react_native_1.View style={[styles.iconWrap, { borderColor: palette.border, backgroundColor: 'rgba(34,211,238,0.16)' }]}>
                    <vector_icons_1.Ionicons name="wallet-outline" size={18} color={palette.cyan}/>
                  </react_native_1.View>
                  <react_native_1.View style={{ flex: 1, minWidth: 0 }}>
                    <react_native_1.Text style={[styles.cardTitle, { color: palette.text }]}>Balances</react_native_1.Text>
                    <react_native_1.Text style={[styles.cardDesc, { color: palette.muted }]}>Available hours by leave type.</react_native_1.Text>
                  </react_native_1.View>
                </react_native_1.View>

                <react_native_1.ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.balanceRow}>
                  {balances.map((b) => {
                        var _a, _b;
                        return (<react_native_1.View key={b.id} style={[styles.balanceCard, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                      <react_native_1.Text style={[styles.balanceLabel, { color: palette.muted }]} numberOfLines={1}>
                        {((_a = b.leaveType) === null || _a === void 0 ? void 0 : _a.name) || 'Leave'}
                      </react_native_1.Text>
                      <react_native_1.Text style={[styles.balanceValue, { color: palette.text }]}>{Number((_b = b.balanceHours) !== null && _b !== void 0 ? _b : 0).toFixed(1)}h</react_native_1.Text>
                    </react_native_1.View>);
                    })}
                  {balances.length === 0 ? (<react_native_1.View style={[styles.balanceCard, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                      <react_native_1.Text style={[styles.balanceLabel, { color: palette.muted }]}>No balances</react_native_1.Text>
                      <react_native_1.Text style={[styles.balanceValue, { color: palette.text }]}>—</react_native_1.Text>
                    </react_native_1.View>) : null}
                </react_native_1.ScrollView>
              </react_native_1.View>

              <react_native_1.View style={[styles.card, { backgroundColor: palette.panel, borderColor: palette.border }]}>
                <react_native_1.View style={styles.cardHeader}>
                  <react_native_1.View style={[styles.iconWrap, { borderColor: palette.border, backgroundColor: 'rgba(79,70,229,0.16)' }]}>
                    <vector_icons_1.Ionicons name="add-circle-outline" size={18} color={palette.indigo}/>
                  </react_native_1.View>
                  <react_native_1.View style={{ flex: 1, minWidth: 0 }}>
                    <react_native_1.Text style={[styles.cardTitle, { color: palette.text }]}>New request</react_native_1.Text>
                    <react_native_1.Text style={[styles.cardDesc, { color: palette.muted }]}>All-day leave (YYYY-MM-DD).</react_native_1.Text>
                  </react_native_1.View>
                </react_native_1.View>

                <react_native_1.TouchableOpacity style={[styles.selectRow, { borderColor: palette.border, backgroundColor: palette.panelStrong }]} onPress={() => setShowTypeModal(true)}>
                  <vector_icons_1.Ionicons name="briefcase-outline" size={18} color={palette.muted}/>
                  <react_native_1.Text style={[styles.selectText, { color: selectedType ? palette.text : palette.faint }]} numberOfLines={1}>
                    {selectedType ? selectedType.name : 'Select leave type'}
                  </react_native_1.Text>
                  <vector_icons_1.Ionicons name="chevron-down" size={18} color={palette.faint}/>
                </react_native_1.TouchableOpacity>

                <react_native_1.View style={styles.twoCol}>
                  <react_native_1.TouchableOpacity style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]} onPress={() => openDatePicker('start')} disabled={submitting} activeOpacity={0.85}>
                    <vector_icons_1.Ionicons name="calendar-outline" size={18} color={palette.muted}/>
                    <react_native_1.Text style={[styles.input, { color: startDate ? palette.text : palette.faint }]} numberOfLines={1}>
                      {startDate || 'Start date'}
                    </react_native_1.Text>
                    <vector_icons_1.Ionicons name="chevron-down" size={18} color={palette.faint}/>
                  </react_native_1.TouchableOpacity>

                  <react_native_1.TouchableOpacity style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]} onPress={() => openDatePicker('end')} disabled={submitting} activeOpacity={0.85}>
                    <vector_icons_1.Ionicons name="calendar-clear-outline" size={18} color={palette.muted}/>
                    <react_native_1.Text style={[styles.input, { color: endDate ? palette.text : palette.faint }]} numberOfLines={1}>
                      {endDate || 'End date'}
                    </react_native_1.Text>
                    <vector_icons_1.Ionicons name="chevron-down" size={18} color={palette.faint}/>
                  </react_native_1.TouchableOpacity>
                </react_native_1.View>

                <react_native_1.View style={[styles.fieldTall, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                  <vector_icons_1.Ionicons name="chatbox-ellipses-outline" size={18} color={palette.muted}/>
                  <react_native_1.TextInput style={[styles.input, { color: palette.text, height: 84 }]} placeholder="Reason (optional)" placeholderTextColor={palette.faint} multiline value={reason} onChangeText={setReason}/>
                </react_native_1.View>

                <react_native_1.View style={styles.actionsRow}>
                  <react_native_1.TouchableOpacity style={[
                        styles.secondaryBtn,
                        { borderColor: palette.border, backgroundColor: palette.panelStrong, opacity: estimating ? 0.75 : 1 },
                    ]} onPress={() => estimate()} disabled={estimating}>
                    {estimating ? (<react_native_1.ActivityIndicator color={palette.text}/>) : (<>
                        <vector_icons_1.Ionicons name="calculator-outline" size={16} color={palette.text}/>
                        <react_native_1.Text style={[styles.secondaryBtnText, { color: palette.text }]}>Estimate</react_native_1.Text>
                      </>)}
                  </react_native_1.TouchableOpacity>

                  <react_native_1.TouchableOpacity style={[
                        styles.primaryBtn,
                        {
                            backgroundColor: palette.indigo,
                            opacity: canSubmit ? 1 : 0.6,
                        },
                    ]} onPress={handleSubmit} disabled={!canSubmit}>
                    {submitting ? <react_native_1.ActivityIndicator color="#ffffff"/> : <react_native_1.Text style={styles.primaryBtnText}>Submit</react_native_1.Text>}
                  </react_native_1.TouchableOpacity>
                </react_native_1.View>

                {est !== null ? (<react_native_1.View style={[
                            styles.notice,
                            {
                                borderColor: palette.border,
                                backgroundColor: isOverBalance ? 'rgba(251,113,133,0.12)' : 'rgba(34,211,238,0.12)',
                            },
                        ]}>
                    <vector_icons_1.Ionicons name={isOverBalance ? 'warning-outline' : 'information-circle-outline'} size={16} color={(isOverBalance ? palette.red : palette.cyan)}/>
                    <react_native_1.Text style={[styles.noticeText, { color: palette.muted }]}>
                      Estimated: {est.toFixed(1)}h
                      {balanceHours !== null ? ` • Balance: ${Number(balanceHours).toFixed(1)}h` : ''}
                      {isOverBalance ? ' • Exceeds balance' : ''}
                    </react_native_1.Text>
                  </react_native_1.View>) : null}
              </react_native_1.View>
            </>) : (<>
              <react_native_1.View style={styles.filters}>
                {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((k) => {
                        const active = historyFilter === k;
                        return (<react_native_1.TouchableOpacity key={k} style={[
                                styles.filterPill,
                                { borderColor: palette.border, backgroundColor: active ? palette.indigo : palette.panel },
                            ]} onPress={() => setHistoryFilter(k)}>
                      <react_native_1.Text style={[styles.filterText, { color: active ? '#ffffff' : palette.text }]}>{k}</react_native_1.Text>
                    </react_native_1.TouchableOpacity>);
                    })}
              </react_native_1.View>

              {filteredRequests.length === 0 ? (<react_native_1.View style={styles.emptyWrap}>
                  <vector_icons_1.Ionicons name="calendar-outline" size={52} color={palette.faint}/>
                  <react_native_1.Text style={[styles.emptyTitle, { color: palette.muted }]}>No requests found</react_native_1.Text>
                  <react_native_1.Text style={[styles.emptyHint, { color: palette.faint }]}>Submit a new request or change the filter.</react_native_1.Text>
                </react_native_1.View>) : (<react_native_1.View style={styles.historyList}>
                  {filteredRequests.map((item) => {
                            var _a;
                            const meta = statusMeta(item.status);
                            return (<react_native_1.View key={item.id} style={[styles.historyItem, { borderColor: palette.border, backgroundColor: palette.panel }]}>
                        <react_native_1.View style={{ flex: 1, minWidth: 0 }}>
                          <react_native_1.Text style={[styles.historyType, { color: palette.text }]} numberOfLines={1}>
                            {((_a = item.leaveType) === null || _a === void 0 ? void 0 : _a.name) || 'Leave'}
                          </react_native_1.Text>
                          <react_native_1.Text style={[styles.historyDate, { color: palette.muted }]} numberOfLines={1}>
                            {new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}
                          </react_native_1.Text>
                          {item.reason ? (<react_native_1.Text style={[styles.historyReason, { color: palette.faint }]} numberOfLines={1}>
                              {item.reason}
                            </react_native_1.Text>) : null}
                        </react_native_1.View>
                        <react_native_1.View style={[styles.statusPill, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                          <react_native_1.View style={[styles.dot, { backgroundColor: meta.color }]}/>
                          <react_native_1.Text style={[styles.statusText, { color: palette.text }]}>{meta.label}</react_native_1.Text>
                        </react_native_1.View>
                      </react_native_1.View>);
                        })}
                </react_native_1.View>)}
            </>)}
            </react_native_1.ScrollView>)}
        </>)}

      {/* Type Selection Modal */}
      <react_native_1.Modal visible={showTypeModal} animationType="slide" transparent>
        <react_native_1.View style={styles.modalOverlay}>
          <react_native_1.View style={[styles.modalContent, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <react_native_1.View style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
              <react_native_1.Text style={[styles.modalTitle, { color: palette.text }]}>Select leave type</react_native_1.Text>
              <react_native_1.TouchableOpacity onPress={() => setShowTypeModal(false)} style={[styles.modalClose, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                <vector_icons_1.Ionicons name="close" size={18} color={palette.text}/>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>
            <react_native_1.FlatList data={leaveTypes} keyExtractor={(item) => item.id} renderItem={({ item }) => (<react_native_1.TouchableOpacity style={[styles.modalItem, { borderBottomColor: palette.border }]} onPress={() => {
                setSelectedTypeId(item.id);
                setShowTypeModal(false);
                setEstimatedHours(null);
            }}>
                  <react_native_1.Text style={[styles.modalItemText, { color: palette.text }]}>{item.name}</react_native_1.Text>
                  {selectedTypeId === item.id ? <vector_icons_1.Ionicons name="checkmark" size={18} color={palette.cyan}/> : null}
                </react_native_1.TouchableOpacity>)} ListEmptyComponent={<react_native_1.View style={styles.modalEmpty}>
                  <react_native_1.Text style={[styles.modalEmptyText, { color: palette.muted }]}>No leave types available</react_native_1.Text>
                </react_native_1.View>}/>
          </react_native_1.View>
        </react_native_1.View>
      </react_native_1.Modal>

      <react_native_1.Modal visible={datePickerKind !== null} animationType="slide" transparent>
        <react_native_1.View style={styles.modalOverlay}>
          <react_native_1.View style={[styles.modalContent, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <react_native_1.View style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
              <react_native_1.Text style={[styles.modalTitle, { color: palette.text }]}>
                {datePickerKind === 'start' ? 'Select start date' : 'Select end date'}
              </react_native_1.Text>
              <react_native_1.TouchableOpacity onPress={() => setDatePickerKind(null)} style={[styles.modalClose, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                <vector_icons_1.Ionicons name="close" size={18} color={palette.text}/>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>

            <react_native_1.View style={{ paddingHorizontal: 18, paddingVertical: 14 }}>
              <datetimepicker_1.default value={datePickerValue} mode="date" display={react_native_1.Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(event, selectedDate) => {
            if (react_native_1.Platform.OS === 'android') {
                if ((event === null || event === void 0 ? void 0 : event.type) === 'dismissed') {
                    setDatePickerKind(null);
                    return;
                }
                if ((event === null || event === void 0 ? void 0 : event.type) === 'set' && selectedDate && datePickerKind) {
                    applyPickedDate(datePickerKind, selectedDate);
                    setDatePickerKind(null);
                }
                return;
            }
            if (selectedDate)
                setDatePickerValue(selectedDate);
        }}/>

              {react_native_1.Platform.OS === 'ios' ? (<react_native_1.View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  <react_native_1.TouchableOpacity style={[styles.secondaryBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong }]} onPress={() => setDatePickerKind(null)}>
                    <react_native_1.Text style={[styles.secondaryBtnText, { color: palette.text }]}>Cancel</react_native_1.Text>
                  </react_native_1.TouchableOpacity>
                  <react_native_1.TouchableOpacity style={[styles.primaryBtn, { backgroundColor: palette.indigo }]} onPress={() => {
                if (datePickerKind)
                    applyPickedDate(datePickerKind, datePickerValue);
                setDatePickerKind(null);
            }}>
                    <react_native_1.Text style={styles.primaryBtnText}>Done</react_native_1.Text>
                  </react_native_1.TouchableOpacity>
                </react_native_1.View>) : null}
            </react_native_1.View>
          </react_native_1.View>
        </react_native_1.View>
      </react_native_1.Modal>
    </react_native_safe_area_context_1.SafeAreaView>);
}
const styles = react_native_1.StyleSheet.create({
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
