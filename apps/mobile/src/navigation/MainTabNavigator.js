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
exports.default = MainTabNavigator;
const react_1 = __importStar(require("react"));
const bottom_tabs_1 = require("@react-navigation/bottom-tabs");
const stack_1 = require("@react-navigation/stack");
const DashboardScreen_1 = __importDefault(require("../screens/DashboardScreen"));
const SchedulingScreen_1 = __importDefault(require("../screens/SchedulingScreen"));
const ChatScreen_1 = __importDefault(require("../screens/ChatScreen"));
const LeaveScreen_1 = __importDefault(require("../screens/LeaveScreen"));
const PayslipScreen_1 = __importDefault(require("../screens/PayslipScreen"));
const ProfileScreen_1 = __importDefault(require("../screens/ProfileScreen"));
const CalloutHistoryScreen_1 = __importDefault(require("../screens/CalloutHistoryScreen"));
const vector_icons_1 = require("@expo/vector-icons");
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const api_1 = __importDefault(require("../services/api"));
const Tab = (0, bottom_tabs_1.createBottomTabNavigator)();
const ScheduleStack = (0, stack_1.createStackNavigator)();
const palette = {
    bg: '#050816',
    glass: '#0B1224',
    glassStrong: '#101B35',
    border: 'rgba(255,255,255,0.14)',
    text: '#E8EEF9',
    muted: 'rgba(232,238,249,0.60)',
    faint: 'rgba(232,238,249,0.40)',
    indigo: '#4F46E5',
    cyan: '#22D3EE',
    green: '#34D399',
};
function getTabMeta(routeName, focused) {
    if (routeName === 'Home')
        return { label: 'Home', icon: focused ? 'home' : 'home-outline' };
    if (routeName === 'Schedule')
        return { label: 'Schedule', icon: focused ? 'calendar' : 'calendar-outline' };
    if (routeName === 'Chat')
        return { label: 'Chat', icon: focused ? 'chatbubbles' : 'chatbubbles-outline' };
    if (routeName === 'Leave')
        return { label: 'Leave', icon: focused ? 'airplane' : 'airplane-outline' };
    if (routeName === 'Payslips')
        return { label: 'Payslips', icon: focused ? 'cash' : 'cash-outline' };
    return { label: 'Profile', icon: focused ? 'person' : 'person-outline' };
}
function FuturisticTabBar({ state, descriptors, navigation, unreadChats }) {
    const insets = (0, react_native_safe_area_context_1.useSafeAreaInsets)();
    const itemCount = state.routes.length;
    const indicatorX = (0, react_1.useRef)(new react_native_1.Animated.Value(state.index)).current;
    const [barWidth, setBarWidth] = (0, react_1.useState)(0);
    (0, react_1.useEffect)(() => {
        react_native_1.Animated.spring(indicatorX, {
            toValue: state.index,
            useNativeDriver: true,
            tension: 140,
            friction: 18,
        }).start();
    }, [indicatorX, state.index]);
    const bottom = Math.max(12, insets.bottom ? insets.bottom - 2 : 12);
    const height = react_native_1.Platform.OS === 'ios' ? 74 : 70;
    const barStyle = (0, react_1.useMemo)(() => [
        styles.tabBar,
        {
            bottom,
            height: height + (react_native_1.Platform.OS === 'ios' ? 0 : 0),
            paddingBottom: react_native_1.Platform.OS === 'ios' ? 12 : 10,
        },
    ], [bottom, height]);
    const contentWidth = Math.max(0, barWidth - 20);
    const indicatorWidth = itemCount > 0 ? contentWidth / itemCount : 0;
    const indicatorTranslateX = indicatorX.interpolate({
        inputRange: [0, Math.max(1, itemCount - 1)],
        outputRange: [0, Math.max(0, (itemCount - 1) * indicatorWidth)],
        extrapolate: 'clamp',
    });
    return (<react_native_1.View style={barStyle} onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}>
      <react_native_1.View style={styles.backplate}/>
      <react_native_1.View style={styles.glowWrap} pointerEvents="none">
        <react_native_1.View style={[styles.glow, { backgroundColor: palette.indigo, top: -140, left: -120, opacity: 0.22 }]}/>
        <react_native_1.View style={[styles.glow, { backgroundColor: palette.cyan, top: -140, right: -120, opacity: 0.18 }]}/>
        <react_native_1.View style={[styles.glow, { backgroundColor: palette.green, bottom: -180, right: -120, opacity: 0.10 }]}/>
      </react_native_1.View>

      <react_native_1.View style={styles.itemsRow}>
        {state.routes.map((route, index) => {
            const focused = state.index === index;
            const { options } = descriptors[route.key];
            const meta = getTabMeta(route.name, focused);
            const onPress = () => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) {
                    navigation.navigate(route.name);
                }
            };
            const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });
            const color = focused ? palette.cyan : palette.faint;
            const unreadForRoute = route.name === 'Chat' ? Number(unreadChats || 0) : 0;
            const badgeLabel = unreadForRoute > 99 ? '99+' : String(unreadForRoute);
            return (<react_native_1.Pressable key={route.key} accessibilityRole="button" accessibilityState={focused ? { selected: true } : {}} accessibilityLabel={options.tabBarAccessibilityLabel} testID={options.tabBarButtonTestID} onPress={onPress} onLongPress={onLongPress} style={styles.item}>
              <react_native_1.View style={styles.iconStack}>
                <react_native_1.View style={styles.iconWrap}>
                  <react_native_1.View style={[
                    styles.iconPill,
                    {
                        borderColor: palette.border,
                        backgroundColor: focused ? 'rgba(79,70,229,0.22)' : 'rgba(255,255,255,0.06)',
                        shadowColor: focused ? palette.cyan : 'transparent',
                        elevation: focused ? 12 : 0,
                        transform: [{ scale: focused ? 1.04 : 1 }],
                    },
                ]}>
                    <vector_icons_1.Ionicons name={meta.icon} size={20} color={color}/>
                  </react_native_1.View>
                  {unreadForRoute > 0 ? (<react_native_1.View style={[styles.unreadBadge, { backgroundColor: '#FB7185', borderColor: palette.glass }]}>
                      <react_native_1.Text style={styles.unreadBadgeText}>{badgeLabel}</react_native_1.Text>
                    </react_native_1.View>) : null}
                </react_native_1.View>
                {focused ? (<react_native_1.View style={[styles.activeLabelPill, { borderColor: palette.border, backgroundColor: palette.glassStrong }]}>
                    <react_native_1.Text style={[styles.activeLabel, { color: palette.text }]} numberOfLines={1}>
                      {meta.label}
                    </react_native_1.Text>
                  </react_native_1.View>) : (<react_native_1.Text style={[styles.inactiveLabel, { color: palette.muted }]} numberOfLines={1}>
                    {meta.label}
                  </react_native_1.Text>)}
              </react_native_1.View>
            </react_native_1.Pressable>);
        })}
      </react_native_1.View>

      <react_native_1.Animated.View pointerEvents="none" style={[
            styles.indicator,
            {
                width: indicatorWidth,
                transform: [
                    {
                        translateX: indicatorTranslateX,
                    },
                ],
            },
        ]}>
        <react_native_1.View style={[styles.indicatorInner, { backgroundColor: palette.cyan }]}/>
      </react_native_1.Animated.View>
    </react_native_1.View>);
}
function ScheduleNavigator() {
    return (<ScheduleStack.Navigator screenOptions={{ headerShown: false }}>
      <ScheduleStack.Screen name="ScheduleHome" component={SchedulingScreen_1.default}/>
      <ScheduleStack.Screen name="CalloutHistory" component={CalloutHistoryScreen_1.default}/>
    </ScheduleStack.Navigator>);
}
function MainTabNavigator() {
    const [unreadChats, setUnreadChats] = (0, react_1.useState)(0);
    (0, react_1.useEffect)(() => {
        let alive = true;
        const fetchUnreadChats = async () => {
            try {
                const res = await api_1.default.get('/chats/threads');
                if (!alive)
                    return;
                const totalUnread = Array.isArray(res === null || res === void 0 ? void 0 : res.data)
                    ? res.data.reduce((sum, thread) => sum + Math.max(0, Number((thread === null || thread === void 0 ? void 0 : thread.unreadCount) || 0)), 0)
                    : 0;
                setUnreadChats(totalUnread);
            }
            catch {
                if (alive)
                    setUnreadChats(0);
            }
        };
        fetchUnreadChats();
        const id = setInterval(fetchUnreadChats, 15000);
        const appStateSub = react_native_1.AppState.addEventListener('change', (nextState) => {
            if (nextState === 'active')
                fetchUnreadChats();
        });
        return () => {
            alive = false;
            clearInterval(id);
            appStateSub.remove();
        };
    }, []);
    return (<Tab.Navigator tabBar={(props) => <FuturisticTabBar {...props} unreadChats={unreadChats}/>} screenOptions={() => ({
            headerShown: false,
        })}>
      <Tab.Screen name="Home" component={DashboardScreen_1.default}/>
      <Tab.Screen name="Schedule" component={ScheduleNavigator}/>
      <Tab.Screen name="Chat" component={ChatScreen_1.default}/>
      <Tab.Screen name="Leave" component={LeaveScreen_1.default}/>
      <Tab.Screen name="Payslips" component={PayslipScreen_1.default}/>
      <Tab.Screen name="Profile" component={ProfileScreen_1.default}/>
    </Tab.Navigator>);
}
const styles = react_native_1.StyleSheet.create({
    tabBar: {
        position: 'absolute',
        left: 14,
        right: 14,
        borderRadius: 28,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.glass,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.28,
        shadowRadius: 18,
        elevation: 10,
        overflow: 'hidden',
    },
    backplate: {
        ...react_native_1.StyleSheet.absoluteFillObject,
        backgroundColor: palette.glass,
    },
    glowWrap: {
        ...react_native_1.StyleSheet.absoluteFillObject,
    },
    glow: {
        position: 'absolute',
        width: 260,
        height: 260,
        borderRadius: 200,
    },
    itemsRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        paddingTop: 10,
    },
    item: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    iconStack: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    iconWrap: {
        position: 'relative',
    },
    iconPill: {
        width: 52,
        height: 40,
        borderRadius: 999,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.75,
        shadowRadius: 14,
    },
    unreadBadge: {
        position: 'absolute',
        top: -6,
        right: -8,
        minWidth: 20,
        height: 20,
        borderRadius: 999,
        borderWidth: 2,
        paddingHorizontal: 5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    unreadBadgeText: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.2,
    },
    inactiveLabel: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    activeLabelPill: {
        height: 26,
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeLabel: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.2,
    },
    indicator: {
        position: 'absolute',
        left: 10,
        bottom: 8,
        height: 3,
    },
    indicatorInner: {
        height: 3,
        borderRadius: 999,
        width: '100%',
        opacity: 0.85,
    },
});
