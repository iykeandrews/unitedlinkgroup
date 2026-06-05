import api from './api';
import Constants from 'expo-constants';

let notificationsConfigured = false;

function getProjectId() {
  const c: any = Constants as any;
  return (
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    c?.expoConfig?.extra?.eas?.projectId ||
    c?.easConfig?.projectId ||
    c?.expoConfig?.extra?.projectId ||
    null
  );
}

export async function configureExpoNotifications() {
  if (notificationsConfigured) return;
  const Notifications = await import('expo-notifications');
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

export async function registerExpoPush(opts?: { requestPermissions?: boolean }) {
  await configureExpoNotifications();
  const Notifications = await import('expo-notifications');
  const shouldRequest = opts?.requestPermissions !== false;
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted' && shouldRequest) {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  const projectId = getProjectId();
  const tokenData = projectId
    ? await Notifications.getExpoPushTokenAsync({ projectId })
    : await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;
  await api.post('/push/register', { platform: 'expo', token });
  return token;
}

export function addNotificationResponseListener(navigate: (url?: string) => void) {
  return import('expo-notifications').then((Notifications) =>
    Notifications.addNotificationResponseReceivedListener((response: any) => {
      const actionUrl = (response.notification.request.content.data as any)?.actionUrl;
      if (actionUrl) {
        navigate(actionUrl);
      }
    })
  );
}
