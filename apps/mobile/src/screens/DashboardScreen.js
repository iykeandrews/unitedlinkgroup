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
exports.default = DashboardScreen;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const AuthContext_1 = require("../context/AuthContext");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const api_1 = __importDefault(require("../services/api"));
const native_1 = require("@react-navigation/native");
const vector_icons_1 = require("@expo/vector-icons");
const Location = __importStar(require("expo-location"));
function DashboardScreen() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z;
    const { user, displayName, designation, avatarUrl } = (0, AuthContext_1.useAuth)();
    const navigation = (0, native_1.useNavigation)();
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [dashboard, setDashboard] = (0, react_1.useState)(null);
    const [businessName, setBusinessName] = (0, react_1.useState)('');
    const [clockInGeo, setClockInGeo] = (0, react_1.useState)({
        checking: false,
        withinRadius: false,
        distanceMeters: null,
        radiusMeters: null,
        message: 'Clock-in is available when you are at the assigned site.',
    });
    const extractErrorMessage = (err, fallback) => {
        var _a, _b;
        const apiMessage = (_b = (_a = err === null || err === void 0 ? void 0 : err.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message;
        if (typeof apiMessage === 'string' && apiMessage.trim())
            return apiMessage;
        if (Array.isArray(apiMessage) && apiMessage.length)
            return apiMessage.map((x) => String(x)).join('\n');
        if (typeof (err === null || err === void 0 ? void 0 : err.message) === 'string' && err.message.trim())
            return err.message;
        return fallback;
    };
    const roleUpper = (0, react_1.useMemo)(() => String((user === null || user === void 0 ? void 0 : user.employeeRole) || (user === null || user === void 0 ? void 0 : user.role) || '').toUpperCase(), [user === null || user === void 0 ? void 0 : user.employeeRole, user === null || user === void 0 ? void 0 : user.role]);
    const isEmployee = roleUpper === 'EMPLOYEE';
    const canFetchBusinessMine = roleUpper !== 'SUPER_ADMIN';
    const fetchData = (0, react_1.useCallback)(async () => {
        var _a, _b;
        setLoading(true);
        try {
            if (!isEmployee) {
                if (canFetchBusinessMine) {
                    const businessRes = await api_1.default.get('/businesses/mine').catch(() => ({ data: null }));
                    setBusinessName(((_a = businessRes === null || businessRes === void 0 ? void 0 : businessRes.data) === null || _a === void 0 ? void 0 : _a.name) ? String(businessRes.data.name) : '');
                }
                else {
                    setBusinessName('');
                }
                setDashboard(null);
                return;
            }
            const [dashboardRes, businessRes] = await Promise.all([
                api_1.default.get('/reports/employee-dashboard', { params: { days: 30 } }),
                api_1.default.get('/businesses/mine').catch(() => ({ data: null })),
            ]);
            setDashboard(dashboardRes.data || null);
            setBusinessName(((_b = businessRes === null || businessRes === void 0 ? void 0 : businessRes.data) === null || _b === void 0 ? void 0 : _b.name) ? String(businessRes.data.name) : '');
        }
        catch (e) {
            console.error(e);
            setDashboard(null);
        }
        finally {
            setLoading(false);
        }
    }, [canFetchBusinessMine, isEmployee, roleUpper]);
    (0, native_1.useFocusEffect)((0, react_1.useCallback)(() => {
        fetchData();
    }, [fetchData]));
    const mapGeoError = (err) => {
        const code = err === null || err === void 0 ? void 0 : err.code;
        if (code === 1)
            return 'Location permission denied. Enable location access to clock in.';
        if (code === 2)
            return 'Location unavailable. Check GPS and try again.';
        if (code === 3)
            return 'Location request timed out. Move to an open area and try again.';
        return extractErrorMessage(err, 'Unable to get your location. Enable GPS to clock in.');
    };
    const getCoords = (0, react_1.useCallback)(() => new Promise((resolve, reject) => {
        (async () => {
            var _a, _b;
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
                const lat = (_a = pos === null || pos === void 0 ? void 0 : pos.coords) === null || _a === void 0 ? void 0 : _a.latitude;
                const lng = (_b = pos === null || pos === void 0 ? void 0 : pos.coords) === null || _b === void 0 ? void 0 : _b.longitude;
                if (typeof lat === 'number' && typeof lng === 'number')
                    resolve({ lat, lng });
                else
                    reject(new Error('Unable to read GPS coordinates'));
            }
            catch (e) {
                reject(e);
            }
        })();
    }), []);
    const handleClockIn = async () => {
        try {
            const coords = await getCoords();
            await api_1.default.post('/time-tracking/clock-in', coords);
            react_native_1.Alert.alert('Success', 'You are clocked in!');
            fetchData();
        }
        catch (e) {
            const msg = (e === null || e === void 0 ? void 0 : e.response) ? extractErrorMessage(e, 'Failed to clock in') : mapGeoError(e);
            react_native_1.Alert.alert('Clock in blocked', msg);
        }
    };
    const handleClockOut = async () => {
        try {
            let coords = null;
            try {
                coords = await getCoords();
            }
            catch { }
            await api_1.default.post('/time-tracking/clock-out', coords || {});
            react_native_1.Alert.alert('Success', 'You are clocked out!');
            fetchData();
        }
        catch (e) {
            react_native_1.Alert.alert('Clock out failed', extractErrorMessage(e, 'Failed to clock out'));
        }
    };
    const handleStartBreak = async () => {
        try {
            const coords = await getCoords();
            await api_1.default.post('/time-tracking/break/start', { type: 'UNPAID', ...coords });
            fetchData();
        }
        catch (e) {
            const msg = (e === null || e === void 0 ? void 0 : e.response) ? extractErrorMessage(e, 'Failed to start break') : mapGeoError(e);
            react_native_1.Alert.alert('Break blocked', msg);
        }
    };
    const handleResumeShift = async () => {
        try {
            const coords = await getCoords();
            await api_1.default.post('/time-tracking/break/end', coords);
            fetchData();
        }
        catch (e) {
            const msg = (e === null || e === void 0 ? void 0 : e.response) ? extractErrorMessage(e, 'Failed to resume shift') : mapGeoError(e);
            react_native_1.Alert.alert('Resume blocked', msg);
        }
    };
    const formatTime = (dateStr) => {
        return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    const formatTimeRange = (start, end) => {
        return `${formatTime(start)} - ${formatTime(end)}`;
    };
    const calculateDistanceMeters = (lat1, lng1, lat2, lng2) => {
        const toRad = (value) => (value * Math.PI) / 180;
        const earthRadiusMeters = 6371000;
        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadiusMeters * c;
    };
    const now = (0, react_1.useMemo)(() => {
        return (dashboard === null || dashboard === void 0 ? void 0 : dashboard.now) ? new Date(dashboard.now) : new Date();
    }, [dashboard === null || dashboard === void 0 ? void 0 : dashboard.now]);
    const name = displayName;
    const activeTimesheet = ((_a = dashboard === null || dashboard === void 0 ? void 0 : dashboard.timeTracking) === null || _a === void 0 ? void 0 : _a.activeTimesheet) || null;
    const activeBreak = ((_b = dashboard === null || dashboard === void 0 ? void 0 : dashboard.timeTracking) === null || _b === void 0 ? void 0 : _b.activeBreak) || null;
    const isClockedIn = !!activeTimesheet;
    const isOnBreak = !!activeBreak && !activeBreak.endTime;
    const todayShifts = ((_c = dashboard === null || dashboard === void 0 ? void 0 : dashboard.schedule) === null || _c === void 0 ? void 0 : _c.today) || [];
    const currentShift = ((_d = dashboard === null || dashboard === void 0 ? void 0 : dashboard.schedule) === null || _d === void 0 ? void 0 : _d.currentShift) || null;
    const nextShift = ((_e = dashboard === null || dashboard === void 0 ? void 0 : dashboard.schedule) === null || _e === void 0 ? void 0 : _e.nextShift) || null;
    const targetClockInShift = currentShift || nextShift;
    const onScheduleToday = todayShifts.length > 0;
    const canClockIn = !!((_f = dashboard === null || dashboard === void 0 ? void 0 : dashboard.schedule) === null || _f === void 0 ? void 0 : _f.canClockIn) && !isClockedIn && clockInGeo.withinRadius;
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
    const initials = (0, react_1.useMemo)(() => {
        var _a, _b;
        const parts = name.split(' ').filter(Boolean);
        const a = ((_a = parts[0]) === null || _a === void 0 ? void 0 : _a[0]) || 'U';
        const b = ((_b = parts[1]) === null || _b === void 0 ? void 0 : _b[0]) || '';
        return `${a}${b}`.toUpperCase();
    }, [name]);
    const statusLabel = isClockedIn ? 'ON DUTY' : 'OFF DUTY';
    const statusColor = isClockedIn ? palette.green : palette.faint;
    const primaryActionEnabled = isClockedIn ? canClockOut && !loading : canClockIn && !loading;
    const scheduleLabel = onScheduleToday ? 'EMPLOYEE ON SCHEDULE' : 'EMPLOYEE OFF SCHEDULE';
    const scheduleColor = onScheduleToday ? palette.cyan : palette.faint;
    (0, react_1.useEffect)(() => {
        let cancelled = false;
        const checkClockInRadius = async () => {
            var _a;
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
            if (!((_a = dashboard === null || dashboard === void 0 ? void 0 : dashboard.schedule) === null || _a === void 0 ? void 0 : _a.canClockIn) || !targetClockInShift) {
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
            const radiusMeters = typeof targetClockInShift.locationRadiusMeters === 'number' && Number.isFinite(targetClockInShift.locationRadiusMeters) && targetClockInShift.locationRadiusMeters > 0
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
                if (cancelled)
                    return;
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
            }
            catch (e) {
                if (cancelled)
                    return;
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
    }, [targetClockInShift, (_g = dashboard === null || dashboard === void 0 ? void 0 : dashboard.schedule) === null || _g === void 0 ? void 0 : _g.canClockIn, getCoords, isClockedIn, onScheduleToday]);
    const [breakTick, setBreakTick] = (0, react_1.useState)(0);
    (0, react_1.useEffect)(() => {
        if (!isOnBreak)
            return;
        const id = setInterval(() => setBreakTick((t) => t + 1), 1000);
        return () => clearInterval(id);
    }, [isOnBreak]);
    (0, react_1.useEffect)(() => {
        if (!isClockedIn)
            return;
        if (isOnBreak)
            return;
        let cancelled = false;
        const id = setInterval(() => {
            (async () => {
                try {
                    const coords = await getCoords();
                    if (cancelled)
                        return;
                    await api_1.default.post('/time-tracking/location/ping', coords);
                }
                catch { }
            })();
        }, 60000);
        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, [getCoords, isClockedIn, isOnBreak]);
    const breakElapsedLabel = (0, react_1.useMemo)(() => {
        if (!isOnBreak || !(activeBreak === null || activeBreak === void 0 ? void 0 : activeBreak.startTime))
            return '';
        const start = new Date(activeBreak.startTime).getTime();
        const nowMs = Date.now();
        if (!isFinite(start) || !isFinite(nowMs))
            return '';
        const minutes = Math.max(0, Math.floor((nowMs - start) / 60000));
        return `${minutes} min`;
    }, [activeBreak === null || activeBreak === void 0 ? void 0 : activeBreak.startTime, breakTick, isOnBreak]);
    return (<react_native_safe_area_context_1.SafeAreaView style={[styles.container, { backgroundColor: palette.bg }]}>
      <react_native_1.StatusBar barStyle="light-content"/>
      <react_native_1.View style={styles.bgGlowWrap} pointerEvents="none">
        <react_native_1.View style={[styles.bgGlow, { backgroundColor: palette.indigo, top: -120, left: -140 }]}/>
        <react_native_1.View style={[styles.bgGlow, { backgroundColor: palette.cyan, top: 140, right: -160, opacity: 0.22 }]}/>
        <react_native_1.View style={[styles.bgGlow, { backgroundColor: palette.green, bottom: -160, left: -160, opacity: 0.18 }]}/>
      </react_native_1.View>

      <react_native_1.ScrollView contentContainerStyle={styles.content} refreshControl={<react_native_1.RefreshControl refreshing={loading} onRefresh={fetchData} tintColor={palette.cyan}/>}>
        <react_native_1.View style={styles.header}>
          <react_native_1.View style={{ flex: 1, minWidth: 0 }}>
            <react_native_1.Text style={[styles.kicker, { color: palette.muted }]}>{designation ? `${designation} Command Center` : 'Command Center'}</react_native_1.Text>
            <react_native_1.Text style={[styles.username, { color: palette.text }]} numberOfLines={1}>
              {name}
            </react_native_1.Text>
            <react_native_1.View style={styles.userInfoRow}>
              {(user === null || user === void 0 ? void 0 : user.email) ? (<react_native_1.View style={styles.metaItem}>
                  <vector_icons_1.Ionicons name="mail-outline" size={14} color={palette.muted}/>
                  <react_native_1.Text style={[styles.metaText, { color: palette.muted }]} numberOfLines={1}>
                    {String(user.email)}
                  </react_native_1.Text>
                </react_native_1.View>) : null}
              {designation ? (<react_native_1.View style={styles.metaItem}>
                  <vector_icons_1.Ionicons name="briefcase-outline" size={14} color={palette.muted}/>
                  <react_native_1.Text style={[styles.metaText, { color: palette.muted }]} numberOfLines={1}>
                    {designation}
                  </react_native_1.Text>
                </react_native_1.View>) : null}
              {businessName ? (<react_native_1.View style={styles.metaItem}>
                  <vector_icons_1.Ionicons name="business-outline" size={14} color={palette.muted}/>
                  <react_native_1.Text style={[styles.metaText, { color: palette.muted }]} numberOfLines={1}>
                    {businessName}
                  </react_native_1.Text>
                </react_native_1.View>) : null}
            </react_native_1.View>
            <react_native_1.View style={styles.headerMetaRow}>
              <react_native_1.View style={[styles.pill, { borderColor: palette.border, backgroundColor: palette.panel }]}>
                <react_native_1.View style={[styles.pillDot, { backgroundColor: statusColor }]}/>
                <react_native_1.Text style={[styles.pillText, { color: palette.text }]}>{statusLabel}</react_native_1.Text>
              </react_native_1.View>
              <react_native_1.View style={[styles.pill, { borderColor: palette.border, backgroundColor: palette.panel }]}>
                <react_native_1.View style={[styles.pillDot, { backgroundColor: scheduleColor }]}/>
                <react_native_1.Text style={[styles.pillText, { color: palette.text }]}>{scheduleLabel}</react_native_1.Text>
              </react_native_1.View>
              <react_native_1.View style={styles.metaItem}>
                <vector_icons_1.Ionicons name="time-outline" size={14} color={palette.muted}/>
                <react_native_1.Text style={[styles.metaText, { color: palette.muted }]} numberOfLines={1}>
                  {now.toLocaleString()}
                </react_native_1.Text>
              </react_native_1.View>
            </react_native_1.View>
          </react_native_1.View>

          <react_native_1.TouchableOpacity style={[styles.avatar, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
            {avatarUrl ? (<react_native_1.Image source={{ uri: avatarUrl }} style={styles.avatarImg}/>) : (<react_native_1.Text style={[styles.avatarText, { color: palette.text }]}>{initials}</react_native_1.Text>)}
          </react_native_1.TouchableOpacity>
        </react_native_1.View>

        <react_native_1.View style={[styles.heroCard, { backgroundColor: palette.panel, borderColor: palette.border }]}>
          <react_native_1.View style={styles.heroTopRow}>
            <react_native_1.View style={{ flex: 1, minWidth: 0 }}>
              <react_native_1.Text style={[styles.heroLabel, { color: palette.muted }]}>
                {onScheduleToday ? 'Employee On Schedule' : 'Employee Off Schedule'}
              </react_native_1.Text>
              <react_native_1.View style={[
            styles.scheduleBadge,
            {
                borderColor: onScheduleToday ? 'rgba(34,211,238,0.35)' : palette.border,
                backgroundColor: onScheduleToday ? 'rgba(34,211,238,0.16)' : palette.panelStrong,
            },
        ]}>
                <vector_icons_1.Ionicons name={onScheduleToday ? 'checkmark-circle-outline' : 'close-circle-outline'} size={16} color={(onScheduleToday ? palette.cyan : palette.faint)}/>
                <react_native_1.Text style={[styles.scheduleBadgeText, { color: palette.text }]}>
                  {onScheduleToday ? 'Employee On Schedule' : 'Employee Off Schedule'}
                </react_native_1.Text>
              </react_native_1.View>
              <react_native_1.Text style={[styles.heroTitle, { color: palette.text }]} numberOfLines={1}>
                {(targetClockInShift === null || targetClockInShift === void 0 ? void 0 : targetClockInShift.locationName) || 'No site assigned'}
              </react_native_1.Text>
              <react_native_1.Text style={[styles.heroSub, { color: palette.muted }]} numberOfLines={1}>
                {currentShift
            ? `Current shift • ${formatTimeRange(currentShift.startTime, currentShift.endTime)}`
            : nextShift
                ? `Next shift • ${formatTimeRange(nextShift.startTime, nextShift.endTime)}`
                : 'No shift scheduled right now'}
              </react_native_1.Text>
            </react_native_1.View>
            <react_native_1.TouchableOpacity style={[styles.heroSecondary, { borderColor: palette.border, backgroundColor: palette.panelStrong }]} onPress={() => navigation.navigate('Schedule')}>
              <vector_icons_1.Ionicons name="calendar-outline" size={18} color={palette.text}/>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>

          <react_native_1.View style={styles.heroDivider}/>

          <react_native_1.View style={styles.heroActionRow}>
            <react_native_1.View style={{ flex: 1 }}>
              <react_native_1.Text style={[styles.heroSmallLabel, { color: palette.muted }]}>Status</react_native_1.Text>
              <react_native_1.Text style={[styles.heroStatus, { color: palette.text }]}>
                {isOnBreak
            ? `On break${breakElapsedLabel ? ` • ${breakElapsedLabel}` : ''}`
            : isClockedIn
                ? `Clocked in${(activeTimesheet === null || activeTimesheet === void 0 ? void 0 : activeTimesheet.startTime) ? ` • since ${formatTime(activeTimesheet.startTime)}` : ''}`
                : canClockIn
                    ? 'Ready to clock in'
                    : clockInGeo.checking
                        ? 'Checking site radius'
                        : 'Clock-in locked'}
              </react_native_1.Text>
              <react_native_1.Text style={[styles.heroHint, { color: palette.faint }]}>
                {isClockedIn ? 'Location required for break and resume.' : clockInGeo.message}
              </react_native_1.Text>
            </react_native_1.View>

            {!isClockedIn ? (<react_native_1.TouchableOpacity style={[
                styles.primaryButton,
                {
                    backgroundColor: palette.indigo,
                    opacity: primaryActionEnabled ? 1 : 0.55,
                },
            ]} disabled={!primaryActionEnabled} onPress={handleClockIn}>
                <vector_icons_1.Ionicons name={'play-circle-outline'} size={18} color={'#ffffff'}/>
                <react_native_1.Text style={styles.primaryButtonText}>Clock In</react_native_1.Text>
              </react_native_1.TouchableOpacity>) : (<react_native_1.View style={styles.heroButtons}>
                {!isOnBreak ? (<react_native_1.TouchableOpacity style={[
                    styles.secondaryButton,
                    {
                        borderColor: palette.border,
                        backgroundColor: palette.panelStrong,
                        opacity: loading ? 0.55 : 1,
                    },
                ]} disabled={loading} onPress={handleStartBreak}>
                    <vector_icons_1.Ionicons name="pause-circle-outline" size={18} color={palette.text}/>
                    <react_native_1.Text style={[styles.secondaryButtonText, { color: palette.text }]}>Break</react_native_1.Text>
                  </react_native_1.TouchableOpacity>) : (<react_native_1.TouchableOpacity style={[
                    styles.secondaryButton,
                    {
                        borderColor: palette.border,
                        backgroundColor: palette.panelStrong,
                        opacity: loading ? 0.55 : 1,
                    },
                ]} disabled={loading} onPress={handleResumeShift}>
                    <vector_icons_1.Ionicons name="play-circle-outline" size={18} color={palette.text}/>
                    <react_native_1.Text style={[styles.secondaryButtonText, { color: palette.text }]}>Resume shift</react_native_1.Text>
                  </react_native_1.TouchableOpacity>)}

                <react_native_1.TouchableOpacity style={[
                styles.primaryButton,
                {
                    backgroundColor: palette.red,
                    opacity: canClockOut && !loading ? 1 : 0.55,
                },
            ]} disabled={!canClockOut || loading} onPress={handleClockOut}>
                  <vector_icons_1.Ionicons name="stop-circle-outline" size={18} color={'#ffffff'}/>
                  <react_native_1.Text style={styles.primaryButtonText}>Clock Out</react_native_1.Text>
                </react_native_1.TouchableOpacity>
              </react_native_1.View>)}
          </react_native_1.View>
        </react_native_1.View>

        <react_native_1.Text style={[styles.sectionTitle, { color: palette.text }]}>Performance</react_native_1.Text>
        <react_native_1.View style={styles.grid}>
          <react_native_1.View style={[styles.metricCard, { backgroundColor: palette.panel, borderColor: palette.border }]}>
            <react_native_1.View style={styles.metricTopRow}>
              <vector_icons_1.Ionicons name="pulse-outline" size={18} color={palette.cyan}/>
              <react_native_1.Text style={[styles.metricLabel, { color: palette.muted }]}>On-time rate</react_native_1.Text>
            </react_native_1.View>
            <react_native_1.Text style={[styles.metricValue, { color: palette.text }]}>{(_k = (_j = (_h = dashboard === null || dashboard === void 0 ? void 0 : dashboard.metrics) === null || _h === void 0 ? void 0 : _h.punctuality) === null || _j === void 0 ? void 0 : _j.onTimeRate) !== null && _k !== void 0 ? _k : 0}%</react_native_1.Text>
            <react_native_1.Text style={[styles.metricSub, { color: palette.faint }]}>Avg late: {(_o = (_m = (_l = dashboard === null || dashboard === void 0 ? void 0 : dashboard.metrics) === null || _l === void 0 ? void 0 : _l.punctuality) === null || _m === void 0 ? void 0 : _m.avgLateMinutes) !== null && _o !== void 0 ? _o : 0}m</react_native_1.Text>
          </react_native_1.View>

          <react_native_1.View style={[styles.metricCard, { backgroundColor: palette.panel, borderColor: palette.border }]}>
            <react_native_1.View style={styles.metricTopRow}>
              <vector_icons_1.Ionicons name="shield-checkmark-outline" size={18} color={palette.green}/>
              <react_native_1.Text style={[styles.metricLabel, { color: palette.muted }]}>Reports</react_native_1.Text>
            </react_native_1.View>
            <react_native_1.Text style={[styles.metricValue, { color: palette.text }]}>{(_r = (_q = (_p = dashboard === null || dashboard === void 0 ? void 0 : dashboard.metrics) === null || _p === void 0 ? void 0 : _p.reports) === null || _q === void 0 ? void 0 : _q.total) !== null && _r !== void 0 ? _r : 0}</react_native_1.Text>
            <react_native_1.Text style={[styles.metricSub, { color: palette.faint }]}>
              Incidents: {(_u = (_t = (_s = dashboard === null || dashboard === void 0 ? void 0 : dashboard.metrics) === null || _s === void 0 ? void 0 : _s.reports) === null || _t === void 0 ? void 0 : _t.incidentCount) !== null && _u !== void 0 ? _u : 0} • Patrol: {(_x = (_w = (_v = dashboard === null || dashboard === void 0 ? void 0 : dashboard.metrics) === null || _v === void 0 ? void 0 : _v.reports) === null || _w === void 0 ? void 0 : _w.patrolCount) !== null && _x !== void 0 ? _x : 0}
            </react_native_1.Text>
          </react_native_1.View>

          <react_native_1.View style={[styles.metricCardWide, { backgroundColor: palette.panel, borderColor: palette.border }]}>
            <react_native_1.View style={styles.metricTopRow}>
              <vector_icons_1.Ionicons name="sparkles-outline" size={18} color={palette.amber}/>
              <react_native_1.Text style={[styles.metricLabel, { color: palette.muted }]}>Consistency</react_native_1.Text>
            </react_native_1.View>
            <react_native_1.View style={styles.streakRow}>
              <react_native_1.Text style={[styles.streakValue, { color: palette.text }]}>{(_z = (_y = dashboard === null || dashboard === void 0 ? void 0 : dashboard.metrics) === null || _y === void 0 ? void 0 : _y.streakOnTimeDays) !== null && _z !== void 0 ? _z : 0}</react_native_1.Text>
              <react_native_1.Text style={[styles.streakUnit, { color: palette.muted }]}>days on-time streak</react_native_1.Text>
            </react_native_1.View>
          </react_native_1.View>
        </react_native_1.View>

        <react_native_1.Text style={[styles.sectionTitle, { color: palette.text }]}>Quick actions</react_native_1.Text>
        <react_native_1.View style={styles.quickRow}>
          <react_native_1.TouchableOpacity style={[styles.quickCard, { backgroundColor: palette.panel, borderColor: palette.border }]} onPress={() => navigation.navigate('Schedule')}>
            <react_native_1.View style={[styles.quickIconWrap, { backgroundColor: 'rgba(79,70,229,0.18)' }]}>
              <vector_icons_1.Ionicons name="calendar-outline" size={20} color={palette.text}/>
            </react_native_1.View>
            <react_native_1.Text style={[styles.quickText, { color: palette.text }]}>Schedule</react_native_1.Text>
          </react_native_1.TouchableOpacity>

          <react_native_1.TouchableOpacity style={[styles.quickCard, { backgroundColor: palette.panel, borderColor: palette.border }]} onPress={() => navigation.navigate('Leave')}>
            <react_native_1.View style={[styles.quickIconWrap, { backgroundColor: 'rgba(251,191,36,0.18)' }]}>
              <vector_icons_1.Ionicons name="airplane-outline" size={20} color={palette.text}/>
            </react_native_1.View>
            <react_native_1.Text style={[styles.quickText, { color: palette.text }]}>Leave</react_native_1.Text>
          </react_native_1.TouchableOpacity>

          <react_native_1.TouchableOpacity style={[styles.quickCard, { backgroundColor: palette.panel, borderColor: palette.border }]} onPress={() => navigation.navigate('Payslips')}>
            <react_native_1.View style={[styles.quickIconWrap, { backgroundColor: 'rgba(52,211,153,0.18)' }]}>
              <vector_icons_1.Ionicons name="cash-outline" size={20} color={palette.text}/>
            </react_native_1.View>
            <react_native_1.Text style={[styles.quickText, { color: palette.text }]}>Payslips</react_native_1.Text>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>

        <react_native_1.Text style={[styles.sectionTitle, { color: palette.text }]}>Recent activity</react_native_1.Text>
        <react_native_1.View style={[styles.activityCard, { backgroundColor: palette.panel, borderColor: palette.border }]}>
          {((dashboard === null || dashboard === void 0 ? void 0 : dashboard.activity) || []).length === 0 ? (<react_native_1.Text style={[styles.emptyText, { color: palette.muted }]}>No recent activity.</react_native_1.Text>) : (((dashboard === null || dashboard === void 0 ? void 0 : dashboard.activity) || []).slice(0, 8).map((a) => (<react_native_1.View key={`${a.kind}_${a.id}`} style={[styles.activityRow, { borderBottomColor: palette.border }]}>
                <react_native_1.View style={styles.activityLeft}>
                  <react_native_1.View style={styles.activityTitleRow}>
                    <react_native_1.View style={[styles.activityIcon, { backgroundColor: palette.panelStrong, borderColor: palette.border }]}>
                      <vector_icons_1.Ionicons name="flash-outline" size={14} color={palette.cyan}/>
                    </react_native_1.View>
                    <react_native_1.View style={{ flex: 1, minWidth: 0 }}>
                      <react_native_1.Text style={[styles.activityTitle, { color: palette.text }]} numberOfLines={1}>
                        {a.title || 'Update'}
                      </react_native_1.Text>
                      <react_native_1.Text style={[styles.activityKind, { color: palette.muted }]} numberOfLines={1}>
                        {a.kind}
                      </react_native_1.Text>
                    </react_native_1.View>
                  </react_native_1.View>
                </react_native_1.View>
                <react_native_1.Text style={[styles.activityTime, { color: palette.muted }]}>{new Date(a.createdAt).toLocaleDateString()}</react_native_1.Text>
              </react_native_1.View>)))}
        </react_native_1.View>
      </react_native_1.ScrollView>
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
