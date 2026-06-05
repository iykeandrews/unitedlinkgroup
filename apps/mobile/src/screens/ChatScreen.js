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
exports.default = ChatScreen;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const vector_icons_1 = require("@expo/vector-icons");
const api_1 = __importDefault(require("../services/api"));
const native_1 = require("@react-navigation/native");
const NavigationService_1 = require("../navigation/NavigationService");
const AuthContext_1 = require("../context/AuthContext");
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
function ChatScreen() {
    const { displayName, designation } = (0, AuthContext_1.useAuth)();
    const [threads, setThreads] = (0, react_1.useState)([]);
    const [directory, setDirectory] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [refreshing, setRefreshing] = (0, react_1.useState)(false);
    const [directoryLoading, setDirectoryLoading] = (0, react_1.useState)(false);
    const [pickerOpen, setPickerOpen] = (0, react_1.useState)(false);
    const [memberSearch, setMemberSearch] = (0, react_1.useState)('');
    const [creatingDirect, setCreatingDirect] = (0, react_1.useState)(null);
    const [authToken, setAuthToken] = (0, react_1.useState)(null);
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
        amber: '#FBBF24',
    }), []);
    const fetchThreads = (0, react_1.useCallback)(async (opts) => {
        if (opts === null || opts === void 0 ? void 0 : opts.refresh)
            setRefreshing(true);
        else
            setLoading(true);
        try {
            const res = await api_1.default.get('/chats/threads');
            setThreads(res.data || []);
        }
        finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);
    const fetchDirectory = (0, react_1.useCallback)(async () => {
        setDirectoryLoading(true);
        try {
            const res = await api_1.default.get('/employees/chat-directory');
            setDirectory(Array.isArray(res.data) ? res.data : []);
        }
        finally {
            setDirectoryLoading(false);
        }
    }, []);
    react_1.default.useEffect(() => {
        let cancelled = false;
        (async () => {
            const token = await async_storage_1.default.getItem('token');
            if (!cancelled)
                setAuthToken(token);
        })();
        return () => {
            cancelled = true;
        };
    }, []);
    (0, native_1.useFocusEffect)((0, react_1.useCallback)(() => {
        fetchThreads();
    }, [fetchThreads]));
    const filteredDirectory = (0, react_1.useMemo)(() => {
        const query = memberSearch.trim().toLowerCase();
        if (!query)
            return directory;
        return directory.filter((member) => {
            const name = String(member.displayName || `${member.firstName || ''} ${member.lastName || ''}`).toLowerCase();
            const email = String(member.email || '').toLowerCase();
            const badge = String(member.badgeNumber || '').toLowerCase();
            return name.includes(query) || email.includes(query) || badge.includes(query);
        });
    }, [directory, memberSearch]);
    const getAuthedUrl = (0, react_1.useCallback)((path) => {
        const rawPath = String(path || '').trim();
        if (!rawPath)
            return '';
        const base = String(api_1.default.defaults.baseURL || '').replace(/\/$/, '');
        const url = rawPath.startsWith('http') ? rawPath : `${base}${rawPath.startsWith('/') ? '' : '/'}${rawPath}`;
        if (!authToken)
            return url;
        const sep = url.includes('?') ? '&' : '?';
        return `${url}${sep}token=${encodeURIComponent(authToken)}`;
    }, [authToken]);
    const startSupportChat = async () => {
        try {
            setLoading(true);
            const res = await api_1.default.post('/chats/threads/support', {});
            const thread = res.data;
            if (thread === null || thread === void 0 ? void 0 : thread.id) {
                (0, NavigationService_1.navigate)('ChatThread', { threadId: thread.id });
            }
        }
        finally {
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
    const startDirectChat = async (employeeId) => {
        try {
            setCreatingDirect(employeeId);
            const res = await api_1.default.post('/chats/threads/direct', { employeeId });
            const thread = res.data;
            setPickerOpen(false);
            await fetchThreads({ refresh: true });
            if (thread === null || thread === void 0 ? void 0 : thread.id) {
                (0, NavigationService_1.navigate)('ChatThread', { threadId: thread.id });
            }
        }
        finally {
            setCreatingDirect(null);
        }
    };
    return (<react_native_safe_area_context_1.SafeAreaView style={[styles.container, { backgroundColor: palette.bg }]}>
      <react_native_1.StatusBar barStyle="light-content"/>
      <react_native_1.View style={styles.bgGlowWrap} pointerEvents="none">
        <react_native_1.View style={[styles.bgGlow, { backgroundColor: palette.indigo, top: -160, left: -160, opacity: 0.22 }]}/>
        <react_native_1.View style={[styles.bgGlow, { backgroundColor: palette.cyan, bottom: -170, right: -170, opacity: 0.18 }]}/>
        <react_native_1.View style={[styles.bgGlow, { backgroundColor: palette.green, top: 240, right: -220, opacity: 0.10 }]}/>
      </react_native_1.View>

      <react_native_1.View style={styles.header}>
        <react_native_1.View style={{ flex: 1, minWidth: 0 }}>
          <react_native_1.Text style={[styles.headerTitle, { color: palette.text }]}>Chat</react_native_1.Text>
          <react_native_1.Text style={[styles.headerSubtitle, { color: palette.muted }]}>Messages with your team</react_native_1.Text>
          <react_native_1.Text style={[styles.headerSubtitle, { color: palette.faint }]} numberOfLines={1}>
            {displayName}{designation ? ` • ${designation}` : ''}
          </react_native_1.Text>
        </react_native_1.View>
        <react_native_1.View style={styles.headerActions}>
          <react_native_1.TouchableOpacity style={[styles.headerBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong, opacity: directoryLoading ? 0.7 : 1 }]} onPress={openMemberPicker} disabled={directoryLoading}>
            <vector_icons_1.Ionicons name="create-outline" size={18} color={palette.text}/>
          </react_native_1.TouchableOpacity>
          <react_native_1.TouchableOpacity style={[styles.headerBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong, opacity: loading ? 0.7 : 1 }]} onPress={() => fetchThreads({ refresh: true })} disabled={loading}>
            <vector_icons_1.Ionicons name="refresh" size={18} color={palette.text}/>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>
      </react_native_1.View>

      {threads.length === 0 && !loading ? (<react_native_1.View style={styles.emptyWrap}>
          <vector_icons_1.Ionicons name="chatbubbles-outline" size={52} color={palette.faint}/>
          <react_native_1.Text style={[styles.emptyTitle, { color: palette.muted }]}>No chats yet</react_native_1.Text>
          <react_native_1.Text style={[styles.emptyHint, { color: palette.faint }]}>Start a support chat with your admin.</react_native_1.Text>
          <react_native_1.TouchableOpacity style={[styles.primaryBtn, { backgroundColor: palette.indigo }]} onPress={openMemberPicker}>
            <vector_icons_1.Ionicons name="paper-plane-outline" size={16} color="#ffffff"/>
            <react_native_1.Text style={styles.primaryBtnText}>Message member</react_native_1.Text>
          </react_native_1.TouchableOpacity>
          <react_native_1.TouchableOpacity style={[styles.secondaryBtn, { borderColor: palette.border, backgroundColor: palette.panelStrong }]} onPress={startSupportChat}>
            <vector_icons_1.Ionicons name="chatbubble-ellipses-outline" size={16} color="#ffffff"/>
            <react_native_1.Text style={styles.primaryBtnText}>Message admin</react_native_1.Text>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>) : (<react_native_1.FlatList data={threads} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} refreshControl={<react_native_1.RefreshControl refreshing={refreshing} onRefresh={() => fetchThreads({ refresh: true })} tintColor={palette.cyan}/>} ListHeaderComponent={<react_native_1.TouchableOpacity style={[styles.supportRow, { borderColor: palette.border, backgroundColor: palette.panel }]} onPress={startSupportChat} disabled={loading}>
              <react_native_1.View style={[styles.supportIcon, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                <vector_icons_1.Ionicons name="shield-checkmark-outline" size={18} color={palette.cyan}/>
              </react_native_1.View>
              <react_native_1.View style={{ flex: 1, minWidth: 0 }}>
                <react_native_1.Text style={[styles.supportTitle, { color: palette.text }]} numberOfLines={1}>
                  Support
                </react_native_1.Text>
                <react_native_1.Text style={[styles.supportSub, { color: palette.faint }]} numberOfLines={1}>
                  Message your admin
                </react_native_1.Text>
              </react_native_1.View>
              <vector_icons_1.Ionicons name="chevron-forward" size={18} color={palette.faint2}/>
            </react_native_1.TouchableOpacity>} renderItem={({ item }) => {
                var _a, _b, _c;
                const unread = Number(item.unreadCount || 0);
                const last = ((_a = item.lastMessage) === null || _a === void 0 ? void 0 : _a.text) || (((_c = (_b = item.lastMessage) === null || _b === void 0 ? void 0 : _b.attachments) === null || _c === void 0 ? void 0 : _c.length) ? 'Attachment' : '');
                const subtitle = item.displayDesignation ? `${item.displayDesignation}${last ? ` • ${last}` : ''}` : last || ' ';
                const avatarUri = getAuthedUrl(item.displayImageUrl);
                const initials = String(item.displayTitle || item.title || 'Chat')
                    .trim()
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => { var _a; return ((_a = part[0]) === null || _a === void 0 ? void 0 : _a.toUpperCase()) || ''; })
                    .join('');
                return (<react_native_1.TouchableOpacity style={[styles.threadRow, { borderColor: palette.border, backgroundColor: palette.panel }]} onPress={() => (0, NavigationService_1.navigate)('ChatThread', { threadId: item.id })}>
                <react_native_1.View style={[styles.avatar, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                  {avatarUri ? (<react_native_1.Image source={{ uri: avatarUri }} style={styles.avatarImg}/>) : item.type === 'GROUP' ? (<vector_icons_1.Ionicons name="people-outline" size={18} color={palette.text}/>) : initials ? (<react_native_1.Text style={[styles.avatarText, { color: palette.text }]}>{initials}</react_native_1.Text>) : (<vector_icons_1.Ionicons name="person-outline" size={18} color={palette.text}/>)}
                </react_native_1.View>
                <react_native_1.View style={{ flex: 1, minWidth: 0 }}>
                  <react_native_1.View style={styles.threadTop}>
                    <react_native_1.Text style={[styles.threadTitle, { color: palette.text }]} numberOfLines={1}>
                      {item.displayTitle || item.title || 'Chat'}
                    </react_native_1.Text>
                    {unread > 0 ? (<react_native_1.View style={[styles.badge, { backgroundColor: palette.cyan }]}>
                        <react_native_1.Text style={styles.badgeText}>{unread > 99 ? '99+' : String(unread)}</react_native_1.Text>
                      </react_native_1.View>) : null}
                  </react_native_1.View>
                  <react_native_1.Text style={[styles.threadSub, { color: palette.faint }]} numberOfLines={1}>
                    {subtitle}
                  </react_native_1.Text>
                </react_native_1.View>
                <vector_icons_1.Ionicons name="chevron-forward" size={18} color={palette.faint2}/>
              </react_native_1.TouchableOpacity>);
            }} ListFooterComponent={loading ? <react_native_1.ActivityIndicator color={palette.cyan}/> : null}/>)}

      <react_native_1.Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>
        <react_native_1.View style={styles.modalBackdrop}>
          <react_native_1.View style={[styles.modalCard, { borderColor: palette.border, backgroundColor: '#0B1020' }]}>
            <react_native_1.View style={styles.modalHeader}>
              <react_native_1.View style={{ flex: 1 }}>
                <react_native_1.Text style={[styles.modalTitle, { color: palette.text }]}>New Direct Message</react_native_1.Text>
                <react_native_1.Text style={[styles.modalSubtitle, { color: palette.muted }]}>
                  Select a registered member to start a private chat.
                </react_native_1.Text>
              </react_native_1.View>
              <react_native_1.TouchableOpacity style={[styles.modalClose, { borderColor: palette.border, backgroundColor: palette.panelStrong }]} onPress={() => setPickerOpen(false)} disabled={!!creatingDirect}>
                <vector_icons_1.Ionicons name="close" size={16} color={palette.text}/>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>

            <react_native_1.TextInput value={memberSearch} onChangeText={setMemberSearch} placeholder="Search by name, email, or badge" placeholderTextColor={palette.faint} style={[styles.searchInput, { borderColor: palette.border, backgroundColor: palette.panel, color: palette.text }]}/>

            {directoryLoading ? (<react_native_1.View style={styles.modalEmpty}>
                <react_native_1.ActivityIndicator color={palette.cyan}/>
                <react_native_1.Text style={[styles.modalEmptyText, { color: palette.muted }]}>Loading members...</react_native_1.Text>
              </react_native_1.View>) : filteredDirectory.length === 0 ? (<react_native_1.View style={styles.modalEmpty}>
                <vector_icons_1.Ionicons name="people-outline" size={26} color={palette.faint}/>
                <react_native_1.Text style={[styles.modalEmptyText, { color: palette.muted }]}>No registered members found.</react_native_1.Text>
              </react_native_1.View>) : (<react_native_1.FlatList data={filteredDirectory} keyExtractor={(item) => item.id} contentContainerStyle={styles.memberList} renderItem={({ item }) => {
                const avatarUri = getAuthedUrl(item.profileImageUrl);
                const initials = String(item.displayName || item.email || 'Member')
                    .trim()
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => { var _a; return ((_a = part[0]) === null || _a === void 0 ? void 0 : _a.toUpperCase()) || ''; })
                    .join('');
                return (<react_native_1.TouchableOpacity style={[styles.memberRow, { borderColor: palette.border, backgroundColor: palette.panel }]} onPress={() => startDirectChat(item.id)} disabled={creatingDirect === item.id}>
                      <react_native_1.View style={[styles.memberAvatar, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                        {avatarUri ? (<react_native_1.Image source={{ uri: avatarUri }} style={styles.avatarImg}/>) : initials ? (<react_native_1.Text style={[styles.avatarText, { color: palette.text }]}>{initials}</react_native_1.Text>) : (<vector_icons_1.Ionicons name="person-outline" size={18} color={palette.text}/>)}
                      </react_native_1.View>
                      <react_native_1.View style={{ flex: 1, minWidth: 0 }}>
                        <react_native_1.Text style={[styles.memberTitle, { color: palette.text }]} numberOfLines={1}>
                          {item.displayName || item.email}
                        </react_native_1.Text>
                        <react_native_1.Text style={[styles.memberSubtitle, { color: palette.faint }]} numberOfLines={1}>
                          {item.email}
                          {item.badgeNumber ? ` • ${item.badgeNumber}` : ''}
                        </react_native_1.Text>
                      </react_native_1.View>
                      {creatingDirect === item.id ? (<react_native_1.ActivityIndicator color={palette.cyan}/>) : (<vector_icons_1.Ionicons name="chevron-forward" size={18} color={palette.faint2}/>)}
                    </react_native_1.TouchableOpacity>);
            }}/>)}
          </react_native_1.View>
        </react_native_1.View>
      </react_native_1.Modal>
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
