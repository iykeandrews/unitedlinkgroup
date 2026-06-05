"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectChatPresence = connectChatPresence;
exports.disconnectChatPresence = disconnectChatPresence;
const react_native_1 = require("react-native");
const socket_io_client_1 = require("socket.io-client");
const api_1 = __importDefault(require("./api"));
let socket = null;
let currentKey = '';
let appStateSubscription = null;
const getSocketBaseUrl = () => String(api_1.default.defaults.baseURL || '').replace(/\/$/, '');
function connectChatPresence(token, businessId) {
    const nextToken = String(token || '').trim();
    const nextBusinessId = String(businessId || '').trim();
    if (!nextToken)
        return null;
    const nextKey = `${nextToken}::${nextBusinessId}`;
    if (socket && currentKey === nextKey)
        return socket;
    disconnectChatPresence();
    socket = (0, socket_io_client_1.io)(getSocketBaseUrl(), {
        auth: {
            token: nextToken,
            businessId: nextBusinessId || undefined,
        },
        transports: ['websocket', 'polling'],
    });
    currentKey = nextKey;
    appStateSubscription = react_native_1.AppState.addEventListener('change', (state) => {
        if (!socket)
            return;
        if (state === 'active' && !socket.connected) {
            socket.connect();
            return;
        }
        if (state !== 'active' && socket.connected) {
            socket.disconnect();
        }
    });
    return socket;
}
function disconnectChatPresence() {
    if (appStateSubscription) {
        appStateSubscription.remove();
        appStateSubscription = null;
    }
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    currentKey = '';
}
