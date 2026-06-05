import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Linking, Platform, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ChatThreadScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const threadId = String(route.params?.threadId || '');

  const [thread, setThread] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [draftAttachments, setDraftAttachments] = useState<
    { kind: 'IMAGE' | 'VIDEO'; uri: string; name: string; mimeType: string }[]
  >([]);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [incomingBanner, setIncomingBanner] = useState<{ senderName: string; preview: string } | null>(null);

  const listRef = useRef<FlatList>(null);
  const knownMessageIdsRef = useRef<Set<string>>(new Set());
  const hasLoadedMessagesRef = useRef(false);
  const bannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      red: '#FB7185',
    }),
    []
  );

  const myEmployeeId = String(user?.employeeId || '');
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

  const fetchThread = useCallback(async () => {
    if (!threadId) return;
    const res = await api.get(`/chats/threads/${threadId}`);
    setThread(res.data);
  }, [threadId]);

  const showIncomingBanner = useCallback((senderName: string, preview: string) => {
    if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
    setIncomingBanner({ senderName, preview });
    bannerTimeoutRef.current = setTimeout(() => {
      setIncomingBanner(null);
      bannerTimeoutRef.current = null;
    }, 3500);
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!threadId) return;
    const res = await api.get(`/chats/threads/${threadId}/messages`, { params: { take: 80 } });
    const nextMessages = Array.isArray(res.data) ? res.data : [];
    const nextIds = new Set(nextMessages.map((m: any) => String(m?.id || '')));

    if (hasLoadedMessagesRef.current) {
      const newIncoming = nextMessages.filter((m: any) => {
        const id = String(m?.id || '');
        const senderEmployeeId = String(m?.senderEmployeeId || '');
        return !!id && !knownMessageIdsRef.current.has(id) && senderEmployeeId && senderEmployeeId !== myEmployeeId;
      });

      if (newIncoming.length > 0) {
        const latest = newIncoming[newIncoming.length - 1];
        const previewText = String(latest?.text || '').trim();
        const attachments = Array.isArray(latest?.attachments) ? latest.attachments.length : 0;
        showIncomingBanner(
          String(latest?.senderName || 'New message'),
          previewText || (attachments ? 'Sent an attachment' : 'New message received')
        );
      }
    } else {
      hasLoadedMessagesRef.current = true;
    }

    knownMessageIdsRef.current = nextIds;
    setMessages(nextMessages);
  }, [myEmployeeId, showIncomingBanner, threadId]);

  const markRead = useCallback(async () => {
    if (!threadId) return;
    try {
      await api.post(`/chats/threads/${threadId}/read`, {});
    } catch {}
  }, [threadId]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        await Promise.all([fetchThread(), fetchMessages()]);
        if (!cancelled) await markRead();
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [fetchMessages, fetchThread, markRead]);

  useEffect(() => {
    if (!threadId) return;
    const id = setInterval(() => {
      fetchMessages().then(() => markRead()).catch(() => {});
    }, 5000);
    return () => clearInterval(id);
  }, [fetchMessages, markRead, threadId]);

  useEffect(() => {
    return () => {
      if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
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

  const uploadAttachment = useCallback(async (att: { kind: 'IMAGE' | 'VIDEO'; uri: string; name: string; mimeType: string }) => {
    const form = new FormData();
    form.append('file', { uri: att.uri, name: att.name, type: att.mimeType } as any);
    const endpoint = att.kind === 'VIDEO' ? '/uploads/videos' : '/uploads/images';
    const res = await api.post(endpoint, form, { headers: { 'Content-Type': 'multipart/form-data' } });
    const uploaded = res.data;
    return {
      type: att.kind,
      url: uploaded?.url,
      filename: uploaded?.filename,
      originalName: uploaded?.originalName || att.name,
      mimeType: uploaded?.mimeType || att.mimeType,
      size: uploaded?.size,
    };
  }, []);

  const send = async () => {
    const t = text.trim();
    if ((!t && draftAttachments.length === 0) || sending || !threadId) return;
    try {
      setSending(true);
      setText('');
      const toUpload = draftAttachments.slice();
      setDraftAttachments([]);
      const uploadedAttachments = toUpload.length ? await Promise.all(toUpload.map(uploadAttachment)) : [];
      const res = await api.post(`/chats/threads/${threadId}/messages`, { text: t || undefined, attachments: uploadedAttachments });
      const m = res.data;
      if (m?.id) {
        setMessages((prev) => [...prev, m]);
        requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
        await markRead();
      } else {
        await fetchMessages();
      }
    } finally {
      setSending(false);
    }
  };

  const pick = async (kind: 'IMAGE' | 'VIDEO') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: kind === 'VIDEO' ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images,
      quality: kind === 'VIDEO' ? 1 : 0.85,
      allowsEditing: false,
      selectionLimit: 1,
    });
    if (res.canceled) return;
    const asset = res.assets?.[0];
    if (!asset?.uri) return;
    const mimeType = String((asset as any).mimeType || (kind === 'VIDEO' ? 'video/mp4' : 'image/jpeg'));
    const fileName = String((asset as any).fileName || `${kind.toLowerCase()}-${Date.now()}`);
    setDraftAttachments((prev) => [...prev, { kind, uri: asset.uri, name: fileName, mimeType }]);
  };

  const title = useMemo(() => {
    if (thread?.type === 'GROUP') return String(thread?.title || 'Group chat');
    const participants = thread?.participants || [];
    const other = participants.find((p: any) => String(p.employeeId) !== myEmployeeId);
    const emp = other?.employee;
    if (emp?.firstName || emp?.lastName) return `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
    return 'Chat';
  }, [myEmployeeId, thread?.participants, thread?.title, thread?.type]);

  if (!threadId) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.bg }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.center}>
          <Text style={[styles.emptyTitle, { color: palette.text }]}>Chat not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.bg }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.bgGlowWrap} pointerEvents="none">
        <View style={[styles.bgGlow, { backgroundColor: palette.indigo, top: -160, left: -160, opacity: 0.22 }]} />
        <View style={[styles.bgGlow, { backgroundColor: palette.cyan, bottom: -170, right: -170, opacity: 0.18 }]} />
      </View>

      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <TouchableOpacity
          style={[styles.backBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={18} color={palette.text as any} />
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.headerTitle, { color: palette.text }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.headerSub, { color: palette.muted }]} numberOfLines={1}>
            {thread?.type === 'GROUP' ? 'Group' : 'Direct'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.backBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong, opacity: loading ? 0.7 : 1 }]}
          onPress={async () => {
            await fetchMessages();
            await markRead();
          }}
          disabled={loading}
        >
          <Ionicons name="refresh" size={18} color={palette.text as any} />
        </TouchableOpacity>
      </View>

      {incomingBanner ? (
        <TouchableOpacity
          activeOpacity={0.92}
          style={[styles.banner, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
          onPress={() => {
            setIncomingBanner(null);
            requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
          }}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={palette.cyan as any} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.bannerTitle, { color: palette.text }]} numberOfLines={1}>
              {incomingBanner.senderName}
            </Text>
            <Text style={[styles.bannerText, { color: palette.muted }]} numberOfLines={1}>
              {incomingBanner.preview}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={16} color={palette.faint as any} />
        </TouchableOpacity>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={palette.cyan as any} />
        </View>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => {
              const mine = String(item.senderEmployeeId) === myEmployeeId;
              const bubbleBg = mine ? palette.indigo : palette.panel;
              const align = mine ? 'flex-end' : 'flex-start';
              const attachments = Array.isArray(item.attachments) ? item.attachments : [];
              return (
                <View style={[styles.msgRow, { alignItems: align }]}>
                  {!mine ? (
                    <Text style={[styles.sender, { color: palette.faint }]} numberOfLines={1}>
                      {item.senderName || ' '}
                    </Text>
                  ) : null}
                  <View style={[styles.bubble, { backgroundColor: bubbleBg, borderColor: palette.border }]}>
                    {item.text ? <Text style={[styles.msgText, { color: palette.text }]}>{item.text || ''}</Text> : null}
                    {attachments.length ? (
                      <View style={styles.attachments}>
                        {attachments.map((a: any) => {
                          const at = String(a?.type || '').toUpperCase();
                          const url = a?.url ? getAuthedUrl(a.url) : null;
                          if (at === 'IMAGE' && url) {
                            return (
                              <TouchableOpacity key={a.id || a.url} onPress={() => Linking.openURL(url)} activeOpacity={0.85}>
                                <Image source={{ uri: url }} style={[styles.img, { borderColor: palette.border }]} />
                              </TouchableOpacity>
                            );
                          }
                          return (
                            <TouchableOpacity
                              key={a.id || a.url}
                              style={[styles.fileRow, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
                              onPress={() => (url ? Linking.openURL(url) : null)}
                              activeOpacity={0.85}
                            >
                              <Ionicons name={at === 'VIDEO' ? 'play-circle-outline' : 'attach-outline'} size={18} color={palette.text as any} />
                              <Text style={[styles.fileName, { color: palette.text }]} numberOfLines={1}>
                                {a.originalName || a.filename || 'Attachment'}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.time, { color: palette.faint2 }]}>
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              );
            }}
          />

          <View style={[styles.composer, { borderTopColor: palette.border, backgroundColor: palette.bg }]}>
            <View style={[styles.inputWrap, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
              <TouchableOpacity
                style={[styles.attachBtn, { borderColor: palette.border, backgroundColor: palette.panel }]}
                onPress={() => pick('IMAGE')}
                disabled={sending}
              >
                <Ionicons name="image-outline" size={18} color={palette.text as any} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.attachBtn, { borderColor: palette.border, backgroundColor: palette.panel }]}
                onPress={() => pick('VIDEO')}
                disabled={sending}
              >
                <Ionicons name="videocam-outline" size={18} color={palette.text as any} />
              </TouchableOpacity>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Message…"
                placeholderTextColor={palette.faint}
                style={[styles.input, { color: palette.text }]}
                multiline
              />
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  {
                    backgroundColor: text.trim() || draftAttachments.length ? palette.cyan : palette.panel,
                    opacity: sending ? 0.7 : 1,
                  },
                ]}
                onPress={send}
                disabled={(!text.trim() && draftAttachments.length === 0) || sending}
              >
                <Ionicons name="send" size={16} color={text.trim() || draftAttachments.length ? '#050816' : (palette.faint as any)} />
              </TouchableOpacity>
            </View>
            {draftAttachments.length ? (
              <View style={styles.draftRow}>
                {draftAttachments.map((a, idx) => {
                  return (
                    <View key={`${a.uri}-${idx}`} style={[styles.draftPill, { borderColor: palette.border, backgroundColor: palette.panel }]}>
                      <Ionicons name={a.kind === 'VIDEO' ? 'videocam-outline' : 'image-outline'} size={14} color={palette.cyan as any} />
                      <Text style={[styles.draftText, { color: palette.text }]} numberOfLines={1}>
                        {a.name}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setDraftAttachments((prev) => prev.filter((_, i) => i !== idx))}
                        style={styles.draftRemove}
                      >
                        <Ionicons name="close" size={14} color={palette.text as any} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      )}
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
  header: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  headerSub: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  banner: {
    marginHorizontal: 14,
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.1,
  },
  bannerText: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 10,
  },
  msgRow: {
    width: '100%',
    gap: 6,
  },
  sender: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
    paddingHorizontal: 4,
  },
  bubble: {
    maxWidth: '84%',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  msgText: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  attachments: {
    marginTop: 10,
    gap: 10,
  },
  img: {
    width: 220,
    height: 140,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  fileRow: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fileName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  time: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  composer: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  inputWrap: {
    borderWidth: 1,
    borderRadius: 20,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    maxHeight: 110,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  draftPill: {
    maxWidth: '100%',
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingLeft: 10,
    paddingRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  draftText: {
    maxWidth: 220,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  draftRemove: {
    width: 26,
    height: 26,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});
