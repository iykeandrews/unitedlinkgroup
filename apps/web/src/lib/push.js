"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerWebPush = registerWebPush;
exports.listenSSENotifications = listenSSENotifications;
const api_1 = __importDefault(require("./api"));
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
async function registerWebPush() {
    var _a;
    try {
        if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
            return;
        }
        // Request permission
        const perm = await Notification.requestPermission();
        if (perm !== 'granted')
            return;
        // Register Service Worker
        const reg = await navigator.serviceWorker.register('/sw.js');
        // Subscribe to Push if VAPID is configured
        const vapidFromEnv = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        let vapidPublicKey = vapidFromEnv;
        if (!vapidPublicKey) {
            try {
                const res = await api_1.default.get('/push/vapid-public-key');
                vapidPublicKey = ((_a = res.data) === null || _a === void 0 ? void 0 : _a.publicKey) || null;
            }
            catch { }
        }
        if (vapidPublicKey && reg.pushManager) {
            const subscription = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
            });
            await api_1.default.post('/push/register', {
                platform: 'web',
                subscription,
            });
        }
    }
    catch (err) {
        // Silently ignore registration failures
        console.warn('Web push registration failed', err);
    }
}
function listenSSENotifications() {
    try {
        const token = localStorage.getItem('token');
        if (!token)
            return;
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
        const es = new EventSource(`${apiBase}/notifications/stream?token=${encodeURIComponent(token)}`);
        const dedupe = new Set();
        es.onmessage = (event) => {
            let payload = event.data;
            try {
                payload = JSON.parse(event.data);
            }
            catch { }
            const title = (payload === null || payload === void 0 ? void 0 : payload.title) || 'Notification';
            const message = (payload === null || payload === void 0 ? void 0 : payload.message) || '';
            const metadata = (payload === null || payload === void 0 ? void 0 : payload.metadata) || {};
            const tag = `${(payload === null || payload === void 0 ? void 0 : payload.type) || ''}:${title}:${(metadata === null || metadata === void 0 ? void 0 : metadata.messageId) || ''}:${(metadata === null || metadata === void 0 ? void 0 : metadata.threadId) || ''}:${(metadata === null || metadata === void 0 ? void 0 : metadata.shiftId) || ''}:${(metadata === null || metadata === void 0 ? void 0 : metadata.start) || ''}:${(metadata === null || metadata === void 0 ? void 0 : metadata.end) || ''}`;
            if (dedupe.has(tag))
                return;
            dedupe.add(tag);
            try {
                window.dispatchEvent(new Event('notifications:refresh'));
            }
            catch { }
            // Show in-app toast via a lightweight fallback if available
            if (typeof window !== 'undefined' && window.toast) {
                window.toast.success(title + ' - ' + message);
            }
            // Show OS notification when permitted
            if (Notification.permission === 'granted') {
                const icon = undefined;
                const actionUrl = payload === null || payload === void 0 ? void 0 : payload.actionUrl;
                const n = new Notification(title, { body: message, icon, tag, data: { ...metadata, actionUrl } });
                if (actionUrl) {
                    n.onclick = () => {
                        try {
                            window.focus();
                        }
                        catch { }
                        try {
                            window.location.href = actionUrl;
                        }
                        catch { }
                    };
                }
            }
        };
        es.onerror = () => {
            es.close();
        };
        return es;
    }
    catch {
        return null;
    }
}
