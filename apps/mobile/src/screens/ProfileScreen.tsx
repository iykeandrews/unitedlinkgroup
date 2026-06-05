import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Modal, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { navigate } from '../navigation/NavigationService';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function ProfileScreen() {
  const { user, designation, signOut, clearSavedSession, biometricAvailable, biometricEnabled, savedSessionAvailable } = useAuth();
  const [checking, setChecking] = useState(false);
  const [locationPermission, setLocationPermission] = useState<'UNKNOWN' | 'GRANTED' | 'DENIED'>('UNKNOWN');
  const [locationServices, setLocationServices] = useState<'UNKNOWN' | 'ON' | 'OFF'>('UNKNOWN');
  const [employee, setEmployee] = useState<any | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [qualifications, setQualifications] = useState<any[]>([]);
  const [qualLoading, setQualLoading] = useState(false);
  const [showQualModal, setShowQualModal] = useState(false);
  const [editingQualId, setEditingQualId] = useState<string | null>(null);
  const [qualName, setQualName] = useState('');
  const [qualType, setQualType] = useState<'CERTIFICATION' | 'LICENSE'>('CERTIFICATION');
  const [issuingOrganization, setIssuingOrganization] = useState('');
  const [credentialId, setCredentialId] = useState('');
  const [issueDate, setIssueDate] = useState<Date | null>(null);
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [qualFileUrl, setQualFileUrl] = useState<string | null>(null);
  const [qualFileName, setQualFileName] = useState<string | null>(null);
  const [savingQual, setSavingQual] = useState(false);
  const [showQualView, setShowQualView] = useState(false);
  const [viewQualName, setViewQualName] = useState<string>('');
  const [viewQualType, setViewQualType] = useState<'CERTIFICATION' | 'LICENSE'>('CERTIFICATION');
  const [viewQualFileUrl, setViewQualFileUrl] = useState<string | null>(null);
  const [viewQualFileName, setViewQualFileName] = useState<string | null>(null);
  const [showQualList, setShowQualList] = useState(false);
  const [showBioModal, setShowBioModal] = useState(false);
  const [bioPronouns, setBioPronouns] = useState('');
  const [bioPhone, setBioPhone] = useState('');
  const [bioAddress, setBioAddress] = useState('');
  const [bioCity, setBioCity] = useState('');
  const [bioState, setBioState] = useState('');
  const [bioZip, setBioZip] = useState('');
  const [bioCountry, setBioCountry] = useState('');
  const [bioDob, setBioDob] = useState<Date | null>(null);
  const [bioEmergencyName, setBioEmergencyName] = useState('');
  const [bioEmergencyPhone, setBioEmergencyPhone] = useState('');
  const [savingBio, setSavingBio] = useState(false);
  const [datePickerKind, setDatePickerKind] = useState<'ISSUE' | 'EXPIRY' | 'DOB' | null>(null);
  const [datePickerValue, setDatePickerValue] = useState<Date>(new Date());

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t = await AsyncStorage.getItem('token');
      if (!cancelled) setAuthToken(t);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const getAuthedUrl = useCallback(
    (path: string) => {
      const base = String((api.defaults as any).baseURL || '').replace(/\/$/, '');
      const p = String(path || '');
      const url = p.startsWith('http') ? p : `${base}${p.startsWith('/') ? '' : '/'}${p}`;
      if (!authToken) return url;
      const sep = url.includes('?') ? '&' : '?';
      return `${url}${sep}token=${encodeURIComponent(authToken)}`;
    },
    [authToken]
  );

  const fetchEmployee = useCallback(async () => {
    try {
      const res = await api.get('/employees/me');
      setEmployee(res.data);
    } catch {
      setEmployee(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchEmployee();
    }, [fetchEmployee])
  );

  const fetchQualifications = useCallback(async () => {
    try {
      setQualLoading(true);
      const res = await api.get('/employees/me/qualifications');
      const list = (res.data || []).filter((q: any) => ['CERTIFICATION', 'LICENSE'].includes(String(q?.type || '').toUpperCase()));
      setQualifications(list);
    } catch {
      setQualifications([]);
    } finally {
      setQualLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchQualifications();
    }, [fetchQualifications])
  );

  const name = useMemo(() => {
    const first = String(employee?.firstName || user?.firstName || '').trim();
    const last = String(employee?.lastName || user?.lastName || '').trim();
    const full = `${first} ${last}`.trim();
    return full || 'User';
  }, [employee?.firstName, employee?.lastName, user?.firstName, user?.lastName]);

  const initials = useMemo(() => {
    const parts = name.split(' ').filter(Boolean);
    const a = parts[0]?.[0] || 'U';
    const b = parts[1]?.[0] || '';
    return `${a}${b}`.toUpperCase();
  }, [name]);

  const qualSorted = useMemo(() => {
    const list = (qualifications || []).slice();
    list.sort((a: any, b: any) => {
      const ad = a?.expiryDate ? new Date(a.expiryDate).getTime() : 0;
      const bd = b?.expiryDate ? new Date(b.expiryDate).getTime() : 0;
      if (ad && bd) return ad - bd;
      if (ad) return -1;
      if (bd) return 1;
      return String(a?.name || '').localeCompare(String(b?.name || ''));
    });
    return list;
  }, [qualifications]);

  const appVersion = useMemo(() => {
    const v = (Constants as any)?.expoConfig?.version || (Constants as any)?.manifest?.version || '';
    const build = (Constants as any)?.expoConfig?.ios?.buildNumber || (Constants as any)?.expoConfig?.android?.versionCode || '';
    return [v, build ? `(${build})` : ''].filter(Boolean).join(' ');
  }, []);

  const profileImageUrl = employee?.profileImageUrl ? getAuthedUrl(employee.profileImageUrl) : null;
  const openQualView = useCallback(
    (input: { name?: string; type?: string; fileUrl?: string | null; fileName?: string | null }) => {
      const fileUrl = input.fileUrl ? String(input.fileUrl) : '';
      if (!fileUrl) return;
      setViewQualName(String(input.name || 'Document'));
      setViewQualType(String(input.type || 'CERTIFICATION').toUpperCase() === 'LICENSE' ? 'LICENSE' : 'CERTIFICATION');
      setViewQualFileUrl(fileUrl);
      setViewQualFileName(input.fileName ? String(input.fileName) : null);
      setShowQualView(true);
    },
    []
  );

  const updateProfilePhoto = async () => {
    if (savingProfile) return;
    try {
      setSavingProfile(true);
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Profile photo', 'Photo permission is required to pick an image.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: true,
        aspect: [1, 1],
        selectionLimit: 1,
      });
      if (res.canceled) return;
      const asset = res.assets?.[0];
      if (!asset?.uri) return;

      const mimeType = String((asset as any).mimeType || 'image/jpeg');
      const fileName = String((asset as any).fileName || `profile-${Date.now()}.jpg`);

      const form = new FormData();
      form.append('file', { uri: asset.uri, name: fileName, type: mimeType } as any);

      const up = await api.post('/uploads/images', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = up.data?.url;
      if (!url) {
        Alert.alert('Profile photo', 'Upload failed.');
        return;
      }
      await api.patch('/employees/me/profile-image', { url });
      await fetchEmployee();
      Alert.alert('Profile photo', 'Updated.');
    } catch (e: any) {
      Alert.alert('Profile photo', String(e?.response?.data?.message || e?.message || 'Unable to update photo'));
    } finally {
      setSavingProfile(false);
    }
  };

  const hydrateBioForm = useCallback(() => {
    const e = employee || {};
    setBioPronouns(String(e.pronouns || ''));
    setBioPhone(String(e.phone || ''));
    setBioAddress(String(e.address || ''));
    setBioCity(String(e.city || ''));
    setBioState(String(e.state || ''));
    setBioZip(String(e.zip || ''));
    setBioCountry(String(e.country || ''));
    setBioDob(e.dateOfBirth ? new Date(e.dateOfBirth) : null);
    setBioEmergencyName(String(e.emergencyContactName || ''));
    setBioEmergencyPhone(String(e.emergencyContactPhone || ''));
  }, [employee]);

  const openBioModal = () => {
    hydrateBioForm();
    setShowBioModal(true);
  };

  const openDobPicker = () => {
    setDatePickerValue(bioDob || new Date());
    setDatePickerKind('DOB');
  };

  const saveBio = async () => {
    if (savingBio) return;
    try {
      setSavingBio(true);
      await api.patch('/employees/me/bio', {
        pronouns: bioPronouns.trim() || null,
        phone: bioPhone.trim() || null,
        address: bioAddress.trim() || null,
        city: bioCity.trim() || null,
        state: bioState.trim() || null,
        zip: bioZip.trim() || null,
        country: bioCountry.trim() || null,
        dateOfBirth: bioDob ? bioDob.toISOString() : null,
        emergencyContactName: bioEmergencyName.trim() || null,
        emergencyContactPhone: bioEmergencyPhone.trim() || null,
      });
      setShowBioModal(false);
      await fetchEmployee();
      Alert.alert('Bio data', 'Updated.');
    } catch (e: any) {
      Alert.alert('Bio data', String(e?.response?.data?.message || e?.message || 'Unable to update'));
    } finally {
      setSavingBio(false);
    }
  };

  const resetQualForm = () => {
    setEditingQualId(null);
    setQualName('');
    setQualType('CERTIFICATION');
    setIssuingOrganization('');
    setCredentialId('');
    setIssueDate(null);
    setExpiryDate(null);
    setQualFileUrl(null);
    setQualFileName(null);
  };

  const openAddQualification = () => {
    resetQualForm();
    setShowQualModal(true);
  };

  const openEditQualification = (q: any) => {
    setEditingQualId(String(q?.id || ''));
    setQualName(String(q?.name || ''));
    setQualType(String(q?.type || 'CERTIFICATION').toUpperCase() === 'LICENSE' ? 'LICENSE' : 'CERTIFICATION');
    setIssuingOrganization(String(q?.issuingOrganization || ''));
    setCredentialId(String(q?.credentialId || ''));
    setIssueDate(q?.issueDate ? new Date(q.issueDate) : null);
    setExpiryDate(q?.expiryDate ? new Date(q.expiryDate) : null);
    setQualFileUrl(q?.fileUrl ? String(q.fileUrl) : null);
    setQualFileName(q?.fileUrl ? String(q.fileUrl).split('/').pop() || null : null);
    setShowQualModal(true);
  };

  const openDate = (kind: 'ISSUE' | 'EXPIRY') => {
    const current = kind === 'ISSUE' ? issueDate : expiryDate;
    setDatePickerValue(current || new Date());
    setDatePickerKind(kind);
  };

  const uploadQualificationFile = async (file: { uri: string; name: string; mimeType: string }) => {
    const form = new FormData();
    form.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as any);
    const isImage = file.mimeType.startsWith('image/');
    const endpoint = isImage ? '/uploads/images' : '/uploads';
    const res = await api.post(endpoint, form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return String(res.data?.url || '');
  };

  const pickQualPhoto = async () => {
    if (savingQual) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Upload', 'Photo permission is required.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: false,
      selectionLimit: 1,
    });
    if (res.canceled) return;
    const asset = res.assets?.[0];
    if (!asset?.uri) return;
    const mimeType = String((asset as any).mimeType || 'image/jpeg');
    const fileName = String((asset as any).fileName || `qualification-${Date.now()}.jpg`);
    try {
      setSavingQual(true);
      const url = await uploadQualificationFile({ uri: asset.uri, name: fileName, mimeType });
      if (!url) throw new Error('Upload failed');
      setQualFileUrl(url);
      setQualFileName(fileName);
    } catch (e: any) {
      Alert.alert('Upload', String(e?.response?.data?.message || e?.message || 'Unable to upload'));
    } finally {
      setSavingQual(false);
    }
  };

  const pickQualFile = async () => {
    if (savingQual) return;
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
    if (res.canceled) return;
    const file = res.assets?.[0];
    if (!file?.uri) return;
    const mimeType = String(file.mimeType || 'application/octet-stream');
    const name = String(file.name || `qualification-${Date.now()}`);
    try {
      setSavingQual(true);
      const url = await uploadQualificationFile({ uri: file.uri, name, mimeType });
      if (!url) throw new Error('Upload failed');
      setQualFileUrl(url);
      setQualFileName(name);
    } catch (e: any) {
      Alert.alert('Upload', String(e?.response?.data?.message || e?.message || 'Unable to upload'));
    } finally {
      setSavingQual(false);
    }
  };

  const saveQualification = async () => {
    if (savingQual) return;
    const name = qualName.trim();
    if (!name) {
      Alert.alert('Qualification', 'Name is required.');
      return;
    }
    try {
      setSavingQual(true);
      const payload: any = {
        name,
        type: qualType,
        issuingOrganization: issuingOrganization.trim() || undefined,
        credentialId: credentialId.trim() || undefined,
        issueDate: issueDate ? issueDate.toISOString() : undefined,
        expiryDate: expiryDate ? expiryDate.toISOString() : undefined,
        fileUrl: qualFileUrl || undefined,
      };
      if (editingQualId) {
        await api.patch(`/employees/me/qualifications/${editingQualId}`, payload);
      } else {
        await api.post('/employees/me/qualifications', payload);
      }
      setShowQualModal(false);
      resetQualForm();
      await fetchQualifications();
      Alert.alert('Qualification', 'Saved.');
    } catch (e: any) {
      Alert.alert('Qualification', String(e?.response?.data?.message || e?.message || 'Unable to save'));
    } finally {
      setSavingQual(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.bg }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.bgGlowWrap} pointerEvents="none">
        <View style={[styles.bgGlow, { backgroundColor: palette.indigo, top: -160, left: -160, opacity: 0.22 }]} />
        <View style={[styles.bgGlow, { backgroundColor: palette.cyan, bottom: -170, right: -170, opacity: 0.18 }]} />
        <View style={[styles.bgGlow, { backgroundColor: palette.green, top: 220, right: -210, opacity: 0.10 }]} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: palette.text }]}>Profile</Text>
          <TouchableOpacity
            style={[styles.headerBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
            onPress={() => navigate('Settings')}
          >
            <Ionicons name="settings-outline" size={18} color={palette.text as any} />
          </TouchableOpacity>
        </View>

        <View style={[styles.hero, { backgroundColor: palette.panel, borderColor: palette.border }]}>
          <View style={styles.heroTopRow}>
            <TouchableOpacity
              style={[styles.avatar, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
              onPress={updateProfilePhoto}
              disabled={savingProfile}
              activeOpacity={0.85}
            >
              {profileImageUrl ? (
                <Image source={{ uri: profileImageUrl }} style={styles.avatarImg} />
              ) : (
                <Text style={[styles.avatarText, { color: palette.text }]}>{initials}</Text>
              )}
              <View style={[styles.avatarEdit, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                {savingProfile ? (
                  <ActivityIndicator size="small" color={palette.cyan as any} />
                ) : (
                  <Ionicons name="camera-outline" size={16} color={palette.text as any} />
                )}
              </View>
            </TouchableOpacity>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.name, { color: palette.text }]} numberOfLines={1}>
                {name}
              </Text>
              <Text style={[styles.email, { color: palette.muted }]} numberOfLines={1}>
                {user?.email || ' '}
              </Text>
              <View style={[styles.rolePill, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                <Ionicons name="briefcase-outline" size={14} color={palette.cyan as any} />
                <Text style={[styles.roleText, { color: palette.text }]}>{designation || 'User'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.heroActions}>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
              onPress={() => navigate('Availability')}
            >
              <Ionicons name="time-outline" size={16} color={palette.text as any} />
              <Text style={[styles.actionText, { color: palette.text }]}>Availability</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
              onPress={refreshLocationState}
              disabled={checking}
            >
              <Ionicons name="refresh" size={16} color={palette.text as any} />
              <Text style={[styles.actionText, { color: palette.text }]}>{checking ? 'Checking…' : 'Refresh'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: palette.panel, borderColor: palette.border }]}>
          <View style={styles.sectionHeaderWrap}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.iconWrap, { backgroundColor: 'rgba(34,211,238,0.16)', borderColor: palette.border }]}>
                <Ionicons name="ribbon-outline" size={18} color={palette.cyan as any} />
              </View>
              <View style={styles.sectionTitleWrap}>
                <Text style={[styles.sectionTitle, { color: palette.text }]} numberOfLines={2}>
                  Certifications &{'\n'}Licenses
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.smallBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
                onPress={() => setShowQualList(true)}
                disabled={qualLoading || qualSorted.length === 0}
              >
                <Ionicons
                  name="eye-outline"
                  size={18}
                  color={(qualLoading || qualSorted.length === 0 ? palette.faint2 : palette.text) as any}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.smallBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
                onPress={openAddQualification}
              >
                <Ionicons name="add" size={18} color={palette.text as any} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.row, { borderColor: palette.border, backgroundColor: palette.panelStrong, opacity: qualLoading ? 0.75 : 1 }]}>
            <Ionicons name="folder-outline" size={18} color={palette.muted as any} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.rowTitle, { color: palette.text }]}>
                {qualLoading ? 'Loading documents…' : `${qualSorted.length} document${qualSorted.length === 1 ? '' : 's'} uploaded`}
              </Text>
              <Text style={[styles.rowSub, { color: palette.faint }]}>Tap the eye icon to view the list.</Text>
            </View>
            {qualLoading ? <ActivityIndicator color={palette.cyan as any} /> : null}
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: palette.panel, borderColor: palette.border }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconWrap, { backgroundColor: 'rgba(79,70,229,0.18)', borderColor: palette.border }]}>
              <Ionicons name="id-card-outline" size={18} color={palette.indigo as any} />
            </View>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Bio data</Text>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              style={[styles.smallBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
              onPress={openBioModal}
            >
              <Ionicons name="create-outline" size={18} color={palette.text as any} />
            </TouchableOpacity>
          </View>

          <View style={[styles.row, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
            <Ionicons name="information-circle-outline" size={18} color={palette.muted as any} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.rowTitle, { color: palette.text }]}>Tap edit to update your bio data</Text>
              <Text style={[styles.rowSub, { color: palette.faint }]}>Phone, address, DOB, emergency contact, and more.</Text>
            </View>
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: palette.panel, borderColor: palette.border }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconWrap, { backgroundColor: 'rgba(251,113,133,0.12)', borderColor: palette.border }]}>
              <Ionicons name="shield-outline" size={18} color={palette.red as any} />
            </View>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Account</Text>
          </View>

          <TouchableOpacity
            style={[styles.row, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
            onPress={async () => {
              try {
                await signOut();
              } catch (e: any) {
                Alert.alert('Lock', String(e?.message || 'Unable to lock the app'));
              }
            }}
          >
            <Ionicons name="lock-closed-outline" size={18} color={palette.cyan as any} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.rowTitle, { color: palette.text }]}>Lock app</Text>
              <Text style={[styles.rowSub, { color: palette.faint }]}>
                {biometricEnabled ? 'Unlock with biometrics.' : 'Return to login screen.'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.faint2 as any} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.row, { borderColor: palette.border, backgroundColor: palette.panelStrong, marginTop: 10 }]}
            onPress={() => {
              Alert.alert('Sign out', 'This will remove your saved session from this device.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Sign out',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await clearSavedSession();
                    } catch (e: any) {
                      Alert.alert('Sign out', String(e?.message || 'Unable to sign out'));
                    }
                  },
                },
              ]);
            }}
          >
            <Ionicons name="log-out-outline" size={18} color={palette.red as any} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.rowTitle, { color: palette.text }]}>Sign out (remove session)</Text>
              <Text style={[styles.rowSub, { color: palette.faint }]}>Clears token and biometric setting.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.faint2 as any} />
          </TouchableOpacity>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: palette.panel, borderColor: palette.border }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconWrap, { backgroundColor: 'rgba(251,191,36,0.14)', borderColor: palette.border }]}>
              <Ionicons name="information-circle-outline" size={18} color={palette.amber as any} />
            </View>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>About</Text>
          </View>

          <View style={[styles.aboutRow, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
            <Text style={[styles.aboutLabel, { color: palette.muted }]}>Version</Text>
            <Text style={[styles.aboutValue, { color: palette.text }]}>{appVersion || ' '}</Text>
          </View>
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>

      <Modal visible={showQualModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
              <Text style={[styles.modalTitle, { color: palette.text }]}>{editingQualId ? 'Update' : 'Add'} qualification</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowQualModal(false);
                  resetQualForm();
                }}
                style={[styles.modalClose, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
              >
                <Ionicons name="close" size={18} color={palette.text as any} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <View style={styles.twoCol}>
                <TouchableOpacity
                  style={[
                    styles.pillChoice,
                    { borderColor: palette.border, backgroundColor: qualType === 'CERTIFICATION' ? palette.indigo : palette.panelStrong },
                  ]}
                  onPress={() => setQualType('CERTIFICATION')}
                >
                  <Text style={[styles.pillChoiceText, { color: '#ffffff' }]}>Certification</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.pillChoice,
                    { borderColor: palette.border, backgroundColor: qualType === 'LICENSE' ? palette.indigo : palette.panelStrong },
                  ]}
                  onPress={() => setQualType('LICENSE')}
                >
                  <Text style={[styles.pillChoiceText, { color: '#ffffff' }]}>License</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                <Ionicons name="text-outline" size={18} color={palette.muted as any} />
                <TextInput
                  value={qualName}
                  onChangeText={setQualName}
                  placeholder="Name"
                  placeholderTextColor={palette.faint}
                  style={[styles.input, { color: palette.text }]}
                />
              </View>

              <View style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                <Ionicons name="business-outline" size={18} color={palette.muted as any} />
                <TextInput
                  value={issuingOrganization}
                  onChangeText={setIssuingOrganization}
                  placeholder="Issuing organization (optional)"
                  placeholderTextColor={palette.faint}
                  style={[styles.input, { color: palette.text }]}
                />
              </View>

              <View style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                <Ionicons name="pricetag-outline" size={18} color={palette.muted as any} />
                <TextInput
                  value={credentialId}
                  onChangeText={setCredentialId}
                  placeholder="Credential ID (optional)"
                  placeholderTextColor={palette.faint}
                  style={[styles.input, { color: palette.text }]}
                />
              </View>

              <View style={styles.twoCol}>
                <TouchableOpacity
                  style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
                  onPress={() => openDate('ISSUE')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="calendar-outline" size={18} color={palette.muted as any} />
                  <Text style={[styles.input, { color: issueDate ? palette.text : palette.faint }]} numberOfLines={1}>
                    {issueDate ? issueDate.toLocaleDateString() : 'Issue date'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={palette.faint2 as any} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
                  onPress={() => openDate('EXPIRY')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="calendar-clear-outline" size={18} color={palette.muted as any} />
                  <Text style={[styles.input, { color: expiryDate ? palette.text : palette.faint }]} numberOfLines={1}>
                    {expiryDate ? expiryDate.toLocaleDateString() : 'Expiry date'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={palette.faint2 as any} />
                </TouchableOpacity>
              </View>

              <View style={styles.twoCol}>
                <TouchableOpacity
                  style={[styles.secondaryBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong, opacity: savingQual ? 0.7 : 1 }]}
                  onPress={pickQualPhoto}
                  disabled={savingQual}
                >
                  <Ionicons name="image-outline" size={16} color={palette.text as any} />
                  <Text style={[styles.secondaryBtnText, { color: palette.text }]}>Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.secondaryBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong, opacity: savingQual ? 0.7 : 1 }]}
                  onPress={pickQualFile}
                  disabled={savingQual}
                >
                  <Ionicons name="document-outline" size={16} color={palette.text as any} />
                  <Text style={[styles.secondaryBtnText, { color: palette.text }]}>File</Text>
                </TouchableOpacity>
              </View>

              {qualFileUrl ? (
                <View style={styles.twoCol}>
                  <TouchableOpacity
                    style={[styles.secondaryBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
                    onPress={() => openQualView({ name: qualName, type: qualType, fileUrl: qualFileUrl, fileName: qualFileName })}
                  >
                    <Ionicons name="eye-outline" size={16} color={palette.text as any} />
                    <Text style={[styles.secondaryBtnText, { color: palette.text }]}>View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.secondaryBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
                    onPress={() => {
                      setQualFileUrl(null);
                      setQualFileName(null);
                    }}
                  >
                    <Ionicons name="trash-outline" size={16} color={palette.red as any} />
                    <Text style={[styles.secondaryBtnText, { color: palette.text }]}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.secondaryBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
                  onPress={() => {
                    setShowQualModal(false);
                    resetQualForm();
                  }}
                  disabled={savingQual}
                >
                  <Text style={[styles.secondaryBtnText, { color: palette.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: palette.indigo, opacity: savingQual ? 0.7 : 1 }]}
                  onPress={saveQualification}
                  disabled={savingQual}
                >
                  {savingQual ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryBtnText}>Save</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showBioModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
              <Text style={[styles.modalTitle, { color: palette.text }]}>Update bio data</Text>
              <TouchableOpacity
                onPress={() => setShowBioModal(false)}
                style={[styles.modalClose, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
              >
                <Ionicons name="close" size={18} color={palette.text as any} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <View style={styles.twoCol}>
                <View style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color={palette.muted as any} />
                  <TextInput value={bioPronouns} onChangeText={setBioPronouns} placeholder="Pronouns (optional)" placeholderTextColor={palette.faint} style={[styles.input, { color: palette.text }]} />
                </View>
                <TouchableOpacity
                  style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
                  onPress={openDobPicker}
                  activeOpacity={0.85}
                >
                  <Ionicons name="calendar-outline" size={18} color={palette.muted as any} />
                  <Text style={[styles.input, { color: bioDob ? palette.text : palette.faint }]} numberOfLines={1}>
                    {bioDob ? bioDob.toLocaleDateString() : 'Date of birth (optional)'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={palette.faint2 as any} />
                </TouchableOpacity>
              </View>

              <View style={styles.twoCol}>
                <View style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                  <Ionicons name="call-outline" size={18} color={palette.muted as any} />
                  <TextInput value={bioPhone} onChangeText={setBioPhone} placeholder="Phone (optional)" placeholderTextColor={palette.faint} style={[styles.input, { color: palette.text }]} keyboardType="phone-pad" />
                </View>
                <View style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong, opacity: 0.65 }]}>
                  <Ionicons name="mail-outline" size={18} color={palette.muted as any} />
                  <Text style={[styles.input, { color: palette.faint }]} numberOfLines={1}>
                    Official email is managed by admin
                  </Text>
                </View>
              </View>

              <View style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                <Ionicons name="location-outline" size={18} color={palette.muted as any} />
                <TextInput value={bioAddress} onChangeText={setBioAddress} placeholder="Address (optional)" placeholderTextColor={palette.faint} style={[styles.input, { color: palette.text }]} />
              </View>

              <View style={styles.twoCol}>
                <View style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                  <Ionicons name="navigate-outline" size={18} color={palette.muted as any} />
                  <TextInput value={bioCity} onChangeText={setBioCity} placeholder="City (optional)" placeholderTextColor={palette.faint} style={[styles.input, { color: palette.text }]} />
                </View>
                <View style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                  <Ionicons name="map-outline" size={18} color={palette.muted as any} />
                  <TextInput value={bioState} onChangeText={setBioState} placeholder="State (optional)" placeholderTextColor={palette.faint} style={[styles.input, { color: palette.text }]} />
                </View>
              </View>

              <View style={styles.twoCol}>
                <View style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                  <Ionicons name="pin-outline" size={18} color={palette.muted as any} />
                  <TextInput value={bioZip} onChangeText={setBioZip} placeholder="Zip (optional)" placeholderTextColor={palette.faint} style={[styles.input, { color: palette.text }]} />
                </View>
                <View style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                  <Ionicons name="earth-outline" size={18} color={palette.muted as any} />
                  <TextInput value={bioCountry} onChangeText={setBioCountry} placeholder="Country (optional)" placeholderTextColor={palette.faint} style={[styles.input, { color: palette.text }]} />
                </View>
              </View>

              <View style={styles.twoCol}>
                <View style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                  <Ionicons name="person-add-outline" size={18} color={palette.muted as any} />
                  <TextInput value={bioEmergencyName} onChangeText={setBioEmergencyName} placeholder="Emergency contact name (optional)" placeholderTextColor={palette.faint} style={[styles.input, { color: palette.text }]} />
                </View>
                <View style={[styles.field, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                  <Ionicons name="call-outline" size={18} color={palette.muted as any} />
                  <TextInput value={bioEmergencyPhone} onChangeText={setBioEmergencyPhone} placeholder="Emergency contact phone (optional)" placeholderTextColor={palette.faint} style={[styles.input, { color: palette.text }]} keyboardType="phone-pad" />
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.secondaryBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
                  onPress={() => setShowBioModal(false)}
                  disabled={savingBio}
                >
                  <Text style={[styles.secondaryBtnText, { color: palette.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: palette.indigo, opacity: savingBio ? 0.7 : 1 }]}
                  onPress={saveBio}
                  disabled={savingBio}
                >
                  {savingBio ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryBtnText}>Save</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showQualView} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
              <Text style={[styles.modalTitle, { color: palette.text }]} numberOfLines={1}>
                {viewQualType === 'LICENSE' ? 'License document' : 'Certification document'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowQualView(false);
                  setViewQualFileUrl(null);
                  setViewQualFileName(null);
                }}
                style={[styles.modalClose, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
              >
                <Ionicons name="close" size={18} color={palette.text as any} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.viewDocTitle, { color: palette.text }]} numberOfLines={2}>
                {viewQualName || 'Document'}
              </Text>

              {viewQualFileUrl ? (() => {
                const url = getAuthedUrl(viewQualFileUrl);
                const lower = (viewQualFileName || viewQualFileUrl).toLowerCase();
                const isImage = ['.png', '.jpg', '.jpeg', '.webp'].some((ext) => lower.endsWith(ext));
                if (isImage) {
                  return (
                    <TouchableOpacity activeOpacity={0.9} onPress={() => Linking.openURL(url)}>
                      <Image source={{ uri: url }} style={[styles.docPreview, { borderColor: palette.border }]} />
                    </TouchableOpacity>
                  );
                }
                return (
                  <TouchableOpacity
                    style={[styles.fileRow, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
                    onPress={() => Linking.openURL(url)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="document-outline" size={18} color={palette.cyan as any} />
                    <Text style={[styles.fileText, { color: palette.text }]} numberOfLines={1}>
                      {viewQualFileName || 'Open document'}
                    </Text>
                    <Ionicons name="open-outline" size={18} color={palette.text as any} />
                  </TouchableOpacity>
                );
              })() : null}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showQualList} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
              <Text style={[styles.modalTitle, { color: palette.text }]}>Documents</Text>
              <TouchableOpacity
                onPress={() => setShowQualList(false)}
                style={[styles.modalClose, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
              >
                <Ionicons name="close" size={18} color={palette.text as any} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              {qualSorted.length === 0 ? (
                <View style={[styles.row, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                  <Ionicons name="cloud-upload-outline" size={18} color={palette.muted as any} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.rowTitle, { color: palette.text }]}>No documents yet</Text>
                    <Text style={[styles.rowSub, { color: palette.faint }]}>Use the + button to add one.</Text>
                  </View>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {qualSorted.map((q: any) => {
                    const type = String(q.type || '').toUpperCase();
                    const exp = q.expiryDate ? new Date(q.expiryDate) : null;
                    const expLabel = exp ? exp.toLocaleDateString() : 'No expiry';
                    const status = String(q.status || 'ACTIVE').toUpperCase();
                    const badgeColor = status === 'EXPIRED' ? palette.red : status === 'ACTIVE' ? palette.green : palette.amber;
                    const fileUrl = q?.fileUrl ? String(q.fileUrl) : '';
                    const fileName = fileUrl ? fileUrl.split('/').pop() || null : null;
                    return (
                      <TouchableOpacity
                        key={q.id}
                        style={[styles.row, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
                        onPress={() => openEditQualification(q)}
                      >
                        <Ionicons name={type === 'LICENSE' ? 'card-outline' : 'ribbon-outline'} size={18} color={palette.muted as any} />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[styles.rowTitle, { color: palette.text }]} numberOfLines={1}>
                            {q.name}
                          </Text>
                          <Text style={[styles.rowSub, { color: palette.faint }]} numberOfLines={1}>
                            {type} • {expLabel}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.iconBtn, { borderColor: palette.border, backgroundColor: palette.panel }]}
                          onPress={(e) => {
                            e?.stopPropagation?.();
                            openQualView({ name: q?.name, type: q?.type, fileUrl: fileUrl || null, fileName });
                          }}
                          disabled={!fileUrl}
                          activeOpacity={0.85}
                        >
                          <Ionicons name="eye-outline" size={18} color={(fileUrl ? palette.text : palette.faint2) as any} />
                        </TouchableOpacity>
                        <View style={[styles.statusPill, { borderColor: palette.border, backgroundColor: palette.panel }]}>
                          <View style={[styles.dot, { backgroundColor: badgeColor }]} />
                          <Text style={[styles.statusText, { color: palette.text }]}>{status}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={datePickerKind !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
              <Text style={[styles.modalTitle, { color: palette.text }]}>
                {datePickerKind === 'ISSUE' ? 'Select issue date' : datePickerKind === 'EXPIRY' ? 'Select expiry date' : 'Select date of birth'}
              </Text>
              <TouchableOpacity
                onPress={() => setDatePickerKind(null)}
                style={[styles.modalClose, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
              >
                <Ionicons name="close" size={18} color={palette.text as any} />
              </TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 18, paddingVertical: 14 }}>
              <DateTimePicker
                value={datePickerValue}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event: any, selectedDate?: Date) => {
                  if (Platform.OS === 'android') {
                    if (event?.type === 'dismissed') {
                      setDatePickerKind(null);
                      return;
                    }
                    if (event?.type === 'set' && selectedDate && datePickerKind) {
                      if (datePickerKind === 'ISSUE') setIssueDate(selectedDate);
                      else if (datePickerKind === 'EXPIRY') setExpiryDate(selectedDate);
                      else setBioDob(selectedDate);
                      setDatePickerKind(null);
                    }
                    return;
                  }
                  if (selectedDate) setDatePickerValue(selectedDate);
                }}
              />
              {Platform.OS === 'ios' ? (
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  <TouchableOpacity
                    style={[styles.secondaryBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
                    onPress={() => setDatePickerKind(null)}
                  >
                    <Text style={[styles.secondaryBtnText, { color: palette.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: palette.indigo }]}
                    onPress={() => {
                      if (datePickerKind === 'ISSUE') setIssueDate(datePickerValue);
                      else if (datePickerKind === 'EXPIRY') setExpiryDate(datePickerValue);
                      else setBioDob(datePickerValue);
                      setDatePickerKind(null);
                    }}
                  >
                    <Text style={styles.primaryBtnText}>Done</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarEdit: {
    position: 'absolute',
    right: -6,
    bottom: -6,
    width: 30,
    height: 30,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.0,
  },
  name: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  email: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
  },
  rolePill: {
    marginTop: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  badgeRow: {
    marginTop: 12,
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
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  heroActions: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
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
  sectionHeaderWrap: {
    gap: 10,
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  sectionTitleWrap: {
    flex: 1,
    minWidth: 0,
    paddingTop: 2,
  },
  sectionHeaderActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  smallBtn: {
    width: 42,
    height: 42,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 10,
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
  statusPill: {
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 11,
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
    maxHeight: '85%',
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
  twoCol: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  pillChoice: {
    flex: 1,
    height: 42,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillChoiceText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
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
  input: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
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
    paddingHorizontal: 12,
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
  fileRow: {
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fileText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  viewDocTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.2,
    marginBottom: 10,
  },
  docPreview: {
    width: '100%',
    height: 220,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
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
  bottomPad: {
    height: 8,
  },
});
