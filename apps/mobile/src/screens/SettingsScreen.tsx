import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import * as IntentLauncher from 'expo-intent-launcher';
import Constants from 'expo-constants';
import { registerExpoPush } from '../services/push';
import api from '../services/api';

export default function SettingsScreen() {
  const { user, signOut, clearSavedSession, biometricAvailable, biometricEnabled, savedSessionAvailable, setBiometricPreference } = useAuth();
  const navigation = useNavigation<any>();
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [locationPermission, setLocationPermission] = useState<'UNKNOWN' | 'GRANTED' | 'DENIED'>('UNKNOWN');
  const [locationServices, setLocationServices] = useState<'UNKNOWN' | 'ON' | 'OFF'>('UNKNOWN');
  const [pushStatus, setPushStatus] = useState<'UNKNOWN' | 'ENABLED' | 'DISABLED'>('UNKNOWN');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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

  const canToggleOn = biometricAvailable && savedSessionAvailable;

  const openAppSettings = async () => {
    try {
      await Linking.openSettings();
    } catch {
      try {
        await Linking.openURL('app-settings:');
      } catch {}
    }
  };

  const openLocationSettings = async () => {
    try {
      if (Platform.OS === 'android') {
        await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS);
        return;
      }
      await openAppSettings();
    } catch {
      await openAppSettings();
    }
  };

  const refreshLocationState = useCallback(async () => {
    try {
      setChecking(true);
      const perm = await Location.getForegroundPermissionsAsync();
      setLocationPermission(perm?.granted ? 'GRANTED' : 'DENIED');
      const enabled = await Location.hasServicesEnabledAsync();
      setLocationServices(enabled ? 'ON' : 'OFF');
    } catch {
      setLocationPermission('UNKNOWN');
      setLocationServices('UNKNOWN');
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    refreshLocationState();
  }, [refreshLocationState]);

  const enableNotifications = async () => {
    if (saving) return;
    try {
      setSaving(true);
      const token = await registerExpoPush();
      setPushStatus(token ? 'ENABLED' : 'DISABLED');
      if (!token) {
        Alert.alert('Notifications', 'Notifications permission was not granted or push is unavailable in this environment.');
      }
    } catch (e: any) {
      setPushStatus('DISABLED');
      Alert.alert('Notifications', String(e?.message || 'Unable to enable notifications'));
    } finally {
      setSaving(false);
    }
  };

  const onToggle = async () => {
    if (saving) return;
    const next = !biometricEnabled;

    if (next && !biometricAvailable) {
      Alert.alert('Biometric login', 'Biometric authentication is not available on this device.');
      return;
    }

    if (next && !savedSessionAvailable) {
      Alert.alert('Biometric login', 'Sign in once with password before enabling biometric login.');
      return;
    }

    try {
      setSaving(true);
      await setBiometricPreference(next);
    } catch (e: any) {
      Alert.alert('Biometric login', String(e?.message || 'Unable to update biometric preference'));
    } finally {
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
    if (saving) return;
    const cur = currentPassword;
    const next = newPassword;
    const confirm = confirmPassword;
    if (!cur || !next) {
      Alert.alert('Change password', 'Enter current password and new password.');
      return;
    }
    if (next.length < 8) {
      Alert.alert('Change password', 'New password must be at least 8 characters.');
      return;
    }
    if (next !== confirm) {
      Alert.alert('Change password', 'New password and confirmation do not match.');
      return;
    }
    try {
      setSaving(true);
      await api.patch('/employees/me/password', { currentPassword: cur, newPassword: next });
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Change password', 'Password updated.');
    } catch (e: any) {
      Alert.alert('Change password', String(e?.response?.data?.message || e?.message || 'Unable to update password'));
    } finally {
      setSaving(false);
    }
  };

  const lockNow = async () => {
    try {
      await signOut();
    } catch (e: any) {
      Alert.alert('Lock', String(e?.message || 'Unable to lock the app'));
    }
  };

  const signOutFully = async () => {
    Alert.alert('Sign out', 'This will remove your saved session from this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try {
            setSaving(true);
            await clearSavedSession();
          } catch (e: any) {
            Alert.alert('Sign out', String(e?.message || 'Unable to sign out'));
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  const initials = useMemo(() => {
    const first = String(user?.firstName || '').trim();
    const last = String(user?.lastName || '').trim();
    const a = first ? first[0] : 'U';
    const b = last ? last[0] : '';
    return `${a}${b}`.toUpperCase();
  }, [user?.firstName, user?.lastName]);

  const locationBadge = useMemo(() => {
    if (locationPermission === 'UNKNOWN' || locationServices === 'UNKNOWN') return { label: 'Checking', color: palette.faint };
    if (locationPermission !== 'GRANTED') return { label: 'Blocked', color: palette.red };
    if (locationServices !== 'ON') return { label: 'Off', color: palette.amber };
    return { label: 'Ready', color: palette.green };
  }, [locationPermission, locationServices, palette.amber, palette.faint, palette.green, palette.red]);

  const appVersion = useMemo(() => {
    const v = (Constants as any)?.expoConfig?.version || (Constants as any)?.manifest?.version || '';
    const build = (Constants as any)?.expoConfig?.ios?.buildNumber || (Constants as any)?.expoConfig?.android?.versionCode || '';
    return [v, build ? `(${build})` : ''].filter(Boolean).join(' ');
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.bg }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.bgGlowWrap} pointerEvents="none">
        <View style={[styles.bgGlow, { backgroundColor: palette.indigo, top: -160, left: -160, opacity: 0.22 }]} />
        <View style={[styles.bgGlow, { backgroundColor: palette.cyan, bottom: -180, right: -180, opacity: 0.16 }]} />
        <View style={[styles.bgGlow, { backgroundColor: palette.green, top: 180, right: -210, opacity: 0.10 }]} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              style={[styles.backBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="chevron-back" size={18} color={palette.text as any} />
            </TouchableOpacity>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.title, { color: palette.text }]}>Settings</Text>
              <Text style={[styles.subtitle, { color: palette.muted }]}>Security & preferences</Text>
            </View>
          </View>
        </View>

        <View style={[styles.hero, { backgroundColor: palette.panel, borderColor: palette.border }]}>
          <View style={styles.heroTopRow}>
            <View style={[styles.avatar, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
              <Text style={[styles.avatarText, { color: palette.text }]}>{initials}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.heroName, { color: palette.text }]} numberOfLines={1}>
                {user?.firstName ? `${user.firstName} ${user?.lastName || ''}`.trim() : 'Account'}
              </Text>
              <Text style={[styles.heroMeta, { color: palette.muted }]} numberOfLines={1}>
                {user?.email || ' '}
              </Text>
              <View style={styles.heroBadges}>
                <View style={[styles.badge, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                  <Ionicons name="location-outline" size={14} color={locationBadge.color as any} />
                  <Text style={[styles.badgeText, { color: palette.text }]}>{locationBadge.label}</Text>
                </View>
                <View style={[styles.badge, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                  <Ionicons name="scan-outline" size={14} color={(biometricEnabled ? palette.cyan : palette.faint) as any} />
                  <Text style={[styles.badgeText, { color: palette.text }]}>{biometricEnabled ? 'Biometric' : 'Password'}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.heroActions}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                { borderColor: palette.border, backgroundColor: palette.panelStrong, opacity: saving ? 0.7 : 1 },
              ]}
              onPress={refreshLocationState}
              disabled={saving || checking}
            >
              <Ionicons name="refresh" size={16} color={palette.text as any} />
              <Text style={[styles.actionText, { color: palette.text }]}>{checking ? 'Checking…' : 'Refresh'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                { borderColor: palette.border, backgroundColor: palette.panelStrong, opacity: saving ? 0.7 : 1 },
              ]}
              onPress={lockNow}
              disabled={saving}
            >
              <Ionicons name="lock-closed-outline" size={16} color={palette.text as any} />
              <Text style={[styles.actionText, { color: palette.text }]}>Lock</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: palette.panel, borderColor: palette.border }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconWrap, { backgroundColor: 'rgba(34,211,238,0.16)', borderColor: palette.border }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={palette.cyan as any} />
            </View>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Security</Text>
          </View>

          <TouchableOpacity
            style={[styles.row, { borderColor: palette.border, backgroundColor: palette.panelStrong, opacity: saving ? 0.7 : 1 }]}
            onPress={onToggle}
            disabled={saving}
          >
            <Ionicons name="finger-print-outline" size={18} color={palette.muted as any} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.rowTitle, { color: palette.text }]}>Biometric login</Text>
              <Text style={[styles.rowSub, { color: palette.faint }]}>
                {biometricAvailable
                  ? savedSessionAvailable
                    ? 'Use Face ID / Touch ID / fingerprint to unlock.'
                    : 'Sign in once with password to enable.'
                  : 'Not supported on this device.'}
              </Text>
            </View>
            <View style={[styles.togglePill, { borderColor: palette.border, backgroundColor: biometricEnabled ? palette.indigo : 'transparent', opacity: biometricEnabled || canToggleOn ? 1 : 0.55 }]}>
              <Ionicons name={biometricEnabled ? 'checkmark' : 'close'} size={14} color={biometricEnabled ? '#ffffff' : (palette.muted as any)} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.row, { borderColor: palette.border, backgroundColor: palette.panelStrong, marginTop: 10, opacity: saving ? 0.7 : 1 }]}
            onPress={signOutFully}
            disabled={saving}
          >
            <Ionicons name="log-out-outline" size={18} color={palette.red as any} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.rowTitle, { color: palette.text }]}>Sign out (remove session)</Text>
              <Text style={[styles.rowSub, { color: palette.faint }]}>Clears saved login from this device.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.faint2 as any} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.row, { borderColor: palette.border, backgroundColor: palette.panelStrong, marginTop: 10, opacity: saving ? 0.7 : 1 }]}
            onPress={openChangePassword}
            disabled={saving}
          >
            <Ionicons name="key-outline" size={18} color={palette.muted as any} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.rowTitle, { color: palette.text }]}>Change password</Text>
              <Text style={[styles.rowSub, { color: palette.faint }]}>Update your account password.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.faint2 as any} />
          </TouchableOpacity>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: palette.panel, borderColor: palette.border }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconWrap, { backgroundColor: 'rgba(52,211,153,0.14)', borderColor: palette.border }]}>
              <Ionicons name="location-outline" size={18} color={palette.green as any} />
            </View>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Location</Text>
          </View>

          <View style={styles.splitRow}>
            <View style={[styles.splitItem, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
              <Text style={[styles.splitLabel, { color: palette.muted }]}>Permission</Text>
              <Text style={[styles.splitValue, { color: palette.text }]}>
                {locationPermission === 'GRANTED' ? 'Granted' : locationPermission === 'DENIED' ? 'Denied' : 'Unknown'}
              </Text>
            </View>
            <View style={[styles.splitItem, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
              <Text style={[styles.splitLabel, { color: palette.muted }]}>Services</Text>
              <Text style={[styles.splitValue, { color: palette.text }]}>
                {locationServices === 'ON' ? 'On' : locationServices === 'OFF' ? 'Off' : 'Unknown'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.row, { borderColor: palette.border, backgroundColor: palette.panelStrong, marginTop: 10 }]}
            onPress={openLocationSettings}
          >
            <Ionicons name="settings-outline" size={18} color={palette.muted as any} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.rowTitle, { color: palette.text }]}>Open location settings</Text>
              <Text style={[styles.rowSub, { color: palette.faint }]}>Required for clock in, break, and resume.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.faint2 as any} />
          </TouchableOpacity>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: palette.panel, borderColor: palette.border }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconWrap, { backgroundColor: 'rgba(251,191,36,0.14)', borderColor: palette.border }]}>
              <Ionicons name="notifications-outline" size={18} color={palette.amber as any} />
            </View>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Notifications</Text>
          </View>

          <TouchableOpacity
            style={[styles.row, { borderColor: palette.border, backgroundColor: palette.panelStrong, opacity: saving ? 0.7 : 1 }]}
            onPress={enableNotifications}
            disabled={saving}
          >
            <Ionicons name="notifications-outline" size={18} color={palette.muted as any} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.rowTitle, { color: palette.text }]}>Enable notifications</Text>
              <Text style={[styles.rowSub, { color: palette.faint }]}>Shift reminders and schedule updates.</Text>
            </View>
            <Text style={[styles.smallStatus, { color: pushStatus === 'ENABLED' ? palette.green : palette.faint }]}>
              {pushStatus === 'ENABLED' ? 'On' : pushStatus === 'DISABLED' ? 'Off' : ' '}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.row, { borderColor: palette.border, backgroundColor: palette.panelStrong, marginTop: 10 }]}
            onPress={openAppSettings}
          >
            <Ionicons name="options-outline" size={18} color={palette.muted as any} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.rowTitle, { color: palette.text }]}>Notification permissions</Text>
              <Text style={[styles.rowSub, { color: palette.faint }]}>Manage alerts in system settings.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.faint2 as any} />
          </TouchableOpacity>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: palette.panel, borderColor: palette.border }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconWrap, { backgroundColor: 'rgba(251,113,133,0.12)', borderColor: palette.border }]}>
              <Ionicons name="information-circle-outline" size={18} color={palette.red as any} />
            </View>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>About</Text>
          </View>

          <View style={[styles.aboutRow, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
            <Text style={[styles.aboutLabel, { color: palette.muted }]}>Version</Text>
            <Text style={[styles.aboutValue, { color: palette.text }]}>{appVersion || ' '}</Text>
          </View>
          <View style={[styles.aboutRow, { borderColor: palette.border, backgroundColor: palette.panelStrong, marginTop: 10 }]}>
            <Text style={[styles.aboutLabel, { color: palette.muted }]}>Environment</Text>
            <Text style={[styles.aboutValue, { color: palette.text }]}>{(Constants as any)?.appOwnership || 'standalone'}</Text>
          </View>
        </View>
      </ScrollView>

      <Modal visible={showPasswordModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
              <Text style={[styles.modalTitle, { color: palette.text }]}>Change password</Text>
              <TouchableOpacity
                onPress={() => setShowPasswordModal(false)}
                style={[styles.modalClose, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
              >
                <Ionicons name="close" size={18} color={palette.text as any} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                <Ionicons name="lock-closed-outline" size={18} color={palette.muted as any} />
                <TextInput
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Current password"
                  placeholderTextColor={palette.faint}
                  secureTextEntry
                  style={[styles.input, { color: palette.text }]}
                />
              </View>
              <View style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                <Ionicons name="lock-open-outline" size={18} color={palette.muted as any} />
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="New password"
                  placeholderTextColor={palette.faint}
                  secureTextEntry
                  style={[styles.input, { color: palette.text }]}
                />
              </View>
              <View style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                <Ionicons name="checkmark-done-outline" size={18} color={palette.muted as any} />
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor={palette.faint}
                  secureTextEntry
                  style={[styles.input, { color: palette.text }]}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.secondaryBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
                  onPress={() => setShowPasswordModal(false)}
                  disabled={saving}
                >
                  <Text style={[styles.secondaryBtnText, { color: palette.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: palette.indigo, opacity: saving ? 0.7 : 1 }]}
                  onPress={submitPassword}
                  disabled={saving}
                >
                  {saving ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryBtnText}>Update</Text>}
                </TouchableOpacity>
              </View>
            </View>
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
