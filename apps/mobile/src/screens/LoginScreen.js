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
exports.default = LoginScreen;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const AuthContext_1 = require("../context/AuthContext");
const vector_icons_1 = require("@expo/vector-icons");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
function LoginScreen() {
    const { signIn, biometricAvailable, biometricEnabled, biometricSessionAvailable, biometricSignIn } = (0, AuthContext_1.useAuth)();
    const [email, setEmail] = (0, react_1.useState)('');
    const [password, setPassword] = (0, react_1.useState)('');
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [showPassword, setShowPassword] = (0, react_1.useState)(false);
    const [enableBiometric, setEnableBiometric] = (0, react_1.useState)(biometricEnabled);
    const [usePassword, setUsePassword] = (0, react_1.useState)(false);
    const [autoBioAttempted, setAutoBioAttempted] = (0, react_1.useState)(false);
    const palette = (0, react_1.useMemo)(() => ({
        bg: '#050816',
        panel: 'rgba(255,255,255,0.08)',
        panelStrong: 'rgba(255,255,255,0.11)',
        border: 'rgba(255,255,255,0.14)',
        text: '#E8EEF9',
        muted: 'rgba(232,238,249,0.70)',
        faint: 'rgba(232,238,249,0.48)',
        indigo: '#4F46E5',
        cyan: '#22D3EE',
    }), []);
    (0, react_1.useEffect)(() => {
        if (!biometricSessionAvailable)
            return;
        if (!biometricEnabled)
            return;
        if (usePassword)
            return;
        if (autoBioAttempted)
            return;
        setAutoBioAttempted(true);
        (async () => {
            try {
                setLoading(true);
                await biometricSignIn();
            }
            catch {
            }
            finally {
                setLoading(false);
            }
        })();
    }, [autoBioAttempted, biometricEnabled, biometricSessionAvailable, biometricSignIn, usePassword]);
    async function handleSignIn() {
        var _a, _b;
        if (!email || !password) {
            react_native_1.Alert.alert('Error', 'Please fill in all fields');
            return;
        }
        try {
            setLoading(true);
            await signIn(email, password, { enableBiometric });
        }
        catch (error) {
            console.error(error);
            const message = ((_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Invalid credentials or server error';
            react_native_1.Alert.alert('Login Failed', message);
        }
        finally {
            setLoading(false);
        }
    }
    return (<react_native_safe_area_context_1.SafeAreaView style={[styles.container, { backgroundColor: palette.bg }]}>
      <react_native_1.StatusBar barStyle="light-content"/>
      <react_native_1.View style={styles.bgGlowWrap} pointerEvents="none">
        <react_native_1.View style={[styles.bgGlow, { backgroundColor: palette.indigo, top: -160, left: -160, opacity: 0.22 }]}/>
        <react_native_1.View style={[styles.bgGlow, { backgroundColor: palette.cyan, bottom: -170, right: -170, opacity: 0.18 }]}/>
      </react_native_1.View>

      <react_native_1.KeyboardAvoidingView style={styles.flex} behavior={react_native_1.Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={react_native_1.Platform.OS === 'ios' ? 10 : 0}>
        <react_native_1.ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <react_native_1.View style={styles.brandRow}>
            <react_native_1.View style={[styles.brandIcon, { borderColor: palette.border, backgroundColor: palette.panel }]}>
              <vector_icons_1.Ionicons name="shield-checkmark" size={22} color={palette.cyan}/>
            </react_native_1.View>
            <react_native_1.View style={styles.brandText}>
              <react_native_1.Text style={[styles.brandName, { color: palette.text }]}>United Link Security</react_native_1.Text>
              <react_native_1.Text style={[styles.brandSub, { color: palette.muted }]}>Mobile Workforce • Secure Access</react_native_1.Text>
            </react_native_1.View>
          </react_native_1.View>

          <react_native_1.View style={[styles.card, { backgroundColor: palette.panel, borderColor: palette.border }]}>
            <react_native_1.Text style={[styles.cardTitle, { color: palette.text }]}>Sign in</react_native_1.Text>
            <react_native_1.Text style={[styles.cardSubtitle, { color: palette.muted }]}>
              Use your official email to access your schedule and time clock.
            </react_native_1.Text>

            {biometricSessionAvailable ? (<>
                {!usePassword ? (<react_native_1.TouchableOpacity style={[styles.bioBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong, opacity: loading ? 0.7 : 1 }]} onPress={async () => {
                    try {
                        setLoading(true);
                        await biometricSignIn();
                    }
                    catch (e) {
                        react_native_1.Alert.alert('Biometric login', String((e === null || e === void 0 ? void 0 : e.message) || 'Unable to sign in with biometrics'));
                    }
                    finally {
                        setLoading(false);
                    }
                }} disabled={loading}>
                    <vector_icons_1.Ionicons name="finger-print-outline" size={18} color={palette.cyan}/>
                    <react_native_1.Text style={[styles.bioBtnText, { color: palette.text }]}>Sign in with biometrics</react_native_1.Text>
                  </react_native_1.TouchableOpacity>) : null}

                {!usePassword ? (<react_native_1.TouchableOpacity style={[styles.usePasswordBtn, { borderColor: palette.border, backgroundColor: 'transparent', opacity: loading ? 0.7 : 1 }]} onPress={() => setUsePassword(true)} disabled={loading}>
                    <react_native_1.Text style={[styles.usePasswordText, { color: palette.muted }]}>Use password instead</react_native_1.Text>
                  </react_native_1.TouchableOpacity>) : null}
              </>) : null}

            {biometricSessionAvailable && !usePassword ? null : (<react_native_1.View style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
              <vector_icons_1.Ionicons name="mail-outline" size={18} color={palette.muted}/>
              <react_native_1.TextInput style={[styles.input, { color: palette.text }]} placeholder="Official email address" placeholderTextColor={palette.faint} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoCorrect={false} textContentType="username"/>
            </react_native_1.View>)}

            {biometricSessionAvailable && !usePassword ? null : (<react_native_1.View style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
              <vector_icons_1.Ionicons name="lock-closed-outline" size={18} color={palette.muted}/>
              <react_native_1.TextInput style={[styles.input, { color: palette.text }]} placeholder="Password" placeholderTextColor={palette.faint} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} textContentType="password"/>
              <react_native_1.TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword((v) => !v)} disabled={loading}>
                <vector_icons_1.Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={palette.muted}/>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>)}

            {biometricAvailable && !biometricSessionAvailable ? (<react_native_1.TouchableOpacity style={[styles.toggleRow, { borderColor: palette.border, backgroundColor: palette.panelStrong }]} onPress={() => setEnableBiometric((v) => !v)} disabled={loading}>
                <vector_icons_1.Ionicons name="scan-outline" size={18} color={palette.muted}/>
                <react_native_1.Text style={[styles.toggleText, { color: palette.text }]}>Enable biometric login</react_native_1.Text>
                <react_native_1.View style={[styles.togglePill, { borderColor: palette.border, backgroundColor: enableBiometric ? palette.indigo : 'transparent' }]}>
                  <vector_icons_1.Ionicons name={enableBiometric ? 'checkmark' : 'close'} size={14} color={enableBiometric ? '#ffffff' : palette.muted}/>
                </react_native_1.View>
              </react_native_1.TouchableOpacity>) : null}

            {biometricSessionAvailable && !usePassword ? null : (<react_native_1.TouchableOpacity style={[styles.button, { backgroundColor: palette.indigo, opacity: loading ? 0.75 : 1 }]} onPress={handleSignIn} disabled={loading}>
                {loading ? <react_native_1.ActivityIndicator color="#ffffff"/> : <react_native_1.Text style={styles.buttonText}>Continue</react_native_1.Text>}
              </react_native_1.TouchableOpacity>)}

            <react_native_1.Text style={[styles.footerText, { color: palette.faint }]}>
              By continuing, you agree to use this system for authorized business purposes only.
            </react_native_1.Text>
          </react_native_1.View>

          <react_native_1.View style={styles.bottomPad}/>
        </react_native_1.ScrollView>
      </react_native_1.KeyboardAvoidingView>
    </react_native_safe_area_context_1.SafeAreaView>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
    },
    flex: {
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
        paddingTop: 26,
        paddingBottom: 28,
        flexGrow: 1,
        justifyContent: 'center',
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 18,
    },
    brandIcon: {
        width: 46,
        height: 46,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    brandText: {
        flex: 1,
        minWidth: 0,
    },
    brandName: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: -0.2,
    },
    brandSub: {
        marginTop: 3,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.9,
        textTransform: 'uppercase',
    },
    card: {
        borderRadius: 22,
        borderWidth: 1,
        padding: 18,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: -0.3,
    },
    cardSubtitle: {
        marginTop: 8,
        fontSize: 13,
        fontWeight: '600',
        lineHeight: 18,
        marginBottom: 16,
    },
    field: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 12,
        height: 50,
        marginBottom: 12,
    },
    input: {
        flex: 1,
        height: 50,
        fontSize: 14,
        fontWeight: '700',
    },
    eyeBtn: {
        width: 34,
        height: 34,
        alignItems: 'center',
        justifyContent: 'center',
    },
    button: {
        height: 50,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 6,
    },
    buttonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 0.4,
    },
    bioBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        height: 48,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 14,
    },
    bioBtnText: {
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 0.2,
    },
    usePasswordBtn: {
        height: 40,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -6,
        marginBottom: 10,
    },
    usePasswordText: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        height: 48,
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 12,
        marginTop: 6,
        marginBottom: 10,
    },
    toggleText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    togglePill: {
        width: 40,
        height: 28,
        borderRadius: 999,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerText: {
        marginTop: 14,
        fontSize: 12,
        fontWeight: '600',
        lineHeight: 16,
    },
    bottomPad: {
        height: 18,
    },
});
