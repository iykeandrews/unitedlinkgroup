import { AppState } from 'react-native';
import { io, Socket } from 'socket.io-client';
import api from './api';

let socket: Socket | null = null;
let currentKey = '';
let appStateSubscription: { remove: () => void } | null = null;

const getSocketBaseUrl = () => String((api.defaults as any).baseURL || '').replace(/\/$/, '');

export function connectChatPresence(token: string, businessId?: string | null) {
  const nextToken = String(token || '').trim();
  const nextBusinessId = String(businessId || '').trim();
  if (!nextToken) return null;

  const nextKey = `${nextToken}::${nextBusinessId}`;
  if (socket && currentKey === nextKey) return socket;

  disconnectChatPresence();

  socket = io(getSocketBaseUrl(), {
    auth: {
      token: nextToken,
      businessId: nextBusinessId || undefined,
    },
    transports: ['websocket', 'polling'],
  });
  currentKey = nextKey;

  appStateSubscription = AppState.addEventListener('change', (state) => {
    if (!socket) return;
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

export function disconnectChatPresence() {
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
