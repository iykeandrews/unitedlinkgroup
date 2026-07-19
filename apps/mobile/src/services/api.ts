import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const hostCandidate =
  (Constants?.debuggerHost || Constants?.expoConfig?.hostUri || '').split(':')[0];
const envUrl = process.env.EXPO_PUBLIC_API_URL;
const iosDevUrl = hostCandidate ? `http://${hostCandidate}:3002` : 'http://localhost:3002';
const BASE_URL =
  envUrl ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:3002' : iosDevUrl);

function toWebBaseUrl(apiBaseUrl: string) {
  let webBaseUrl = String(apiBaseUrl || '').replace(/\/$/, '');
  if (webBaseUrl.includes(':3002')) {
    webBaseUrl = webBaseUrl.replace(':3002', ':3000');
  }
  return webBaseUrl.replace(/\/api$/i, '');
}

export const WEB_BASE_URL = toWebBaseUrl(BASE_URL);
export const PRIVACY_POLICY_URL = `${WEB_BASE_URL || 'https://www.unitedlinkgroup.com'}/privacy-policy`;

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

console.log('API base URL', BASE_URL);

api.interceptors.request.use(
  async (config) => {
    const [token, storedUser, storedBusinessId] = await Promise.all([
      AsyncStorage.getItem('token'),
      AsyncStorage.getItem('user'),
      AsyncStorage.getItem('businessId'),
    ]);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    let businessId = String(storedBusinessId || '').trim();
    if (!businessId && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        businessId = String(parsedUser?.businessId || '').trim();
      } catch {
      }
    }

    if (businessId) {
      config.headers['x-business-id'] = businessId;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      try {
        await AsyncStorage.removeItem('token');
      } catch {}
    }
    return Promise.reject(error);
  }
);

export default api;
