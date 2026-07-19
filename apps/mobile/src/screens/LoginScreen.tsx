import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PRIVACY_POLICY_URL } from '../services/api';

export default function LoginScreen() {
  const { signIn, biometricAvailable, biometricEnabled, biometricSessionAvailable, biometricSignIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [enableBiometric, setEnableBiometric] = useState(biometricEnabled);
  const [usePassword, setUsePassword] = useState(false);
  const [autoBioAttempted, setAutoBioAttempted] = useState(false);

  const palette = useMemo(
    () => ({
      bg: '#050816',
      panel: 'rgba(255,255,255,0.08)',
      panelStrong: 'rgba(255,255,255,0.11)',
      border: 'rgba(255,255,255,0.14)',
      text: '#E8EEF9',
      muted: 'rgba(232,238,249,0.70)',
      faint: 'rgba(232,238,249,0.48)',
      indigo: '#4F46E5',
      cyan: '#22D3EE',
    }),
    []
  );

  useEffect(() => {
    if (!biometricSessionAvailable) return;
    if (!biometricEnabled) return;
    if (usePassword) return;
    if (autoBioAttempted) return;
    setAutoBioAttempted(true);
    (async () => {
      try {
        setLoading(true);
        await biometricSignIn();
      } catch {
      } finally {
        setLoading(false);
      }
    })();
  }, [autoBioAttempted, biometricEnabled, biometricSessionAvailable, biometricSignIn, usePassword]);

  async function handleSignIn() {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      await signIn(email, password, { enableBiometric });
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.message || 'Invalid credentials or server error';
      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  }

  async function openPrivacyPolicy() {
    try {
      await Linking.openURL(PRIVACY_POLICY_URL);
    } catch {
      Alert.alert('Privacy Policy', 'Unable to open the privacy policy right now.');
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.bg }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.bgGlowWrap} pointerEvents="none">
        <View style={[styles.bgGlow, { backgroundColor: palette.indigo, top: -160, left: -160, opacity: 0.22 }]} />
        <View style={[styles.bgGlow, { backgroundColor: palette.cyan, bottom: -170, right: -170, opacity: 0.18 }]} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brandRow}>
            <View style={[styles.brandIcon, { borderColor: palette.border, backgroundColor: palette.panel }]}>
              <Ionicons name="shield-checkmark" size={22} color={palette.cyan as any} />
            </View>
            <View style={styles.brandText}>
              <Text style={[styles.brandName, { color: palette.text }]}>United Link Security</Text>
              <Text style={[styles.brandSub, { color: palette.muted }]}>Mobile Workforce • Secure Access</Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: palette.panel, borderColor: palette.border }]}>
            <Text style={[styles.cardTitle, { color: palette.text }]}>Sign in</Text>
            <Text style={[styles.cardSubtitle, { color: palette.muted }]}>
              Use your official email to access your schedule and time clock.
            </Text>

            {biometricSessionAvailable ? (
              <>
                {!usePassword ? (
                  <TouchableOpacity
                    style={[styles.bioBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong, opacity: loading ? 0.7 : 1 }]}
                    onPress={async () => {
                      try {
                        setLoading(true);
                        await biometricSignIn();
                      } catch (e: any) {
                        Alert.alert('Biometric login', String(e?.message || 'Unable to sign in with biometrics'));
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                  >
                    <Ionicons name="finger-print-outline" size={18} color={palette.cyan as any} />
                    <Text style={[styles.bioBtnText, { color: palette.text }]}>Sign in with biometrics</Text>
                  </TouchableOpacity>
                ) : null}

                {!usePassword ? (
                  <TouchableOpacity
                    style={[styles.usePasswordBtn, { borderColor: palette.border, backgroundColor: 'transparent', opacity: loading ? 0.7 : 1 }]}
                    onPress={() => setUsePassword(true)}
                    disabled={loading}
                  >
                    <Text style={[styles.usePasswordText, { color: palette.muted }]}>Use password instead</Text>
                  </TouchableOpacity>
                ) : null}
              </>
            ) : null}

            {biometricSessionAvailable && !usePassword ? null : (
            <View style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
              <Ionicons name="mail-outline" size={18} color={palette.muted as any} />
              <TextInput
                style={[styles.input, { color: palette.text }]}
                placeholder="Official email address"
                placeholderTextColor={palette.faint}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                textContentType="username"
              />
            </View>
            )}

            {biometricSessionAvailable && !usePassword ? null : (
            <View style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
              <Ionicons name="lock-closed-outline" size={18} color={palette.muted as any} />
              <TextInput
                style={[styles.input, { color: palette.text }]}
                placeholder="Password"
                placeholderTextColor={palette.faint}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword((v) => !v)}
                disabled={loading}
              >
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={palette.muted as any} />
              </TouchableOpacity>
            </View>
            )}

            {biometricAvailable && !biometricSessionAvailable ? (
              <TouchableOpacity
                style={[styles.toggleRow, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
                onPress={() => setEnableBiometric((v) => !v)}
                disabled={loading}
              >
                <Ionicons name="scan-outline" size={18} color={palette.muted as any} />
                <Text style={[styles.toggleText, { color: palette.text }]}>Enable biometric login</Text>
                <View style={[styles.togglePill, { borderColor: palette.border, backgroundColor: enableBiometric ? palette.indigo : 'transparent' }]}>
                  <Ionicons name={enableBiometric ? 'checkmark' : 'close'} size={14} color={enableBiometric ? '#ffffff' : (palette.muted as any)} />
                </View>
              </TouchableOpacity>
            ) : null}

            {biometricSessionAvailable && !usePassword ? null : (
              <TouchableOpacity
                style={[styles.button, { backgroundColor: palette.indigo, opacity: loading ? 0.75 : 1 }]}
                onPress={handleSignIn}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Continue</Text>}
              </TouchableOpacity>
            )}

            <Text style={[styles.footerText, { color: palette.faint }]}>
              By continuing, you agree to use this system for authorized business purposes only.
            </Text>
            <TouchableOpacity onPress={openPrivacyPolicy} disabled={loading} style={styles.footerLinkWrap}>
              <Text style={[styles.footerLink, { color: palette.cyan }]}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomPad} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  footerLinkWrap: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  footerLink: {
    fontSize: 12,
    fontWeight: '800',
  },
  bottomPad: {
    height: 18,
  },
});
