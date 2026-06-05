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
exports.configureExpoNotifications = configureExpoNotifications;
exports.registerExpoPush = registerExpoPush;
exports.addNotificationResponseListener = addNotificationResponseListener;
const api_1 = __importDefault(require("./api"));
const expo_constants_1 = __importDefault(require("expo-constants"));
let notificationsConfigured = false;
function getProjectId() {
    var _a, _b, _c, _d, _e, _f;
    const c = expo_constants_1.default;
    return (process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
        ((_c = (_b = (_a = c === null || c === void 0 ? void 0 : c.expoConfig) === null || _a === void 0 ? void 0 : _a.extra) === null || _b === void 0 ? void 0 : _b.eas) === null || _c === void 0 ? void 0 : _c.projectId) ||
        ((_d = c === null || c === void 0 ? void 0 : c.easConfig) === null || _d === void 0 ? void 0 : _d.projectId) ||
        ((_f = (_e = c === null || c === void 0 ? void 0 : c.expoConfig) === null || _e === void 0 ? void 0 : _e.extra) === null || _f === void 0 ? void 0 : _f.projectId) ||
        null);
}
async function configureExpoNotifications() {
    if (notificationsConfigured)
        return;
    const Notifications = await Promise.resolve().then(() => __importStar(require('expo-notifications')));
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
        }),
    });
    notificationsConfigured = true;
}
async function registerExpoPush(opts) {
    await configureExpoNotifications();
    const Notifications = await Promise.resolve().then(() => __importStar(require('expo-notifications')));
    const shouldRequest = (opts === null || opts === void 0 ? void 0 : opts.requestPermissions) !== false;
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted' && shouldRequest) {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    if (finalStatus !== 'granted')
        return null;
    const projectId = getProjectId();
    const tokenData = projectId
        ? await Notifications.getExpoPushTokenAsync({ projectId })
        : await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    await api_1.default.post('/push/register', { platform: 'expo', token });
    return token;
}
function addNotificationResponseListener(navigate) {
    return Promise.resolve().then(() => __importStar(require('expo-notifications'))).then((Notifications) => Notifications.addNotificationResponseReceivedListener((response) => {
        var _a;
        const actionUrl = (_a = response.notification.request.content.data) === null || _a === void 0 ? void 0 : _a.actionUrl;
        if (actionUrl) {
            navigate(actionUrl);
        }
    }));
}
