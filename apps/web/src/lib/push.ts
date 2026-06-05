import api from './api';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerWebPush() {
  try {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }
    // Request permission
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return;
    // Register Service Worker
    const reg = await navigator.serviceWorker.register('/sw.js');
    // Subscribe to Push if VAPID is configured
    const vapidFromEnv = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    let vapidPublicKey = vapidFromEnv;
    if (!vapidPublicKey) {
      try {
        const res = await api.get('/push/vapid-public-key');
        vapidPublicKey = res.data?.publicKey || null;
      } catch {}
    }
    if (vapidPublicKey && reg.pushManager) {
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      await api.post('/push/register', {
        platform: 'web',
        subscription,
      });
    }
  } catch (err) {
    // Silently ignore registration failures
    console.warn('Web push registration failed', err);
  }
}

export function listenSSENotifications() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
    const es = new EventSource(`${apiBase}/notifications/stream?token=${encodeURIComponent(token)}`);
    const dedupe = new Set<string>();
    es.onmessage = (event) => {
      let payload: any = event.data;
      try {
        payload = JSON.parse(event.data);
      } catch {}
      const title = payload?.title || 'Notification';
      const message = payload?.message || '';
      const metadata = payload?.metadata || {};
      const tag = `${payload?.type || ''}:${title}:${metadata?.messageId || ''}:${metadata?.threadId || ''}:${metadata?.shiftId || ''}:${metadata?.start || ''}:${metadata?.end || ''}`;
      if (dedupe.has(tag)) return;
      dedupe.add(tag);
      try {
        window.dispatchEvent(new Event('notifications:refresh'));
      } catch {}
      // Show in-app toast via a lightweight fallback if available
      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast.success(title + ' - ' + message);
      }
      // Show OS notification when permitted
      if (Notification.permission === 'granted') {
        const icon = undefined;
        const actionUrl = payload?.actionUrl;
        const n = new Notification(title, { body: message, icon, tag, data: { ...metadata, actionUrl } });
        if (actionUrl) {
          n.onclick = () => {
            try {
              window.focus();
            } catch {}
            try {
              window.location.href = actionUrl;
            } catch {}
          };
        }
      }
    };
    es.onerror = () => {
      es.close();
    };
    return es;
  } catch {
    return null;
  }
}
