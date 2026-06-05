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
exports.default = ChatThreadScreen;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const vector_icons_1 = require("@expo/vector-icons");
const api_1 = __importDefault(require("../services/api"));
const AuthContext_1 = require("../context/AuthContext");
const native_1 = require("@react-navigation/native");
const ImagePicker = __importStar(require("expo-image-picker"));
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
function ChatThreadScreen() {
    var _a;
    const { user } = (0, AuthContext_1.useAuth)();
    const navigation = (0, native_1.useNavigation)();
    const route = (0, native_1.useRoute)();
    const threadId = String(((_a = route.params) === null || _a === void 0 ? void 0 : _a.threadId) || '');
    const [thread, setThread] = (0, react_1.useState)(null);
    const [messages, setMessages] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [sending, setSending] = (0, react_1.useState)(false);
    const [text, setText] = (0, react_1.useState)('');
    const [draftAttachments, setDraftAttachments] = (0, react_1.useState)([]);
    const [authToken, setAuthToken] = (0, react_1.useState)(null);
    const [incomingBanner, setIncomingBanner] = (0, react_1.useState)(null);
    const listRef = (0, react_1.useRef)(null);
    const knownMessageIdsRef = (0, react_1.useRef)(new Set());
    const hasLoadedMessagesRef = (0, react_1.useRef)(false);
    const bannerTimeoutRef = (0, react_1.useRef)(null);
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
        red: '#FB7185',
    }), []);
    const myEmployeeId = String((user === null || user === void 0 ? void 0 : user.employeeId) || '');
    (0, react_1.useEffect)(() => {
        let cancelled = false;
        (async () => {
            const t = await async_storage_1.default.getItem('token');
            if (!cancelled)
                setAuthToken(t);
        })();
        return () => {
            cancelled = true;
        };
    }, []);
    const fetchThread = (0, react_1.useCallback)(async () => {
        if (!threadId)
            return;
        const res = await api_1.default.get(`/chats/threads/${threadId}`);
        setThread(res.data);
    }, [threadId]);
    const showIncomingBanner = (0, react_1.useCallback)((senderName, preview) => {
        if (bannerTimeoutRef.current)
            clearTimeout(bannerTimeoutRef.current);
        setIncomingBanner({ senderName, preview });
        bannerTimeoutRef.current = setTimeout(() => {
            setIncomingBanner(null);
            bannerTimeoutRef.current = null;
        }, 3500);
    }, []);
    const fetchMessages = (0, react_1.useCallback)(async () => {
        if (!threadId)
            return;
        const res = await api_1.default.get(`/chats/threads/${threadId}/messages`, { params: { take: 80 } });
        const nextMessages = Array.isArray(res.data) ? res.data : [];
        const nextIds = new Set(nextMessages.map((m) => String((m === null || m === void 0 ? void 0 : m.id) || '')));
        if (hasLoadedMessagesRef.current) {
            const newIncoming = nextMessages.filter((m) => {
                const id = String((m === null || m === void 0 ? void 0 : m.id) || '');
                const senderEmployeeId = String((m === null || m === void 0 ? void 0 : m.senderEmployeeId) || '');
                return !!id && !knownMessageIdsRef.current.has(id) && senderEmployeeId && senderEmployeeId !== myEmployeeId;
            });
            if (newIncoming.length > 0) {
                const latest = newIncoming[newIncoming.length - 1];
                const previewText = String((latest === null || latest === void 0 ? void 0 : latest.text) || '').trim();
                const attachments = Array.isArray(latest === null || latest === void 0 ? void 0 : latest.attachments) ? latest.attachments.length : 0;
                showIncomingBanner(String((latest === null || latest === void 0 ? void 0 : latest.senderName) || 'New message'), previewText || (attachments ? 'Sent an attachment' : 'New message received'));
            }
        }
        else {
            hasLoadedMessagesRef.current = true;
        }
        knownMessageIdsRef.current = nextIds;
        setMessages(nextMessages);
    }, [myEmployeeId, showIncomingBanner, threadId]);
    const markRead = (0, react_1.useCallback)(async () => {
        if (!threadId)
            return;
        try {
            await api_1.default.post(`/chats/threads/${threadId}/read`, {});
        }
        catch { }
    }, [threadId]);
    (0, react_1.useEffect)(() => {
        let cancelled = false;
        const run = async () => {
            try {
                setLoading(true);
                await Promise.all([fetchThread(), fetchMessages()]);
                if (!cancelled)
                    await markRead();
            }
            finally {
                if (!cancelled)
                    setLoading(false);
            }
        };
        run();
        return () => {
            cancelled = true;
        };
    }, [fetchMessages, fetchThread, markRead]);
    (0, react_1.useEffect)(() => {
        if (!threadId)
            return;
        const id = setInterval(() => {
            fetchMessages().then(() => markRead()).catch(() => { });
        }, 5000);
        return () => clearInterval(id);
    }, [fetchMessages, markRead, threadId]);
    (0, react_1.useEffect)(() => {
        return () => {
            if (bannerTimeoutRef.current)
                clearTimeout(bannerTimeoutRef.current);
        };
    }, []);
    const getAuthedUrl = (0, react_1.useCallback)((path) => {
        const base = String(api_1.default.defaults.baseURL || '').replace(/\/$/, '');
        const p = String(path || '');
        const url = p.startsWith('http') ? p : `${base}${p.startsWith('/') ? '' : '/'}${p}`;
        if (!authToken)
            return url;
        const sep = url.includes('?') ? '&' : '?';
        return `${url}${sep}token=${encodeURIComponent(authToken)}`;
    }, [authToken]);
    const uploadAttachment = (0, react_1.useCallback)(async (att) => {
        const form = new FormData();
        form.append('file', { uri: att.uri, name: att.name, type: att.mimeType });
        const endpoint = att.kind === 'VIDEO' ? '/uploads/videos' : '/uploads/images';
        const res = await api_1.default.post(endpoint, form, { headers: { 'Content-Type': 'multipart/form-data' } });
        const uploaded = res.data;
        return {
            type: att.kind,
            url: uploaded === null || uploaded === void 0 ? void 0 : uploaded.url,
            filename: uploaded === null || uploaded === void 0 ? void 0 : uploaded.filename,
            originalName: (uploaded === null || uploaded === void 0 ? void 0 : uploaded.originalName) || att.name,
            mimeType: (uploaded === null || uploaded === void 0 ? void 0 : uploaded.mimeType) || att.mimeType,
            size: uploaded === null || uploaded === void 0 ? void 0 : uploaded.size,
        };
    }, []);
    const send = async () => {
        const t = text.trim();
        if ((!t && draftAttachments.length === 0) || sending || !threadId)
            return;
        try {
            setSending(true);
            setText('');
            const toUpload = draftAttachments.slice();
            setDraftAttachments([]);
            const uploadedAttachments = toUpload.length ? await Promise.all(toUpload.map(uploadAttachment)) : [];
            const res = await api_1.default.post(`/chats/threads/${threadId}/messages`, { text: t || undefined, attachments: uploadedAttachments });
            const m = res.data;
            if (m === null || m === void 0 ? void 0 : m.id) {
                setMessages((prev) => [...prev, m]);
                requestAnimationFrame(() => { var _a; return (_a = listRef.current) === null || _a === void 0 ? void 0 : _a.scrollToEnd({ animated: true }); });
                await markRead();
            }
            else {
                await fetchMessages();
            }
        }
        finally {
            setSending(false);
        }
    };
    const pick = async (kind) => {
        var _a;
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted')
            return;
        const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: kind === 'VIDEO' ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images,
            quality: kind === 'VIDEO' ? 1 : 0.85,
            allowsEditing: false,
            selectionLimit: 1,
        });
        if (res.canceled)
            return;
        const asset = (_a = res.assets) === null || _a === void 0 ? void 0 : _a[0];
        if (!(asset === null || asset === void 0 ? void 0 : asset.uri))
            return;
        const mimeType = String(asset.mimeType || (kind === 'VIDEO' ? 'video/mp4' : 'image/jpeg'));
        const fileName = String(asset.fileName || `${kind.toLowerCase()}-${Date.now()}`);
        setDraftAttachments((prev) => [...prev, { kind, uri: asset.uri, name: fileName, mimeType }]);
    };
    const title = (0, react_1.useMemo)(() => {
        if ((thread === null || thread === void 0 ? void 0 : thread.type) === 'GROUP')
            return String((thread === null || thread === void 0 ? void 0 : thread.title) || 'Group chat');
        const participants = (thread === null || thread === void 0 ? void 0 : thread.participants) || [];
        const other = participants.find((p) => String(p.employeeId) !== myEmployeeId);
        const emp = other === null || other === void 0 ? void 0 : other.employee;
        if ((emp === null || emp === void 0 ? void 0 : emp.firstName) || (emp === null || emp === void 0 ? void 0 : emp.lastName))
            return `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
        return 'Chat';
    }, [myEmployeeId, thread === null || thread === void 0 ? void 0 : thread.participants, thread === null || thread === void 0 ? void 0 : thread.title, thread === null || thread === void 0 ? void 0 : thread.type]);
    if (!threadId) {
        return (<react_native_safe_area_context_1.SafeAreaView style={[styles.container, { backgroundColor: palette.bg }]}>
        <react_native_1.StatusBar barStyle="light-content"/>
        <react_native_1.View style={styles.center}>
          <react_native_1.Text style={[styles.emptyTitle, { color: palette.text }]}>Chat not found</react_native_1.Text>
        </react_native_1.View>
      </react_native_safe_area_context_1.SafeAreaView>);
    }
    return (<react_native_safe_area_context_1.SafeAreaView style={[styles.container, { backgroundColor: palette.bg }]}>
      <react_native_1.StatusBar barStyle="light-content"/>
      <react_native_1.View style={styles.bgGlowWrap} pointerEvents="none">
        <react_native_1.View style={[styles.bgGlow, { backgroundColor: palette.indigo, top: -160, left: -160, opacity: 0.22 }]}/>
        <react_native_1.View style={[styles.bgGlow, { backgroundColor: palette.cyan, bottom: -170, right: -170, opacity: 0.18 }]}/>
      </react_native_1.View>

      <react_native_1.View style={[styles.header, { borderBottomColor: palette.border }]}>
        <react_native_1.TouchableOpacity style={[styles.backBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong }]} onPress={() => navigation.goBack()}>
          <vector_icons_1.Ionicons name="chevron-back" size={18} color={palette.text}/>
        </react_native_1.TouchableOpacity>
        <react_native_1.View style={{ flex: 1, minWidth: 0 }}>
          <react_native_1.Text style={[styles.headerTitle, { color: palette.text }]} numberOfLines={1}>
            {title}
          </react_native_1.Text>
          <react_native_1.Text style={[styles.headerSub, { color: palette.muted }]} numberOfLines={1}>
            {(thread === null || thread === void 0 ? void 0 : thread.type) === 'GROUP' ? 'Group' : 'Direct'}
          </react_native_1.Text>
        </react_native_1.View>
        <react_native_1.TouchableOpacity style={[styles.backBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong, opacity: loading ? 0.7 : 1 }]} onPress={async () => {
            await fetchMessages();
            await markRead();
        }} disabled={loading}>
          <vector_icons_1.Ionicons name="refresh" size={18} color={palette.text}/>
        </react_native_1.TouchableOpacity>
      </react_native_1.View>

      {incomingBanner ? (<react_native_1.TouchableOpacity activeOpacity={0.92} style={[styles.banner, { borderColor: palette.border, backgroundColor: palette.panelStrong }]} onPress={() => {
                setIncomingBanner(null);
                requestAnimationFrame(() => { var _a; return (_a = listRef.current) === null || _a === void 0 ? void 0 : _a.scrollToEnd({ animated: true }); });
            }}>
          <vector_icons_1.Ionicons name="chatbubble-ellipses-outline" size={18} color={palette.cyan}/>
          <react_native_1.View style={{ flex: 1, minWidth: 0 }}>
            <react_native_1.Text style={[styles.bannerTitle, { color: palette.text }]} numberOfLines={1}>
              {incomingBanner.senderName}
            </react_native_1.Text>
            <react_native_1.Text style={[styles.bannerText, { color: palette.muted }]} numberOfLines={1}>
              {incomingBanner.preview}
            </react_native_1.Text>
          </react_native_1.View>
          <vector_icons_1.Ionicons name="chevron-down" size={16} color={palette.faint}/>
        </react_native_1.TouchableOpacity>) : null}

      {loading ? (<react_native_1.View style={styles.center}>
          <react_native_1.ActivityIndicator size="large" color={palette.cyan}/>
        </react_native_1.View>) : (<react_native_1.KeyboardAvoidingView behavior={react_native_1.Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <react_native_1.FlatList ref={listRef} data={messages} keyExtractor={(m) => m.id} contentContainerStyle={styles.list} onContentSizeChange={() => { var _a; return (_a = listRef.current) === null || _a === void 0 ? void 0 : _a.scrollToEnd({ animated: false }); }} renderItem={({ item }) => {
                const mine = String(item.senderEmployeeId) === myEmployeeId;
                const bubbleBg = mine ? palette.indigo : palette.panel;
                const align = mine ? 'flex-end' : 'flex-start';
                const attachments = Array.isArray(item.attachments) ? item.attachments : [];
                return (<react_native_1.View style={[styles.msgRow, { alignItems: align }]}>
                  {!mine ? (<react_native_1.Text style={[styles.sender, { color: palette.faint }]} numberOfLines={1}>
                      {item.senderName || ' '}
                    </react_native_1.Text>) : null}
                  <react_native_1.View style={[styles.bubble, { backgroundColor: bubbleBg, borderColor: palette.border }]}>
                    {item.text ? <react_native_1.Text style={[styles.msgText, { color: palette.text }]}>{item.text || ''}</react_native_1.Text> : null}
                    {attachments.length ? (<react_native_1.View style={styles.attachments}>
                        {attachments.map((a) => {
                            const at = String((a === null || a === void 0 ? void 0 : a.type) || '').toUpperCase();
                            const url = (a === null || a === void 0 ? void 0 : a.url) ? getAuthedUrl(a.url) : null;
                            if (at === 'IMAGE' && url) {
                                return (<react_native_1.TouchableOpacity key={a.id || a.url} onPress={() => react_native_1.Linking.openURL(url)} activeOpacity={0.85}>
                                <react_native_1.Image source={{ uri: url }} style={[styles.img, { borderColor: palette.border }]}/>
                              </react_native_1.TouchableOpacity>);
                            }
                            return (<react_native_1.TouchableOpacity key={a.id || a.url} style={[styles.fileRow, { borderColor: palette.border, backgroundColor: palette.panelStrong }]} onPress={() => (url ? react_native_1.Linking.openURL(url) : null)} activeOpacity={0.85}>
                              <vector_icons_1.Ionicons name={at === 'VIDEO' ? 'play-circle-outline' : 'attach-outline'} size={18} color={palette.text}/>
                              <react_native_1.Text style={[styles.fileName, { color: palette.text }]} numberOfLines={1}>
                                {a.originalName || a.filename || 'Attachment'}
                              </react_native_1.Text>
                            </react_native_1.TouchableOpacity>);
                        })}
                      </react_native_1.View>) : null}
                  </react_native_1.View>
                  <react_native_1.Text style={[styles.time, { color: palette.faint2 }]}>
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </react_native_1.Text>
                </react_native_1.View>);
            }}/>

          <react_native_1.View style={[styles.composer, { borderTopColor: palette.border, backgroundColor: palette.bg }]}>
            <react_native_1.View style={[styles.inputWrap, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
              <react_native_1.TouchableOpacity style={[styles.attachBtn, { borderColor: palette.border, backgroundColor: palette.panel }]} onPress={() => pick('IMAGE')} disabled={sending}>
                <vector_icons_1.Ionicons name="image-outline" size={18} color={palette.text}/>
              </react_native_1.TouchableOpacity>
              <react_native_1.TouchableOpacity style={[styles.attachBtn, { borderColor: palette.border, backgroundColor: palette.panel }]} onPress={() => pick('VIDEO')} disabled={sending}>
                <vector_icons_1.Ionicons name="videocam-outline" size={18} color={palette.text}/>
              </react_native_1.TouchableOpacity>
              <react_native_1.TextInput value={text} onChangeText={setText} placeholder="Message…" placeholderTextColor={palette.faint} style={[styles.input, { color: palette.text }]} multiline/>
              <react_native_1.TouchableOpacity style={[
                styles.sendBtn,
                {
                    backgroundColor: text.trim() || draftAttachments.length ? palette.cyan : palette.panel,
                    opacity: sending ? 0.7 : 1,
                },
            ]} onPress={send} disabled={(!text.trim() && draftAttachments.length === 0) || sending}>
                <vector_icons_1.Ionicons name="send" size={16} color={text.trim() || draftAttachments.length ? '#050816' : palette.faint}/>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>
            {draftAttachments.length ? (<react_native_1.View style={styles.draftRow}>
                {draftAttachments.map((a, idx) => {
                    return (<react_native_1.View key={`${a.uri}-${idx}`} style={[styles.draftPill, { borderColor: palette.border, backgroundColor: palette.panel }]}>
                      <vector_icons_1.Ionicons name={a.kind === 'VIDEO' ? 'videocam-outline' : 'image-outline'} size={14} color={palette.cyan}/>
                      <react_native_1.Text style={[styles.draftText, { color: palette.text }]} numberOfLines={1}>
                        {a.name}
                      </react_native_1.Text>
                      <react_native_1.TouchableOpacity onPress={() => setDraftAttachments((prev) => prev.filter((_, i) => i !== idx))} style={styles.draftRemove}>
                        <vector_icons_1.Ionicons name="close" size={14} color={palette.text}/>
                      </react_native_1.TouchableOpacity>
                    </react_native_1.View>);
                })}
              </react_native_1.View>) : null}
          </react_native_1.View>
        </react_native_1.KeyboardAvoidingView>)}
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
