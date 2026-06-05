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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LocationRequirement;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const Location = __importStar(require("expo-location"));
const IntentLauncher = __importStar(require("expo-intent-launcher"));
const AuthContext_1 = require("../context/AuthContext");
function LocationRequirement({ children }) {
    const { user } = (0, AuthContext_1.useAuth)();
    const [state, setState] = (0, react_1.useState)({ kind: 'checking' });
    const isEmployee = (0, react_1.useMemo)(() => {
        const role = String((user === null || user === void 0 ? void 0 : user.role) || '').toUpperCase();
        return !!user && role === 'EMPLOYEE';
    }, [user]);
    const openSettings = async () => {
        try {
            if (react_native_1.Platform.OS === 'android') {
                await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS);
                return;
            }
            await react_native_1.Linking.openSettings();
        }
        catch {
            try {
                await react_native_1.Linking.openURL('app-settings:');
            }
            catch { }
        }
    };
    const checkLocation = (0, react_1.useCallback)(async (opts) => {
        if (!isEmployee) {
            setState({ kind: 'ready' });
            return;
        }
        try {
            const perm = (opts === null || opts === void 0 ? void 0 : opts.requestPermission)
                ? await Location.requestForegroundPermissionsAsync()
                : await Location.getForegroundPermissionsAsync();
            if (!(perm === null || perm === void 0 ? void 0 : perm.granted)) {
                setState({
                    kind: 'blocked',
                    title: 'Turn on Location Access',
                    message: 'Location permission is required to clock in. Please allow location access to continue.',
                    primaryLabel: 'Allow Location',
                    primaryAction: 'REQUEST_PERMISSION',
                });
                return;
            }
            const servicesEnabled = await Location.hasServicesEnabledAsync();
            if (!servicesEnabled) {
                setState({
                    kind: 'blocked',
                    title: 'Enable Location Services',
                    message: 'Location services are turned off. Enable your phone location to clock in.',
                    primaryLabel: 'Enable Location',
                    primaryAction: 'OPEN_SETTINGS',
                });
                return;
            }
            setState({ kind: 'ready' });
        }
        catch {
            setState({
                kind: 'blocked',
                title: 'Location Required',
                message: 'We could not verify your location settings. Please enable location access to clock in.',
                primaryLabel: 'Open Settings',
                primaryAction: 'OPEN_SETTINGS',
            });
        }
    }, [isEmployee]);
    (0, react_1.useEffect)(() => {
        checkLocation();
    }, [checkLocation]);
    (0, react_1.useEffect)(() => {
        const sub = react_native_1.AppState.addEventListener('change', (next) => {
            if (next === 'active')
                checkLocation();
        });
        return () => sub.remove();
    }, [checkLocation]);
    if (state.kind === 'ready')
        return <>{children}</>;
    const title = state.kind === 'blocked' ? state.title : 'Checking location…';
    const message = state.kind === 'blocked'
        ? state.message
        : 'Verifying that location access is enabled for secure clock-ins.';
    const primaryLabel = state.kind === 'blocked' ? state.primaryLabel : 'Checking…';
    const primaryDisabled = state.kind !== 'blocked';
    return (<react_native_1.View style={styles.wrap}>
      <react_native_1.View style={styles.glow}/>
      <react_native_1.View style={styles.card}>
        <react_native_1.Text style={styles.title}>{title}</react_native_1.Text>
        <react_native_1.Text style={styles.message}>{message}</react_native_1.Text>

        <react_native_1.TouchableOpacity disabled={primaryDisabled} onPress={async () => {
            if (state.kind !== 'blocked')
                return;
            if (state.primaryAction === 'REQUEST_PERMISSION') {
                await checkLocation({ requestPermission: true });
                return;
            }
            await openSettings();
        }} style={[styles.primaryBtn, primaryDisabled ? styles.primaryBtnDisabled : null]}>
          <react_native_1.Text style={styles.primaryBtnText}>{primaryLabel}</react_native_1.Text>
        </react_native_1.TouchableOpacity>

        {state.kind === 'blocked' ? (<react_native_1.TouchableOpacity onPress={() => checkLocation()} style={styles.secondaryBtn}>
            <react_native_1.Text style={styles.secondaryBtnText}>I already enabled it</react_native_1.Text>
          </react_native_1.TouchableOpacity>) : null}
      </react_native_1.View>
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    wrap: {
        flex: 1,
        backgroundColor: '#050816',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
    },
    glow: {
        position: 'absolute',
        width: 360,
        height: 360,
        borderRadius: 240,
        backgroundColor: '#22D3EE',
        opacity: 0.18,
    },
    card: {
        width: '100%',
        maxWidth: 460,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
        backgroundColor: 'rgba(255,255,255,0.08)',
        padding: 18,
    },
    title: {
        fontSize: 18,
        fontWeight: '900',
        color: '#E8EEF9',
        letterSpacing: -0.2,
        marginBottom: 10,
    },
    message: {
        fontSize: 13,
        fontWeight: '600',
        color: 'rgba(232,238,249,0.72)',
        lineHeight: 18,
        marginBottom: 16,
    },
    primaryBtn: {
        height: 46,
        borderRadius: 16,
        backgroundColor: '#4F46E5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryBtnDisabled: {
        opacity: 0.6,
    },
    primaryBtnText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 0.2,
    },
    secondaryBtn: {
        marginTop: 12,
        height: 42,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryBtnText: {
        color: '#E8EEF9',
        fontSize: 13,
        fontWeight: '800',
    },
});
