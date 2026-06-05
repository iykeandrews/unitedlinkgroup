import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';

type IncidentType = 'GENERAL' | 'THEFT' | 'INJURY' | 'SECURITY' | 'DAMAGE';
type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

const palette = {
  bg: '#050816',
  panel: '#0B1224',
  panelStrong: '#101B35',
  border: 'rgba(255,255,255,0.14)',
  text: '#E8EEF9',
  muted: 'rgba(232,238,249,0.66)',
  faint: 'rgba(232,238,249,0.40)',
  indigo: '#4F46E5',
  cyan: '#22D3EE',
  danger: '#FB7185',
};

function normalizeApiError(err: any, fallback: string) {
  const apiMessage = err?.response?.data?.message;
  if (typeof apiMessage === 'string' && apiMessage.trim()) return apiMessage;
  if (Array.isArray(apiMessage) && apiMessage.length) return apiMessage.map((x) => String(x)).join('\n');
  if (typeof err?.message === 'string' && err.message.trim()) return err.message;
  return fallback;
}

function getMimeTypeFromAsset(asset: ImagePicker.ImagePickerAsset) {
  if (asset.mimeType) return asset.mimeType;
  const uri = String(asset.uri || '');
  const ext = uri.split('.').pop()?.toLowerCase();
  if (asset.type === 'video') return ext ? `video/${ext === 'mov' ? 'quicktime' : ext}` : 'video/mp4';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

export default function IncidentReportCreateScreen() {
  const navigation = useNavigation<any>();
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<IncidentType>('GENERAL');
  const [severity, setSeverity] = useState<IncidentSeverity>('LOW');
  const [attachments, setAttachments] = useState<ImagePicker.ImagePickerAsset[]>([]);

  const canSubmit = useMemo(() => {
    return title.trim().length >= 3 && description.trim().length >= 10 && !submitting;
  }, [description, submitting, title]);

  const addFromLibrary = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access to attach evidence.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.9,
    });

    if (result.canceled) return;
    const next = Array.isArray(result.assets) ? result.assets : [];
    if (!next.length) return;
    setAttachments((prev) => {
      const seen = new Set(prev.map((a) => a.uri));
      const merged = [...prev];
      for (const a of next) {
        if (!a?.uri || seen.has(a.uri)) continue;
        seen.add(a.uri);
        merged.push(a);
      }
      return merged;
    });
  }, []);

  const takeMedia = useCallback(async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow camera access to capture evidence.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.9,
      videoMaxDuration: 60,
    });

    if (result.canceled) return;
    const next = Array.isArray(result.assets) ? result.assets : [];
    if (!next.length) return;
    setAttachments((prev) => {
      const seen = new Set(prev.map((a) => a.uri));
      const merged = [...prev];
      for (const a of next) {
        if (!a?.uri || seen.has(a.uri)) continue;
        seen.add(a.uri);
        merged.push(a);
      }
      return merged;
    });
  }, []);

  const removeAttachment = useCallback((uri: string) => {
    setAttachments((prev) => prev.filter((a) => a.uri !== uri));
  }, []);

  const uploadEvidence = useCallback(
    async (incidentId: string, asset: ImagePicker.ImagePickerAsset, index: number) => {
      const uri = String(asset.uri || '').trim();
      if (!uri) throw new Error('Invalid attachment');

      const mimeType = getMimeTypeFromAsset(asset);
      const fallbackExt =
        asset.type === 'video'
          ? mimeType === 'video/quicktime'
            ? 'mov'
            : 'mp4'
          : mimeType === 'image/png'
            ? 'png'
            : 'jpg';
      const name = asset.fileName || `incident-evidence-${Date.now()}-${index}.${fallbackExt}`;

      const body = new FormData();
      body.append('file', { uri, name, type: mimeType } as any);

      await api.post(`/incident-reports/${incidentId}/evidence`, body as any, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    []
  );

  const submit = useCallback(async () => {
    const cleanTitle = title.trim();
    const cleanDescription = description.trim();

    if (cleanTitle.length < 3) {
      Alert.alert('Missing title', 'Please enter a short title.');
      return;
    }
    if (cleanDescription.length < 10) {
      Alert.alert('Missing details', 'Please add more details about what happened.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/incident-reports', {
        title: cleanTitle,
        description: cleanDescription,
        type,
        severity,
      });

      const incidentId = res?.data?.id ? String(res.data.id) : null;
      if (incidentId && attachments.length) {
        const failures: string[] = [];
        for (let i = 0; i < attachments.length; i++) {
          try {
            await uploadEvidence(incidentId, attachments[i], i);
          } catch (e: any) {
            const label = attachments[i]?.fileName || attachments[i]?.uri || `Attachment ${i + 1}`;
            failures.push(`${label}: ${normalizeApiError(e, 'Upload failed')}`);
          }
        }

        if (failures.length) {
          Alert.alert('Report submitted', `Some uploads failed:\n\n${failures.slice(0, 3).join('\n')}`);
          navigation.goBack();
          return;
        }
      }

      const reportNumber = res?.data?.reportNumber ? String(res.data.reportNumber) : null;
      Alert.alert('Submitted', reportNumber ? `Report ${reportNumber} submitted.` : 'Incident report submitted.');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Submission failed', normalizeApiError(e, 'Unable to submit incident report.'));
    } finally {
      setSubmitting(false);
    }
  }, [attachments, description, navigation, severity, title, type, uploadEvidence]);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={palette.text as any} />
          </TouchableOpacity>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.titleText} numberOfLines={1}>
              Incident report
            </Text>
            <Text style={styles.subtitleText} numberOfLines={1}>
              Location is set from your active clock-in
            </Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Short summary"
              placeholderTextColor={palette.faint}
              style={styles.input}
              autoCapitalize="sentences"
              returnKeyType="next"
            />

            <Text style={[styles.label, { marginTop: 14 }]}>Details</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What happened? Include who/what/when."
              placeholderTextColor={palette.faint}
              style={[styles.input, styles.textArea]}
              multiline
              autoCapitalize="sentences"
              textAlignVertical="top"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Type</Text>
            <View style={styles.chipRow}>
              {(['GENERAL', 'SECURITY', 'INJURY', 'THEFT', 'DAMAGE'] as IncidentType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setType(t)}
                  style={[styles.chip, t === type ? styles.chipActive : null]}
                >
                  <Text style={[styles.chipText, t === type ? styles.chipTextActive : null]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { marginTop: 14 }]}>Severity</Text>
            <View style={styles.chipRow}>
              {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as IncidentSeverity[]).map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setSeverity(s)}
                  style={[styles.chip, s === severity ? styles.chipActive : null]}
                >
                  <Text style={[styles.chipText, s === severity ? styles.chipTextActive : null]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Attachments (photos / videos)</Text>
            <View style={styles.attachmentActions}>
              <TouchableOpacity onPress={addFromLibrary} style={styles.attachmentBtn}>
                <Ionicons name="images-outline" size={18} color={palette.text as any} />
                <Text style={styles.attachmentBtnText}>Library</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={takeMedia} style={styles.attachmentBtn}>
                <Ionicons name="camera-outline" size={18} color={palette.text as any} />
                <Text style={styles.attachmentBtnText}>Camera</Text>
              </TouchableOpacity>
            </View>

            {attachments.length ? (
              <View style={styles.attachmentGrid}>
                {attachments.map((a, idx) => {
                  const isVideo = a.type === 'video';
                  return (
                    <View key={`${a.uri}_${idx}`} style={styles.attachmentTile}>
                      {isVideo ? (
                        <View style={styles.videoTile}>
                          <Ionicons name="videocam-outline" size={22} color={palette.text as any} />
                          <Text style={styles.videoLabel} numberOfLines={1}>
                            Video
                          </Text>
                        </View>
                      ) : (
                        <Image source={{ uri: a.uri }} style={styles.attachmentImage} />
                      )}
                      <TouchableOpacity onPress={() => removeAttachment(a.uri)} style={styles.removeAttachmentBtn}>
                        <Ionicons name="close" size={14} color={'#ffffff' as any} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.attachmentsEmptyText}>No attachments yet.</Text>
            )}
          </View>

          <TouchableOpacity disabled={!canSubmit} onPress={submit} style={[styles.submitBtn, !canSubmit ? styles.submitBtnDisabled : null]}>
            <Text style={styles.submitText}>{submitting ? 'Submitting…' : 'Submit report'}</Text>
          </TouchableOpacity>

          <Text style={styles.helperText}>
            If you are not clocked in, submission will be blocked.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 16,
    fontWeight: '900',
    color: palette.text,
    letterSpacing: -0.2,
  },
  subtitleText: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.muted,
    marginTop: 2,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 14,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.panel,
    padding: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '900',
    color: palette.muted,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.panelStrong,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: palette.text,
    fontSize: 14,
    fontWeight: '700',
  },
  textArea: {
    minHeight: 110,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  chipActive: {
    borderColor: 'rgba(34,211,238,0.65)',
    backgroundColor: 'rgba(34,211,238,0.14)',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '900',
    color: palette.text,
    opacity: 0.72,
  },
  chipTextActive: {
    opacity: 1,
  },
  attachmentActions: {
    flexDirection: 'row',
    gap: 10,
  },
  attachmentBtn: {
    flexGrow: 1,
    flexBasis: 140,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  attachmentBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: palette.text,
  },
  attachmentsEmptyText: {
    marginTop: 10,
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  attachmentGrid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  attachmentTile: {
    width: 92,
    height: 92,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.panelStrong,
    overflow: 'hidden',
  },
  attachmentImage: {
    width: '100%',
    height: '100%',
  },
  videoTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  videoLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: palette.text,
    opacity: 0.8,
    maxWidth: 80,
  },
  removeAttachmentBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    height: 50,
    borderRadius: 18,
    backgroundColor: palette.indigo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.55,
  },
  submitText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  helperText: {
    textAlign: 'center',
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
});
