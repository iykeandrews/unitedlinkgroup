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
exports.default = SettingsScreen;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const vector_icons_1 = require("@expo/vector-icons");
const AuthContext_1 = require("../context/AuthContext");
const native_1 = require("@react-navigation/native");
const Location = __importStar(require("expo-location"));
const IntentLauncher = __importStar(require("expo-intent-launcher"));
const expo_constants_1 = __importDefault(require("expo-constants"));
const push_1 = require("../services/push");
const api_1 = __importDefault(require("../services/api"));
function SettingsScreen() {
    const { user, signOut, clearSavedSession, biometricAvailable, biometricEnabled, savedSessionAvailable, setBiometricPreference } = (0, AuthContext_1.useAuth)();
    const navigation = (0, native_1.useNavigation)();
    const [saving, setSaving] = (0, react_1.useState)(false);
    const [checking, setChecking] = (0, react_1.useState)(false);
    const [locationPermission, setLocationPermission] = (0, react_1.useState)('UNKNOWN');
    const [locationServices, setLocationServices] = (0, react_1.useState)('UNKNOWN');
    const [pushStatus, setPushStatus] = (0, react_1.useState)('UNKNOWN');
    const [showPasswordModal, setShowPasswordModal] = (0, react_1.useState)(false);
    const [currentPassword, setCurrentPassword] = (0, react_1.useState)('');
    const [newPassword, setNewPassword] = (0, react_1.useState)('');
    const [confirmPassword, setConfirmPassword] = (0, react_1.useState)('');
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
    const canToggleOn = biometricAvailable && savedSessionAvailable;
    const openAppSettings = async () => {
        try {
            await react_native_1.Linking.openSettings();
        }
        catch {
            try {
                await react_native_1.Linking.openURL('app-settings:');
            }
            catch { }
        }
    };
    const openLocationSettings = async () => {
        try {
            if (react_native_1.Platform.OS === 'android') {
                await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS);
                return;
            }
            await openAppSettings();
        }
        catch {
            await openAppSettings();
        }
    };
    const refreshLocationState = (0, react_1.useCallback)(async () => {
        try {
            setChecking(true);
            const perm = await Location.getForegroundPermissionsAsync();
            setLocationPermission((perm === null || perm === void 0 ? void 0 : perm.granted) ? 'GRANTED' : 'DENIED');
            const enabled = await Location.hasServicesEnabledAsync();
            setLocationServices(enabled ? 'ON' : 'OFF');
        }
        catch {
            setLocationPermission('UNKNOWN');
            setLocationServices('UNKNOWN');
        }
        finally {
            setChecking(false);
        }
    }, []);
    (0, react_1.useEffect)(() => {
        refreshLocationState();
    }, [refreshLocationState]);
    const enableNotifications = async () => {
        if (saving)
            return;
        try {
            setSaving(true);
            const token = await (0, push_1.registerExpoPush)();
            setPushStatus(token ? 'ENABLED' : 'DISABLED');
            if (!token) {
                react_native_1.Alert.alert('Notifications', 'Notifications permission was not granted or push is unavailable in this environment.');
            }
        }
        catch (e) {
            setPushStatus('DISABLED');
            react_native_1.Alert.alert('Notifications', String((e === null || e === void 0 ? void 0 : e.message) || 'Unable to enable notifications'));
        }
        finally {
            setSaving(false);
        }
    };
    const onToggle = async () => {
        if (saving)
            return;
        const next = !biometricEnabled;
        if (next && !biometricAvailable) {
            react_native_1.Alert.alert('Biometric login', 'Biometric authentication is not available on this device.');
            return;
        }
        if (next && !savedSessionAvailable) {
            react_native_1.Alert.alert('Biometric login', 'Sign in once with password before enabling biometric login.');
            return;
        }
        try {
            setSaving(true);
            await setBiometricPreference(next);
        }
        catch (e) {
            react_native_1.Alert.alert('Biometric login', String((e === null || e === void 0 ? void 0 : e.message) || 'Unable to update biometric preference'));
        }
        finally {
            setSaving(false);
        }
    };
    const openChangePassword = () => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordModal(true);
    };
    const submitPassword = async () => {
        var _a, _b;
        if (saving)
            return;
        const cur = currentPassword;
        const next = newPassword;
        const confirm = confirmPassword;
        if (!cur || !next) {
            react_native_1.Alert.alert('Change password', 'Enter current password and new password.');
            return;
        }
        if (next.length < 8) {
            react_native_1.Alert.alert('Change password', 'New password must be at least 8 characters.');
            return;
        }
        if (next !== confirm) {
            react_native_1.Alert.alert('Change password', 'New password and confirmation do not match.');
            return;
        }
        try {
            setSaving(true);
            await api_1.default.patch('/employees/me/password', { currentPassword: cur, newPassword: next });
            setShowPasswordModal(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            react_native_1.Alert.alert('Change password', 'Password updated.');
        }
        catch (e) {
            react_native_1.Alert.alert('Change password', String(((_b = (_a = e === null || e === void 0 ? void 0 : e.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || (e === null || e === void 0 ? void 0 : e.message) || 'Unable to update password'));
        }
        finally {
            setSaving(false);
        }
    };
    const lockNow = async () => {
        try {
            await signOut();
        }
        catch (e) {
            react_native_1.Alert.alert('Lock', String((e === null || e === void 0 ? void 0 : e.message) || 'Unable to lock the app'));
        }
    };
    const signOutFully = async () => {
        react_native_1.Alert.alert('Sign out', 'This will remove your saved session from this device.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign out',
                style: 'destructive',
                onPress: async () => {
                    try {
                        setSaving(true);
                        await clearSavedSession();
                    }
                    catch (e) {
                        react_native_1.Alert.alert('Sign out', String((e === null || e === void 0 ? void 0 : e.message) || 'Unable to sign out'));
                    }
                    finally {
                        setSaving(false);
                    }
                },
            },
        ]);
    };
    const initials = (0, react_1.useMemo)(() => {
        const first = String((user === null || user === void 0 ? void 0 : user.firstName) || '').trim();
        const last = String((user === null || user === void 0 ? void 0 : user.lastName) || '').trim();
        const a = first ? first[0] : 'U';
        const b = last ? last[0] : '';
        return `${a}${b}`.toUpperCase();
    }, [user === null || user === void 0 ? void 0 : user.firstName, user === null || user === void 0 ? void 0 : user.lastName]);
    const locationBadge = (0, react_1.useMemo)(() => {
        if (locationPermission === 'UNKNOWN' || locationServices === 'UNKNOWN')
            return { label: 'Checking', color: palette.faint };
        if (locationPermission !== 'GRANTED')
            return { label: 'Blocked', color: palette.red };
        if (locationServices !== 'ON')
            return { label: 'Off', color: palette.amber };
        return { label: 'Ready', color: palette.green };
    }, [locationPermission, locationServices, palette.amber, palette.faint, palette.green, palette.red]);
    const appVersion = (0, react_1.useMemo)(() => {
        var _a, _b, _c, _d, _e, _f;
        const v = ((_a = expo_constants_1.default === null || expo_constants_1.default === void 0 ? void 0 : expo_constants_1.default.expoConfig) === null || _a === void 0 ? void 0 : _a.version) || ((_b = expo_constants_1.default === null || expo_constants_1.default === void 0 ? void 0 : expo_constants_1.default.manifest) === null || _b === void 0 ? void 0 : _b.version) || '';
        const build = ((_d = (_c = expo_constants_1.default === null || expo_constants_1.default === void 0 ? void 0 : expo_constants_1.default.expoConfig) === null || _c === void 0 ? void 0 : _c.ios) === null || _d === void 0 ? void 0 : _d.buildNumber) || ((_f = (_e = expo_constants_1.default === null || expo_constants_1.default === void 0 ? void 0 : expo_constants_1.default.expoConfig) === null || _e === void 0 ? void 0 : _e.android) === null || _f === void 0 ? void 0 : _f.versionCode) || '';
        return [v, build ? `(${build})` : ''].filter(Boolean).join(' ');
    }, []);
    return (<react_native_safe_area_context_1.SafeAreaView style={[styles.container, { backgroundColor: palette.bg }]}>
      <react_native_1.StatusBar barStyle="light-content"/>
      <react_native_1.View style={styles.bgGlowWrap} pointerEvents="none">
        <react_native_1.View style={[styles.bgGlow, { backgroundColor: palette.indigo, top: -160, left: -160, opacity: 0.22 }]}/>
        <react_native_1.View style={[styles.bgGlow, { backgroundColor: palette.cyan, bottom: -180, right: -180, opacity: 0.16 }]}/>
        <react_native_1.View style={[styles.bgGlow, { backgroundColor: palette.green, top: 180, right: -210, opacity: 0.10 }]}/>
      </react_native_1.View>

      <react_native_1.ScrollView contentContainerStyle={styles.content}>
        <react_native_1.View style={styles.header}>
          <react_native_1.View style={styles.headerTopRow}>
            <react_native_1.TouchableOpacity style={[styles.backBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong }]} onPress={() => navigation.goBack()}>
              <vector_icons_1.Ionicons name="chevron-back" size={18} color={palette.text}/>
            </react_native_1.TouchableOpacity>
            <react_native_1.View style={{ flex: 1, minWidth: 0 }}>
              <react_native_1.Text style={[styles.title, { color: palette.text }]}>Settings</react_native_1.Text>
              <react_native_1.Text style={[styles.subtitle, { color: palette.muted }]}>Security & preferences</react_native_1.Text>
            </react_native_1.View>
          </react_native_1.View>
        </react_native_1.View>

        <react_native_1.View style={[styles.hero, { backgroundColor: palette.panel, borderColor: palette.border }]}>
          <react_native_1.View style={styles.heroTopRow}>
            <react_native_1.View style={[styles.avatar, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
              <react_native_1.Text style={[styles.avatarText, { color: palette.text }]}>{initials}</react_native_1.Text>
            </react_native_1.View>
            <react_native_1.View style={{ flex: 1, minWidth: 0 }}>
              <react_native_1.Text style={[styles.heroName, { color: palette.text }]} numberOfLines={1}>
                {(user === null || user === void 0 ? void 0 : user.firstName) ? `${user.firstName} ${(user === null || user === void 0 ? void 0 : user.lastName) || ''}`.trim() : 'Account'}
              </react_native_1.Text>
              <react_native_1.Text style={[styles.heroMeta, { color: palette.muted }]} numberOfLines={1}>
                {(user === null || user === void 0 ? void 0 : user.email) || ' '}
              </react_native_1.Text>
              <react_native_1.View style={styles.heroBadges}>
                <react_native_1.View style={[styles.badge, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                  <vector_icons_1.Ionicons name="location-outline" size={14} color={locationBadge.color}/>
                  <react_native_1.Text style={[styles.badgeText, { color: palette.text }]}>{locationBadge.label}</react_native_1.Text>
                </react_native_1.View>
                <react_native_1.View style={[styles.badge, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                  <vector_icons_1.Ionicons name="scan-outline" size={14} color={(biometricEnabled ? palette.cyan : palette.faint)}/>
                  <react_native_1.Text style={[styles.badgeText, { color: palette.text }]}>{biometricEnabled ? 'Biometric' : 'Password'}</react_native_1.Text>
                </react_native_1.View>
              </react_native_1.View>
            </react_native_1.View>
          </react_native_1.View>

          <react_native_1.View style={styles.heroActions}>
            <react_native_1.TouchableOpacity style={[
            styles.actionBtn,
            { borderColor: palette.border, backgroundColor: palette.panelStrong, opacity: saving ? 0.7 : 1 },
        ]} onPress={refreshLocationState} disabled={saving || checking}>
              <vector_icons_1.Ionicons name="refresh" size={16} color={palette.text}/>
              <react_native_1.Text style={[styles.actionText, { color: palette.text }]}>{checking ? 'Checking…' : 'Refresh'}</react_native_1.Text>
            </react_native_1.TouchableOpacity>
            <react_native_1.TouchableOpacity style={[
            styles.actionBtn,
            { borderColor: palette.border, backgroundColor: palette.panelStrong, opacity: saving ? 0.7 : 1 },
        ]} onPress={lockNow} disabled={saving}>
              <vector_icons_1.Ionicons name="lock-closed-outline" size={16} color={palette.text}/>
              <react_native_1.Text style={[styles.actionText, { color: palette.text }]}>Lock</react_native_1.Text>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>
        </react_native_1.View>

        <react_native_1.View style={[styles.sectionCard, { backgroundColor: palette.panel, borderColor: palette.border }]}>
          <react_native_1.View style={styles.sectionHeader}>
            <react_native_1.View style={[styles.iconWrap, { backgroundColor: 'rgba(34,211,238,0.16)', borderColor: palette.border }]}>
              <vector_icons_1.Ionicons name="shield-checkmark-outline" size={18} color={palette.cyan}/>
            </react_native_1.View>
            <react_native_1.Text style={[styles.sectionTitle, { color: palette.text }]}>Security</react_native_1.Text>
          </react_native_1.View>

          <react_native_1.TouchableOpacity style={[styles.row, { borderColor: palette.border, backgroundColor: palette.panelStrong, opacity: saving ? 0.7 : 1 }]} onPress={onToggle} disabled={saving}>
            <vector_icons_1.Ionicons name="finger-print-outline" size={18} color={palette.muted}/>
            <react_native_1.View style={{ flex: 1, minWidth: 0 }}>
              <react_native_1.Text style={[styles.rowTitle, { color: palette.text }]}>Biometric login</react_native_1.Text>
              <react_native_1.Text style={[styles.rowSub, { color: palette.faint }]}>
                {biometricAvailable
            ? savedSessionAvailable
                ? 'Use Face ID / Touch ID / fingerprint to unlock.'
                : 'Sign in once with password to enable.'
            : 'Not supported on this device.'}
              </react_native_1.Text>
            </react_native_1.View>
            <react_native_1.View style={[styles.togglePill, { borderColor: palette.border, backgroundColor: biometricEnabled ? palette.indigo : 'transparent', opacity: biometricEnabled || canToggleOn ? 1 : 0.55 }]}>
              <vector_icons_1.Ionicons name={biometricEnabled ? 'checkmark' : 'close'} size={14} color={biometricEnabled ? '#ffffff' : palette.muted}/>
            </react_native_1.View>
          </react_native_1.TouchableOpacity>

          <react_native_1.TouchableOpacity style={[styles.row, { borderColor: palette.border, backgroundColor: palette.panelStrong, marginTop: 10, opacity: saving ? 0.7 : 1 }]} onPress={signOutFully} disabled={saving}>
            <vector_icons_1.Ionicons name="log-out-outline" size={18} color={palette.red}/>
            <react_native_1.View style={{ flex: 1, minWidth: 0 }}>
              <react_native_1.Text style={[styles.rowTitle, { color: palette.text }]}>Sign out (remove session)</react_native_1.Text>
              <react_native_1.Text style={[styles.rowSub, { color: palette.faint }]}>Clears saved login from this device.</react_native_1.Text>
            </react_native_1.View>
            <vector_icons_1.Ionicons name="chevron-forward" size={18} color={palette.faint2}/>
          </react_native_1.TouchableOpacity>

          <react_native_1.TouchableOpacity style={[styles.row, { borderColor: palette.border, backgroundColor: palette.panelStrong, marginTop: 10, opacity: saving ? 0.7 : 1 }]} onPress={openChangePassword} disabled={saving}>
            <vector_icons_1.Ionicons name="key-outline" size={18} color={palette.muted}/>
            <react_native_1.View style={{ flex: 1, minWidth: 0 }}>
              <react_native_1.Text style={[styles.rowTitle, { color: palette.text }]}>Change password</react_native_1.Text>
              <react_native_1.Text style={[styles.rowSub, { color: palette.faint }]}>Update your account password.</react_native_1.Text>
            </react_native_1.View>
            <vector_icons_1.Ionicons name="chevron-forward" size={18} color={palette.faint2}/>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>

        <react_native_1.View style={[styles.sectionCard, { backgroundColor: palette.panel, borderColor: palette.border }]}>
          <react_native_1.View style={styles.sectionHeader}>
            <react_native_1.View style={[styles.iconWrap, { backgroundColor: 'rgba(52,211,153,0.14)', borderColor: palette.border }]}>
              <vector_icons_1.Ionicons name="location-outline" size={18} color={palette.green}/>
            </react_native_1.View>
            <react_native_1.Text style={[styles.sectionTitle, { color: palette.text }]}>Location</react_native_1.Text>
          </react_native_1.View>

          <react_native_1.View style={styles.splitRow}>
            <react_native_1.View style={[styles.splitItem, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
              <react_native_1.Text style={[styles.splitLabel, { color: palette.muted }]}>Permission</react_native_1.Text>
              <react_native_1.Text style={[styles.splitValue, { color: palette.text }]}>
                {locationPermission === 'GRANTED' ? 'Granted' : locationPermission === 'DENIED' ? 'Denied' : 'Unknown'}
              </react_native_1.Text>
            </react_native_1.View>
            <react_native_1.View style={[styles.splitItem, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
              <react_native_1.Text style={[styles.splitLabel, { color: palette.muted }]}>Services</react_native_1.Text>
              <react_native_1.Text style={[styles.splitValue, { color: palette.text }]}>
                {locationServices === 'ON' ? 'On' : locationServices === 'OFF' ? 'Off' : 'Unknown'}
              </react_native_1.Text>
            </react_native_1.View>
          </react_native_1.View>

          <react_native_1.TouchableOpacity style={[styles.row, { borderColor: palette.border, backgroundColor: palette.panelStrong, marginTop: 10 }]} onPress={openLocationSettings}>
            <vector_icons_1.Ionicons name="settings-outline" size={18} color={palette.muted}/>
            <react_native_1.View style={{ flex: 1, minWidth: 0 }}>
              <react_native_1.Text style={[styles.rowTitle, { color: palette.text }]}>Open location settings</react_native_1.Text>
              <react_native_1.Text style={[styles.rowSub, { color: palette.faint }]}>Required for clock in, break, and resume.</react_native_1.Text>
            </react_native_1.View>
            <vector_icons_1.Ionicons name="chevron-forward" size={18} color={palette.faint2}/>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>

        <react_native_1.View style={[styles.sectionCard, { backgroundColor: palette.panel, borderColor: palette.border }]}>
          <react_native_1.View style={styles.sectionHeader}>
            <react_native_1.View style={[styles.iconWrap, { backgroundColor: 'rgba(251,191,36,0.14)', borderColor: palette.border }]}>
              <vector_icons_1.Ionicons name="notifications-outline" size={18} color={palette.amber}/>
            </react_native_1.View>
            <react_native_1.Text style={[styles.sectionTitle, { color: palette.text }]}>Notifications</react_native_1.Text>
          </react_native_1.View>

          <react_native_1.TouchableOpacity style={[styles.row, { borderColor: palette.border, backgroundColor: palette.panelStrong, opacity: saving ? 0.7 : 1 }]} onPress={enableNotifications} disabled={saving}>
            <vector_icons_1.Ionicons name="notifications-outline" size={18} color={palette.muted}/>
            <react_native_1.View style={{ flex: 1, minWidth: 0 }}>
              <react_native_1.Text style={[styles.rowTitle, { color: palette.text }]}>Enable notifications</react_native_1.Text>
              <react_native_1.Text style={[styles.rowSub, { color: palette.faint }]}>Shift reminders and schedule updates.</react_native_1.Text>
            </react_native_1.View>
            <react_native_1.Text style={[styles.smallStatus, { color: pushStatus === 'ENABLED' ? palette.green : palette.faint }]}>
              {pushStatus === 'ENABLED' ? 'On' : pushStatus === 'DISABLED' ? 'Off' : ' '}
            </react_native_1.Text>
          </react_native_1.TouchableOpacity>

          <react_native_1.TouchableOpacity style={[styles.row, { borderColor: palette.border, backgroundColor: palette.panelStrong, marginTop: 10 }]} onPress={openAppSettings}>
            <vector_icons_1.Ionicons name="options-outline" size={18} color={palette.muted}/>
            <react_native_1.View style={{ flex: 1, minWidth: 0 }}>
              <react_native_1.Text style={[styles.rowTitle, { color: palette.text }]}>Notification permissions</react_native_1.Text>
              <react_native_1.Text style={[styles.rowSub, { color: palette.faint }]}>Manage alerts in system settings.</react_native_1.Text>
            </react_native_1.View>
            <vector_icons_1.Ionicons name="chevron-forward" size={18} color={palette.faint2}/>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>

        <react_native_1.View style={[styles.sectionCard, { backgroundColor: palette.panel, borderColor: palette.border }]}>
          <react_native_1.View style={styles.sectionHeader}>
            <react_native_1.View style={[styles.iconWrap, { backgroundColor: 'rgba(251,113,133,0.12)', borderColor: palette.border }]}>
              <vector_icons_1.Ionicons name="information-circle-outline" size={18} color={palette.red}/>
            </react_native_1.View>
            <react_native_1.Text style={[styles.sectionTitle, { color: palette.text }]}>About</react_native_1.Text>
          </react_native_1.View>

          <react_native_1.View style={[styles.aboutRow, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
            <react_native_1.Text style={[styles.aboutLabel, { color: palette.muted }]}>Version</react_native_1.Text>
            <react_native_1.Text style={[styles.aboutValue, { color: palette.text }]}>{appVersion || ' '}</react_native_1.Text>
          </react_native_1.View>
          <react_native_1.View style={[styles.aboutRow, { borderColor: palette.border, backgroundColor: palette.panelStrong, marginTop: 10 }]}>
            <react_native_1.Text style={[styles.aboutLabel, { color: palette.muted }]}>Environment</react_native_1.Text>
            <react_native_1.Text style={[styles.aboutValue, { color: palette.text }]}>{(expo_constants_1.default === null || expo_constants_1.default === void 0 ? void 0 : expo_constants_1.default.appOwnership) || 'standalone'}</react_native_1.Text>
          </react_native_1.View>
        </react_native_1.View>
      </react_native_1.ScrollView>

      <react_native_1.Modal visible={showPasswordModal} animationType="slide" transparent>
        <react_native_1.View style={styles.modalOverlay}>
          <react_native_1.View style={[styles.modalContent, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <react_native_1.View style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
              <react_native_1.Text style={[styles.modalTitle, { color: palette.text }]}>Change password</react_native_1.Text>
              <react_native_1.TouchableOpacity onPress={() => setShowPasswordModal(false)} style={[styles.modalClose, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                <vector_icons_1.Ionicons name="close" size={18} color={palette.text}/>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>

            <react_native_1.View style={styles.modalBody}>
              <react_native_1.View style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                <vector_icons_1.Ionicons name="lock-closed-outline" size={18} color={palette.muted}/>
                <react_native_1.TextInput value={currentPassword} onChangeText={setCurrentPassword} placeholder="Current password" placeholderTextColor={palette.faint} secureTextEntry style={[styles.input, { color: palette.text }]}/>
              </react_native_1.View>
              <react_native_1.View style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                <vector_icons_1.Ionicons name="lock-open-outline" size={18} color={palette.muted}/>
                <react_native_1.TextInput value={newPassword} onChangeText={setNewPassword} placeholder="New password" placeholderTextColor={palette.faint} secureTextEntry style={[styles.input, { color: palette.text }]}/>
              </react_native_1.View>
              <react_native_1.View style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                <vector_icons_1.Ionicons name="checkmark-done-outline" size={18} color={palette.muted}/>
                <react_native_1.TextInput value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm new password" placeholderTextColor={palette.faint} secureTextEntry style={[styles.input, { color: palette.text }]}/>
              </react_native_1.View>

              <react_native_1.View style={styles.modalActions}>
                <react_native_1.TouchableOpacity style={[styles.secondaryBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong }]} onPress={() => setShowPasswordModal(false)} disabled={saving}>
                  <react_native_1.Text style={[styles.secondaryBtnText, { color: palette.text }]}>Cancel</react_native_1.Text>
                </react_native_1.TouchableOpacity>
                <react_native_1.TouchableOpacity style={[styles.primaryBtn, { backgroundColor: palette.indigo, opacity: saving ? 0.7 : 1 }]} onPress={submitPassword} disabled={saving}>
                  {saving ? <react_native_1.ActivityIndicator color="#ffffff"/> : <react_native_1.Text style={styles.primaryBtnText}>Update</react_native_1.Text>}
                </react_native_1.TouchableOpacity>
              </react_native_1.View>
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
    content: {
        paddingHorizontal: 18,
        paddingTop: 18,
        paddingBottom: 28,
        gap: 14,
    },
    header: {
        marginBottom: 6,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -0.3,
    },
    subtitle: {
        marginTop: 6,
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.9,
        textTransform: 'uppercase',
    },
    hero: {
        borderRadius: 24,
        borderWidth: 1,
        padding: 14,
    },
    heroTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 18,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 1.0,
    },
    heroName: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: -0.2,
    },
    heroMeta: {
        marginTop: 4,
        fontSize: 12,
        fontWeight: '700',
    },
    heroBadges: {
        marginTop: 10,
        flexDirection: 'row',
        gap: 10,
        flexWrap: 'wrap',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: 1,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 0.2,
    },
    heroActions: {
        marginTop: 12,
        flexDirection: 'row',
        gap: 10,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 44,
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 12,
    },
    actionText: {
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 0.2,
    },
    sectionCard: {
        borderRadius: 24,
        borderWidth: 1,
        padding: 14,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
    },
    iconWrap: {
        width: 38,
        height: 38,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderRadius: 18,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    rowTitle: {
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 0.2,
    },
    rowSub: {
        marginTop: 4,
        fontSize: 12,
        fontWeight: '600',
        lineHeight: 16,
    },
    togglePill: {
        width: 44,
        height: 30,
        borderRadius: 999,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    splitRow: {
        flexDirection: 'row',
        gap: 10,
        flexWrap: 'wrap',
    },
    splitItem: {
        flexGrow: 1,
        flexBasis: 150,
        borderWidth: 1,
        borderRadius: 18,
        padding: 12,
    },
    splitLabel: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    splitValue: {
        marginTop: 8,
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: -0.2,
    },
    smallStatus: {
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 0.2,
    },
    aboutRow: {
        borderWidth: 1,
        borderRadius: 18,
        paddingHorizontal: 12,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    aboutLabel: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    aboutValue: {
        fontSize: 12,
        fontWeight: '900',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '80%',
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
        gap: 12,
    },
    field: {
        height: 52,
        borderRadius: 18,
        borderWidth: 1,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    input: {
        flex: 1,
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 4,
    },
    secondaryBtn: {
        flex: 1,
        height: 50,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
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
});
