import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import * as IntentLauncher from 'expo-intent-launcher';
import { useAuth } from '../context/AuthContext';

type GateState =
  | { kind: 'checking' }
  | { kind: 'ready' }
  | { kind: 'blocked'; title: string; message: string; primaryLabel: string; primaryAction: 'REQUEST_PERMISSION' | 'OPEN_SETTINGS' };

export default function LocationRequirement({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<GateState>({ kind: 'checking' });

  const isEmployee = useMemo(() => {
    const role = String(user?.role || '').toUpperCase();
    return !!user && role === 'EMPLOYEE';
  }, [user]);

  const openSettings = async () => {
    try {
      if (Platform.OS === 'android') {
        await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS);
        return;
      }
      await Linking.openSettings();
    } catch {
      try {
        await Linking.openURL('app-settings:');
      } catch {}
    }
  };

  const checkLocation = useCallback(async (opts?: { requestPermission?: boolean }) => {
    if (!isEmployee) {
      setState({ kind: 'ready' });
      return;
    }

    try {
      const perm = opts?.requestPermission
        ? await Location.requestForegroundPermissionsAsync()
        : await Location.getForegroundPermissionsAsync();

      if (!perm?.granted) {
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
    } catch {
      setState({
        kind: 'blocked',
        title: 'Location Required',
        message: 'We could not verify your location settings. Please enable location access to clock in.',
        primaryLabel: 'Open Settings',
        primaryAction: 'OPEN_SETTINGS',
      });
    }
  }, [isEmployee]);

  useEffect(() => {
    checkLocation();
  }, [checkLocation]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') checkLocation();
    });
    return () => sub.remove();
  }, [checkLocation]);

  if (state.kind === 'ready') return <>{children}</>;

  const title = state.kind === 'blocked' ? state.title : 'Checking location…';
  const message =
    state.kind === 'blocked'
      ? state.message
      : 'Verifying that location access is enabled for secure clock-ins.';

  const primaryLabel = state.kind === 'blocked' ? state.primaryLabel : 'Checking…';
  const primaryDisabled = state.kind !== 'blocked';

  return (
    <View style={styles.wrap}>
      <View style={styles.glow} />
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>

        <TouchableOpacity
          disabled={primaryDisabled}
          onPress={async () => {
            if (state.kind !== 'blocked') return;
            if (state.primaryAction === 'REQUEST_PERMISSION') {
              await checkLocation({ requestPermission: true });
              return;
            }
            await openSettings();
          }}
          style={[styles.primaryBtn, primaryDisabled ? styles.primaryBtnDisabled : null]}
        >
          <Text style={styles.primaryBtnText}>{primaryLabel}</Text>
        </TouchableOpacity>

        {state.kind === 'blocked' ? (
          <TouchableOpacity onPress={() => checkLocation()} style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>I already enabled it</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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

