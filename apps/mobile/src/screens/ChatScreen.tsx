import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, RefreshControl, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useFocusEffect } from '@react-navigation/native';
import { navigate } from '../navigation/NavigationService';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ChatScreen() {
  const { displayName, designation } = useAuth();
  const [threads, setThreads] = useState<any[]>([]);
  const [directory, setDirectory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [creatingDirect, setCreatingDirect] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

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
    }),
    []
  );

  const fetchThreads = useCallback(async (opts?: { refresh?: boolean }) => {
    if (opts?.refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.get('/chats/threads');
      setThreads(res.data || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchDirectory = useCallback(async () => {
    setDirectoryLoading(true);
    try {
      const res = await api.get('/employees/chat-directory');
      setDirectory(Array.isArray(res.data) ? res.data : []);
    } finally {
      setDirectoryLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      const token = await AsyncStorage.getItem('token');
      if (!cancelled) setAuthToken(token);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchThreads();
    }, [fetchThreads])
  );

  const filteredDirectory = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    if (!query) return directory;
    return directory.filter((member) => {
      const name = String(member.displayName || `${member.firstName || ''} ${member.lastName || ''}`).toLowerCase();
      const email = String(member.email || '').toLowerCase();
      const badge = String(member.badgeNumber || '').toLowerCase();
      return name.includes(query) || email.includes(query) || badge.includes(query);
    });
  }, [directory, memberSearch]);

  const getAuthedUrl = useCallback(
    (path?: string | null) => {
      const rawPath = String(path || '').trim();
      if (!rawPath) return '';

      const base = String((api.defaults as any).baseURL || '').replace(/\/$/, '');
      const url = rawPath.startsWith('http') ? rawPath : `${base}${rawPath.startsWith('/') ? '' : '/'}${rawPath}`;
      if (!authToken) return url;

      const sep = url.includes('?') ? '&' : '?';
      return `${url}${sep}token=${encodeURIComponent(authToken)}`;
    },
    [authToken]
  );

  const startSupportChat = async () => {
    try {
      setLoading(true);
      const res = await api.post('/chats/threads/support', {});
      const thread = res.data;
      if (thread?.id) {
        navigate('ChatThread', { threadId: thread.id });
      }
    } finally {
      setLoading(false);
    }
  };

  const openMemberPicker = async () => {
    setMemberSearch('');
    setPickerOpen(true);
    if (directory.length === 0) {
      await fetchDirectory();
    }
  };

  const startDirectChat = async (employeeId: string) => {
    try {
      setCreatingDirect(employeeId);
      const res = await api.post('/chats/threads/direct', { employeeId });
      const thread = res.data;
      setPickerOpen(false);
      await fetchThreads({ refresh: true });
      if (thread?.id) {
        navigate('ChatThread', { threadId: thread.id });
      }
    } finally {
      setCreatingDirect(null);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.bg }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.bgGlowWrap} pointerEvents="none">
        <View style={[styles.bgGlow, { backgroundColor: palette.indigo, top: -160, left: -160, opacity: 0.22 }]} />
        <View style={[styles.bgGlow, { backgroundColor: palette.cyan, bottom: -170, right: -170, opacity: 0.18 }]} />
        <View style={[styles.bgGlow, { backgroundColor: palette.green, top: 240, right: -220, opacity: 0.10 }]} />
      </View>

      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.headerTitle, { color: palette.text }]}>Chat</Text>
          <Text style={[styles.headerSubtitle, { color: palette.muted }]}>Messages with your team</Text>
          <Text style={[styles.headerSubtitle, { color: palette.faint }]} numberOfLines={1}>
            {displayName}{designation ? ` • ${designation}` : ''}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong, opacity: directoryLoading ? 0.7 : 1 }]}
            onPress={openMemberPicker}
            disabled={directoryLoading}
          >
            <Ionicons name="create-outline" size={18} color={palette.text as any} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong, opacity: loading ? 0.7 : 1 }]}
            onPress={() => fetchThreads({ refresh: true })}
            disabled={loading}
          >
            <Ionicons name="refresh" size={18} color={palette.text as any} />
          </TouchableOpacity>
        </View>
      </View>

      {threads.length === 0 && !loading ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="chatbubbles-outline" size={52} color={palette.faint as any} />
          <Text style={[styles.emptyTitle, { color: palette.muted }]}>No chats yet</Text>
          <Text style={[styles.emptyHint, { color: palette.faint }]}>Start a support chat with your admin.</Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: palette.indigo }]}
            onPress={openMemberPicker}
          >
            <Ionicons name="paper-plane-outline" size={16} color="#ffffff" />
            <Text style={styles.primaryBtnText}>Message member</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
            onPress={startSupportChat}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={16} color="#ffffff" />
            <Text style={styles.primaryBtnText}>Message admin</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchThreads({ refresh: true })} tintColor={palette.cyan as any} />}
          ListHeaderComponent={
            <TouchableOpacity
              style={[styles.supportRow, { borderColor: palette.border, backgroundColor: palette.panel }]}
              onPress={startSupportChat}
              disabled={loading}
            >
              <View style={[styles.supportIcon, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color={palette.cyan as any} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.supportTitle, { color: palette.text }]} numberOfLines={1}>
                  Support
                </Text>
                <Text style={[styles.supportSub, { color: palette.faint }]} numberOfLines={1}>
                  Message your admin
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={palette.faint2 as any} />
            </TouchableOpacity>
          }
          renderItem={({ item }) => {
            const unread = Number(item.unreadCount || 0);
            const last = item.lastMessage?.text || (item.lastMessage?.attachments?.length ? 'Attachment' : '');
            const subtitle = item.displayDesignation ? `${item.displayDesignation}${last ? ` • ${last}` : ''}` : last || ' ';
            const avatarUri = getAuthedUrl(item.displayImageUrl);
            const initials = String(item.displayTitle || item.title || 'Chat')
              .trim()
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase() || '')
              .join('');

            return (
              <TouchableOpacity
                style={[styles.threadRow, { borderColor: palette.border, backgroundColor: palette.panel }]}
                onPress={() => navigate('ChatThread', { threadId: item.id })}
              >
                <View style={[styles.avatar, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
                  ) : item.type === 'GROUP' ? (
                    <Ionicons name="people-outline" size={18} color={palette.text as any} />
                  ) : initials ? (
                    <Text style={[styles.avatarText, { color: palette.text }]}>{initials}</Text>
                  ) : (
                    <Ionicons name="person-outline" size={18} color={palette.text as any} />
                  )}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.threadTop}>
                    <Text style={[styles.threadTitle, { color: palette.text }]} numberOfLines={1}>
                      {item.displayTitle || item.title || 'Chat'}
                    </Text>
                    {unread > 0 ? (
                      <View style={[styles.badge, { backgroundColor: palette.cyan }]}>
                        <Text style={styles.badgeText}>{unread > 99 ? '99+' : String(unread)}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.threadSub, { color: palette.faint }]} numberOfLines={1}>
                    {subtitle}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={palette.faint2 as any} />
              </TouchableOpacity>
            );
          }}
          ListFooterComponent={loading ? <ActivityIndicator color={palette.cyan as any} /> : null}
        />
      )}

      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { borderColor: palette.border, backgroundColor: '#0B1020' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: palette.text }]}>New Direct Message</Text>
                <Text style={[styles.modalSubtitle, { color: palette.muted }]}>
                  Select a registered member to start a private chat.
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.modalClose, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}
                onPress={() => setPickerOpen(false)}
                disabled={!!creatingDirect}
              >
                <Ionicons name="close" size={16} color={palette.text as any} />
              </TouchableOpacity>
            </View>

            <TextInput
              value={memberSearch}
              onChangeText={setMemberSearch}
              placeholder="Search by name, email, or badge"
              placeholderTextColor={palette.faint as any}
              style={[styles.searchInput, { borderColor: palette.border, backgroundColor: palette.panel, color: palette.text }]}
            />

            {directoryLoading ? (
              <View style={styles.modalEmpty}>
                <ActivityIndicator color={palette.cyan as any} />
                <Text style={[styles.modalEmptyText, { color: palette.muted }]}>Loading members...</Text>
              </View>
            ) : filteredDirectory.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Ionicons name="people-outline" size={26} color={palette.faint as any} />
                <Text style={[styles.modalEmptyText, { color: palette.muted }]}>No registered members found.</Text>
              </View>
            ) : (
              <FlatList
                data={filteredDirectory}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.memberList}
                renderItem={({ item }) => {
                  const avatarUri = getAuthedUrl(item.profileImageUrl);
                  const initials = String(item.displayName || item.email || 'Member')
                    .trim()
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase() || '')
                    .join('');
                  return (
                    <TouchableOpacity
                      style={[styles.memberRow, { borderColor: palette.border, backgroundColor: palette.panel }]}
                      onPress={() => startDirectChat(item.id)}
                      disabled={creatingDirect === item.id}
                    >
                      <View style={[styles.memberAvatar, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                        {avatarUri ? (
                          <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
                        ) : initials ? (
                          <Text style={[styles.avatarText, { color: palette.text }]}>{initials}</Text>
                        ) : (
                          <Ionicons name="person-outline" size={18} color={palette.text as any} />
                        )}
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[styles.memberTitle, { color: palette.text }]} numberOfLines={1}>
                          {item.displayName || item.email}
                        </Text>
                        <Text style={[styles.memberSubtitle, { color: palette.faint }]} numberOfLines={1}>
                          {item.email}
                          {item.badgeNumber ? ` • ${item.badgeNumber}` : ''}
                        </Text>
                      </View>
                      {creatingDirect === item.id ? (
                        <ActivityIndicator color={palette.cyan as any} />
                      ) : (
                        <Ionicons name="chevron-forward" size={18} color={palette.faint2 as any} />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
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
  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 18,
    gap: 12,
  },
  supportRow: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 2,
  },
  supportIcon: {
    width: 44,
    height: 44,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  supportSub: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
  },
  threadRow: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  threadTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  threadTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.2,
    flex: 1,
  },
  threadSub: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
  },
  badge: {
    minWidth: 26,
    height: 20,
    borderRadius: 999,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#050816',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    gap: 10,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    textAlign: 'center',
  },
  primaryBtn: {
    marginTop: 10,
    height: 48,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  secondaryBtn: {
    marginTop: 10,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.58)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  modalCard: {
    maxHeight: '82%',
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  modalSubtitle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    height: 46,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 13,
    fontWeight: '600',
  },
  memberList: {
    gap: 10,
  },
  memberRow: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberAvatar: {
    width: 42,
    height: 42,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  memberTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  memberSubtitle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
  },
  modalEmpty: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  modalEmptyText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});
