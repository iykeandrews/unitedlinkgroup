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
exports.default = SchedulingScreen;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const api_1 = __importDefault(require("../services/api"));
const native_1 = require("@react-navigation/native");
const vector_icons_1 = require("@expo/vector-icons");
const AuthContext_1 = require("../context/AuthContext");
const DocumentPicker = __importStar(require("expo-document-picker"));
const NavigationService_1 = require("../navigation/NavigationService");
function SchedulingScreen() {
    var _a, _b, _c;
    const { user, displayName, designation } = (0, AuthContext_1.useAuth)();
    const [shifts, setShifts] = (0, react_1.useState)([]);
    const [summary, setSummary] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [filter, setFilter] = (0, react_1.useState)('ALL');
    const [calloutShiftId, setCalloutShiftId] = (0, react_1.useState)(null);
    const [calloutReasonCode, setCalloutReasonCode] = (0, react_1.useState)('SICK');
    const [calloutReasonNote, setCalloutReasonNote] = (0, react_1.useState)('');
    const [calloutSubmittingId, setCalloutSubmittingId] = (0, react_1.useState)(null);
    const [calloutAttachment, setCalloutAttachment] = (0, react_1.useState)(null);
    const [calloutUploading, setCalloutUploading] = (0, react_1.useState)(false);
    const roleUpper = (0, react_1.useMemo)(() => String((user === null || user === void 0 ? void 0 : user.employeeRole) || (user === null || user === void 0 ? void 0 : user.role) || '').toUpperCase(), [user === null || user === void 0 ? void 0 : user.employeeRole, user === null || user === void 0 ? void 0 : user.role]);
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
            const res = await api_1.default.get('/scheduling/my', {
                params: {
                    start: start.toISOString(),
                    end: end.toISOString()
                }
            });
            setShifts(res.data.shifts || []);
            setSummary(res.data.summary || null);
        }
        catch (e) {
            console.log('Error fetching shifts', e);
        }
        finally {
            setLoading(false);
        }
    };
    (0, native_1.useFocusEffect)((0, react_1.useCallback)(() => {
        fetchShifts();
    }, []));
    const formatTime = (dateStr) => {
        return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
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
    const openMaps = async (address) => {
        const q = encodeURIComponent(address);
        const url = react_native_1.Platform.select({
            ios: `http://maps.apple.com/?q=${q}`,
            android: `geo:0,0?q=${q}`,
            default: `https://www.google.com/maps/search/?api=1&query=${q}`,
        });
        try {
            await react_native_1.Linking.openURL(url);
        }
        catch { }
    };
    const filteredShifts = (0, react_1.useMemo)(() => {
        const now = Date.now();
        const list = (shifts || []).slice();
        if (filter === 'UPCOMING') {
            return list.filter((s) => {
                var _a, _b;
                const endMs = new Date((_b = (_a = s.endTime) !== null && _a !== void 0 ? _a : s.startTime) !== null && _b !== void 0 ? _b : 0).getTime();
                if (!Number.isFinite(endMs))
                    return true;
                return endMs >= now;
            });
        }
        if (filter === 'PAST') {
            return list.filter((s) => {
                var _a, _b;
                const endMs = new Date((_b = (_a = s.endTime) !== null && _a !== void 0 ? _a : s.startTime) !== null && _b !== void 0 ? _b : 0).getTime();
                if (!Number.isFinite(endMs))
                    return false;
                return endMs < now;
            });
        }
        return list;
    }, [filter, shifts]);
    const handleSubmitCallout = async (shiftId) => {
        var _a, _b, _c;
        try {
            setCalloutSubmittingId(shiftId);
            let documentationUrl;
            if (calloutAttachment) {
                const form = new FormData();
                form.append('file', { uri: calloutAttachment.uri, name: calloutAttachment.name, type: calloutAttachment.mimeType });
                const endpoint = calloutAttachment.mimeType.startsWith('image/') ? '/uploads/images' : '/uploads';
                const upload = await api_1.default.post(endpoint, form, { headers: { 'Content-Type': 'multipart/form-data' } });
                documentationUrl = String(((_a = upload.data) === null || _a === void 0 ? void 0 : _a.url) || '') || undefined;
            }
            await api_1.default.post(`/scheduling/shifts/${shiftId}/callout`, {
                reasonCode: calloutReasonCode,
                reasonNote: calloutReasonNote.trim() || undefined,
                type: 'EXCUSED',
                noticeAt: new Date().toISOString(),
                documentationUrl,
            });
            react_native_1.Alert.alert('Submitted', 'Your call-out has been submitted for approval.');
            setCalloutShiftId(null);
            setCalloutReasonCode('SICK');
            setCalloutReasonNote('');
            setCalloutAttachment(null);
            fetchShifts();
        }
        catch (e) {
            const apiMessage = (_c = (_b = e === null || e === void 0 ? void 0 : e.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message;
            const msg = typeof apiMessage === 'string' ? apiMessage : 'Failed to submit call-out';
            react_native_1.Alert.alert('Call-out failed', msg);
        }
        finally {
            setCalloutSubmittingId(null);
        }
    };
    const closeCalloutModal = () => {
        if (calloutSubmittingId)
            return;
        setCalloutShiftId(null);
        setCalloutReasonCode('SICK');
        setCalloutReasonNote('');
        setCalloutAttachment(null);
    };
    const pickCalloutDocument = async () => {
        var _a;
        try {
            setCalloutUploading(true);
            const result = await DocumentPicker.getDocumentAsync({
                type: ['image/*', 'application/pdf'],
                copyToCacheDirectory: true,
                multiple: false,
            });
            if (result.canceled)
                return;
            const asset = (_a = result.assets) === null || _a === void 0 ? void 0 : _a[0];
            if (!(asset === null || asset === void 0 ? void 0 : asset.uri))
                return;
            setCalloutAttachment({
                uri: asset.uri,
                name: String(asset.name || `callout-${Date.now()}`),
                mimeType: String(asset.mimeType || 'application/octet-stream'),
            });
        }
        catch (e) {
            react_native_1.Alert.alert('Attachment', String((e === null || e === void 0 ? void 0 : e.message) || 'Unable to pick document'));
        }
        finally {
            setCalloutUploading(false);
        }
    };
    const renderItem = ({ item }) => {
        var _a, _b, _c, _d, _e;
        const start = new Date(item.startTime);
        const end = new Date((_a = item.endTime) !== null && _a !== void 0 ? _a : item.startTime);
        const address = String(((_b = item.location) === null || _b === void 0 ? void 0 : _b.address) || '').trim();
        const locationName = String(((_c = item.location) === null || _c === void 0 ? void 0 : _c.name) || 'No Location').trim();
        const fullLocation = address ? `${locationName} • ${address}` : locationName;
        const isToday = start.toDateString() === new Date().toDateString();
        const isActive = start.getTime() <= Date.now() && end.getTime() >= Date.now();
        const canCallOut = end.getTime() >= Date.now();
        const hasPendingCallout = !!(item === null || item === void 0 ? void 0 : item.callout) && !((_d = item === null || item === void 0 ? void 0 : item.callout) === null || _d === void 0 ? void 0 : _d.resolvedAt) && String((item === null || item === void 0 ? void 0 : item.status) || '').toUpperCase() !== 'OPEN';
        const accent = isActive ? palette.green : isToday ? palette.cyan : palette.indigo;
        return (<react_native_1.View style={[styles.shiftCard, { backgroundColor: palette.panel, borderColor: palette.border }]}>
        <react_native_1.View style={[styles.cardLeft, { borderRightColor: palette.border }]}>
          <react_native_1.Text style={[styles.dateDay, { color: palette.text }]}>{start.getDate()}</react_native_1.Text>
          <react_native_1.Text style={[styles.dateMonth, { color: palette.muted }]}>{start.toLocaleDateString([], { month: 'short' }).toUpperCase()}</react_native_1.Text>
          <react_native_1.View style={[styles.line, { backgroundColor: accent }]}/>
        </react_native_1.View>
        <react_native_1.View style={styles.cardRight}>
          <react_native_1.View style={styles.topRow}>
            <react_native_1.Text style={[styles.timeText, { color: palette.text }]}>
              {formatDate(item.startTime)} • {formatTime(item.startTime)} - {formatTime((_e = item.endTime) !== null && _e !== void 0 ? _e : item.startTime)}
            </react_native_1.Text>
            {address ? (<react_native_1.TouchableOpacity style={[styles.mapBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong }]} onPress={() => openMaps(address)}>
                <vector_icons_1.Ionicons name="navigate-outline" size={16} color={palette.text}/>
              </react_native_1.TouchableOpacity>) : null}
          </react_native_1.View>

          <react_native_1.Text style={[styles.locationText, { color: palette.text }]} numberOfLines={2}>
            {fullLocation}
          </react_native_1.Text>

          <react_native_1.View style={styles.metaRow}>
            {item.role ? (<react_native_1.View style={[styles.pill, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                <vector_icons_1.Ionicons name="shield-outline" size={14} color={palette.cyan}/>
                <react_native_1.Text style={[styles.pillText, { color: palette.text }]}>{String(item.role).replace(/_/g, ' ')}</react_native_1.Text>
              </react_native_1.View>) : null}
            {isActive ? (<react_native_1.View style={[styles.pill, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                <react_native_1.View style={[styles.dot, { backgroundColor: palette.green }]}/>
                <react_native_1.Text style={[styles.pillText, { color: palette.text }]}>Active</react_native_1.Text>
              </react_native_1.View>) : isToday ? (<react_native_1.View style={[styles.pill, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                <react_native_1.View style={[styles.dot, { backgroundColor: palette.cyan }]}/>
                <react_native_1.Text style={[styles.pillText, { color: palette.text }]}>Today</react_native_1.Text>
              </react_native_1.View>) : null}
            {hasPendingCallout ? (<react_native_1.View style={[styles.pill, { borderColor: palette.border, backgroundColor: 'rgba(251,113,133,0.16)' }]}>
                <react_native_1.View style={[styles.dot, { backgroundColor: palette.red }]}/>
                <react_native_1.Text style={[styles.pillText, { color: palette.text }]}>Call-out Pending</react_native_1.Text>
              </react_native_1.View>) : null}
          </react_native_1.View>

          {canCallOut ? (<react_native_1.View style={styles.calloutWrap}>
              <react_native_1.TouchableOpacity style={[
                    styles.calloutToggle,
                    {
                        borderColor: palette.border,
                        backgroundColor: hasPendingCallout ? 'rgba(251,113,133,0.18)' : calloutShiftId === item.id ? 'rgba(251,113,133,0.18)' : palette.panelStrong,
                        opacity: hasPendingCallout ? 0.72 : 1,
                    },
                ]} disabled={hasPendingCallout} onPress={() => {
                    setCalloutReasonCode('SICK');
                    setCalloutReasonNote('');
                    setCalloutAttachment(null);
                    setCalloutShiftId(item.id);
                }}>
                <vector_icons_1.Ionicons name="alert-circle-outline" size={15} color={palette.red}/>
                <react_native_1.Text style={[styles.calloutToggleText, { color: palette.text }]}>{hasPendingCallout ? 'Awaiting Approval' : 'Call Out'}</react_native_1.Text>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>) : null}
        </react_native_1.View>
      </react_native_1.View>);
    };
    return (<react_native_safe_area_context_1.SafeAreaView style={[styles.container, { backgroundColor: palette.bg }]}>
      <react_native_1.StatusBar barStyle="light-content"/>
      <react_native_1.View style={styles.bgGlowWrap} pointerEvents="none">
        <react_native_1.View style={[styles.bgGlow, { backgroundColor: palette.indigo, top: -160, left: -160, opacity: 0.22 }]}/>
        <react_native_1.View style={[styles.bgGlow, { backgroundColor: palette.cyan, bottom: -180, right: -180, opacity: 0.16 }]}/>
        <react_native_1.View style={[styles.bgGlow, { backgroundColor: palette.green, top: 240, right: -210, opacity: 0.10 }]}/>
      </react_native_1.View>

      <react_native_1.View style={styles.header}>
        <react_native_1.View style={{ flex: 1, minWidth: 0 }}>
          <react_native_1.Text style={[styles.headerTitle, { color: palette.text }]}>Schedule</react_native_1.Text>
          <react_native_1.Text style={[styles.headerSubtitle, { color: palette.muted }]}>Your published shifts</react_native_1.Text>
          <react_native_1.Text style={[styles.headerSubtitle, { color: palette.faint }]} numberOfLines={1}>
            {displayName}{designation ? ` • ${designation}` : ''}
          </react_native_1.Text>
        </react_native_1.View>
        <react_native_1.View style={styles.headerActions}>
          <react_native_1.TouchableOpacity style={[styles.historyBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong }]} onPress={() => (0, NavigationService_1.navigate)('Schedule', { screen: 'CalloutHistory' })}>
            <vector_icons_1.Ionicons name="time-outline" size={15} color={palette.cyan}/>
            <react_native_1.Text style={[styles.historyBtnText, { color: palette.text }]}>Call-Outs</react_native_1.Text>
          </react_native_1.TouchableOpacity>
          <react_native_1.TouchableOpacity style={[styles.refreshBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong, opacity: loading ? 0.7 : 1 }]} onPress={fetchShifts} disabled={loading}>
            <vector_icons_1.Ionicons name="refresh" size={18} color={palette.text}/>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>
      </react_native_1.View>

      <react_native_1.View style={styles.filters}>
        {['UPCOMING', 'ALL', 'PAST'].map((k) => {
            const active = filter === k;
            const label = k === 'UPCOMING' ? 'Upcoming' : k === 'PAST' ? 'Past' : 'All';
            return (<react_native_1.TouchableOpacity key={k} style={[
                    styles.filterPill,
                    {
                        borderColor: palette.border,
                        backgroundColor: active ? palette.indigo : palette.panel,
                        opacity: loading ? 0.75 : 1,
                    },
                ]} onPress={() => setFilter(k)} disabled={loading}>
              <react_native_1.Text style={[styles.filterText, { color: active ? '#ffffff' : palette.text }]}>{label}</react_native_1.Text>
            </react_native_1.TouchableOpacity>);
        })}
      </react_native_1.View>

      {summary ? (<react_native_1.View style={[styles.summaryCard, { backgroundColor: palette.panel, borderColor: palette.border }]}>
          <react_native_1.View style={styles.summaryItem}>
            <react_native_1.Text style={[styles.summaryLabel, { color: palette.muted }]}>Total</react_native_1.Text>
            <react_native_1.Text style={[styles.summaryValue, { color: palette.text }]}>{Number((_a = summary.totalHours) !== null && _a !== void 0 ? _a : 0).toFixed(1)}h</react_native_1.Text>
          </react_native_1.View>
          <react_native_1.View style={styles.summaryItem}>
            <react_native_1.Text style={[styles.summaryLabel, { color: palette.muted }]}>Payable</react_native_1.Text>
            <react_native_1.Text style={[styles.summaryValue, { color: palette.text }]}>{Number((_b = summary.payableHours) !== null && _b !== void 0 ? _b : 0).toFixed(1)}h</react_native_1.Text>
          </react_native_1.View>
          <react_native_1.View style={styles.summaryItem}>
            <react_native_1.Text style={[styles.summaryLabel, { color: palette.muted }]}>Est.</react_native_1.Text>
            <react_native_1.Text style={[styles.summaryValue, { color: palette.text }]}>${Number((_c = summary.estimatedEarnings) !== null && _c !== void 0 ? _c : 0).toFixed(0)}</react_native_1.Text>
          </react_native_1.View>
        </react_native_1.View>) : null}
      
      {!isEmployee ? (<react_native_1.View style={styles.emptyContainer}>
            <vector_icons_1.Ionicons name="lock-closed-outline" size={52} color={palette.faint}/>
            <react_native_1.Text style={[styles.emptyText, { color: palette.muted }]}>Employee access only.</react_native_1.Text>
            <react_native_1.Text style={[styles.emptyHint, { color: palette.faint }]}>Schedule is available for employee accounts on the mobile app.</react_native_1.Text>
         </react_native_1.View>) : filteredShifts.length === 0 && !loading ? (<react_native_1.View style={styles.emptyContainer}>
            <vector_icons_1.Ionicons name="calendar-outline" size={52} color={palette.faint}/>
            <react_native_1.Text style={[styles.emptyText, { color: palette.muted }]}>No shifts found.</react_native_1.Text>
            <react_native_1.Text style={[styles.emptyHint, { color: palette.faint }]}>Pull to refresh or change the filter.</react_native_1.Text>
         </react_native_1.View>) : (<react_native_1.FlatList data={filteredShifts} renderItem={renderItem} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} refreshControl={<react_native_1.RefreshControl refreshing={loading} onRefresh={fetchShifts} tintColor={palette.cyan}/>}/>)}

      <react_native_1.Modal visible={!!calloutShiftId} transparent animationType="fade" onRequestClose={closeCalloutModal}>
        <react_native_1.View style={styles.modalBackdrop}>
          <react_native_1.View style={[styles.modalCard, { borderColor: palette.border, backgroundColor: '#0B1020' }]}>
            <react_native_1.View style={styles.modalHeader}>
              <react_native_1.View style={{ flex: 1 }}>
                <react_native_1.Text style={[styles.modalTitle, { color: palette.text }]}>Call Out</react_native_1.Text>
                <react_native_1.Text style={[styles.modalSubtitle, { color: palette.muted }]}>Submit your absence for approval.</react_native_1.Text>
              </react_native_1.View>
              <react_native_1.TouchableOpacity style={[styles.modalClose, { borderColor: palette.border, backgroundColor: palette.panelStrong }]} onPress={closeCalloutModal} disabled={!!calloutSubmittingId}>
                <vector_icons_1.Ionicons name="close" size={16} color={palette.text}/>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>

            <react_native_1.Text style={[styles.calloutLabel, { color: palette.text }]}>Reason</react_native_1.Text>
            <react_native_1.View style={styles.calloutChips}>
              {['SICK', 'EMERGENCY', 'PERSONAL'].map((code) => {
            const active = calloutReasonCode === code;
            return (<react_native_1.TouchableOpacity key={code} style={[
                    styles.calloutChip,
                    {
                        borderColor: active ? palette.red : palette.border,
                        backgroundColor: active ? 'rgba(251,113,133,0.18)' : palette.panel,
                    },
                ]} onPress={() => setCalloutReasonCode(code)}>
                    <react_native_1.Text style={[styles.calloutChipText, { color: palette.text }]}>{code}</react_native_1.Text>
                  </react_native_1.TouchableOpacity>);
        })}
            </react_native_1.View>

            <react_native_1.TextInput value={calloutReasonNote} onChangeText={setCalloutReasonNote} placeholder="Add note (optional)" placeholderTextColor={palette.faint} multiline style={[
            styles.calloutInput,
            {
                borderColor: palette.border,
                backgroundColor: palette.panel,
                color: palette.text,
            },
        ]}/>

            <react_native_1.TouchableOpacity style={[styles.attachmentBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong, opacity: calloutUploading ? 0.7 : 1 }]} onPress={pickCalloutDocument} disabled={calloutUploading || !!calloutSubmittingId}>
              <vector_icons_1.Ionicons name="attach-outline" size={16} color={palette.cyan}/>
              <react_native_1.Text style={[styles.attachmentBtnText, { color: palette.text }]}>
                {calloutUploading ? 'Picking file...' : calloutAttachment ? 'Change Attachment' : 'Add Attachment'}
              </react_native_1.Text>
            </react_native_1.TouchableOpacity>
            {calloutAttachment ? (<react_native_1.View style={[styles.attachmentInfo, { borderColor: palette.border, backgroundColor: palette.panel }]}>
                <react_native_1.View style={{ flex: 1 }}>
                  <react_native_1.Text style={[styles.attachmentName, { color: palette.text }]} numberOfLines={1}>
                    {calloutAttachment.name}
                  </react_native_1.Text>
                  <react_native_1.Text style={[styles.attachmentHint, { color: palette.muted }]}>Optional supporting document</react_native_1.Text>
                </react_native_1.View>
                <react_native_1.TouchableOpacity onPress={() => setCalloutAttachment(null)}>
                  <vector_icons_1.Ionicons name="close-circle" size={18} color={palette.red}/>
                </react_native_1.TouchableOpacity>
              </react_native_1.View>) : null}

            <react_native_1.View style={styles.calloutActions}>
              <react_native_1.TouchableOpacity style={[styles.calloutSecondaryBtn, { borderColor: palette.border, backgroundColor: palette.panel }]} onPress={closeCalloutModal} disabled={!!calloutSubmittingId}>
                <react_native_1.Text style={[styles.calloutSecondaryText, { color: palette.text }]}>Cancel</react_native_1.Text>
              </react_native_1.TouchableOpacity>
              <react_native_1.TouchableOpacity style={[styles.calloutPrimaryBtn, { backgroundColor: palette.red, opacity: calloutSubmittingId === calloutShiftId ? 0.75 : 1 }]} disabled={calloutSubmittingId === calloutShiftId} onPress={() => calloutShiftId && handleSubmitCallout(calloutShiftId)}>
                <react_native_1.Text style={styles.calloutPrimaryText}>
                  {calloutSubmittingId === calloutShiftId ? 'Submitting...' : 'Submit Call Out'}
                </react_native_1.Text>
              </react_native_1.TouchableOpacity>
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
