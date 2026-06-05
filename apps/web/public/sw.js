/* Service Worker for displaying notifications */
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  const title = data.title || 'Notification';
  const body = data.body || '';
  const icon = data.icon || undefined;
  const tag = data.tag || undefined;
  const payload = data.data || {};
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      tag,
      data: payload,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification?.data?.actionUrl;
  if (url) {
    event.waitUntil(clients.openWindow(url));
  }
});

