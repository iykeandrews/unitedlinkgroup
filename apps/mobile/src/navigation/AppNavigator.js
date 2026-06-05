"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AppNavigator;
const react_1 = __importDefault(require("react"));
const react_native_screens_1 = require("react-native-screens");
const native_1 = require("@react-navigation/native");
const stack_1 = require("@react-navigation/stack");
const react_native_1 = require("react-native");
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const LoginScreen_1 = __importDefault(require("../screens/LoginScreen"));
const MainTabNavigator_1 = __importDefault(require("./MainTabNavigator"));
const AvailabilityScreen_1 = __importDefault(require("../screens/AvailabilityScreen"));
const SettingsScreen_1 = __importDefault(require("../screens/SettingsScreen"));
const ChatThreadScreen_1 = __importDefault(require("../screens/ChatThreadScreen"));
const AuthContext_1 = require("../context/AuthContext");
const push_1 = require("../services/push");
const chatPresence_1 = require("../services/chatPresence");
const NavigationService_1 = require("./NavigationService");
const react_2 = require("react");
(0, react_native_screens_1.enableScreens)(false);
const Stack = (0, stack_1.createStackNavigator)();
function AppNavigator() {
    const { user, loading } = (0, AuthContext_1.useAuth)();
    console.log('AppNavigator render', { loading, hasUser: !!user });
    (0, react_2.useEffect)(() => {
        let sub;
        const setup = async () => {
            await (0, push_1.configureExpoNotifications)();
            sub = await (0, push_1.addNotificationResponseListener)((url) => {
                const raw = String(url || '');
                const threadIdMatch = raw.match(/[?&]threadId=([^&]+)/);
                if (threadIdMatch === null || threadIdMatch === void 0 ? void 0 : threadIdMatch[1]) {
                    const threadId = decodeURIComponent(threadIdMatch[1]);
                    (0, NavigationService_1.navigate)('ChatThread', { threadId });
                    return;
                }
                if (raw.includes('/dashboard/time')) {
                    (0, NavigationService_1.navigate)('Home');
                    return;
                }
                if (raw.includes('/dashboard/communications/chats')) {
                    (0, NavigationService_1.navigate)('Chat');
                    return;
                }
                if (raw.includes('/dashboard/profile') || raw.includes('qualifications')) {
                    (0, NavigationService_1.navigate)('Profile');
                    return;
                }
                (0, NavigationService_1.navigate)('Schedule');
            });
        };
        setup();
        return () => {
            if (sub && typeof sub.remove === 'function') {
                sub.remove();
            }
        };
    }, []);
    (0, react_2.useEffect)(() => {
        let cancelled = false;
        if (!user) {
            (0, chatPresence_1.disconnectChatPresence)();
            return;
        }
        (async () => {
            const [token, storedBusinessId] = await Promise.all([
                async_storage_1.default.getItem('token'),
                async_storage_1.default.getItem('businessId'),
            ]);
            if (cancelled || !token)
                return;
            (0, chatPresence_1.connectChatPresence)(token, (user === null || user === void 0 ? void 0 : user.businessId) || storedBusinessId || '');
        })();
        return () => {
            cancelled = true;
            (0, chatPresence_1.disconnectChatPresence)();
        };
    }, [user]);
    if (loading) {
        return (<react_native_1.View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <react_native_1.ActivityIndicator size="large" color="#4f46e5"/>
      </react_native_1.View>);
    }
    const initialRouteName = user ? 'Main' : 'Login';
    return (<native_1.NavigationContainer ref={NavigationService_1.navigationRef} onReady={() => console.log('Navigation ready')} onStateChange={() => console.log('Navigation state changed')}>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRouteName}>
        {user ? (<>
            <Stack.Screen name="Main" component={MainTabNavigator_1.default}/>
            <Stack.Screen name="Availability" component={AvailabilityScreen_1.default}/>
            <Stack.Screen name="Settings" component={SettingsScreen_1.default}/>
            <Stack.Screen name="ChatThread" component={ChatThreadScreen_1.default}/>
          </>) : (<Stack.Screen name="Login" component={LoginScreen_1.default}/>)}
      </Stack.Navigator>
    </native_1.NavigationContainer>);
}
