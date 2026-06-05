import axios from 'axios';

const defaultBaseUrl =
  typeof window === 'undefined'
    ? process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:3002'
    : '/api';

const vendorApi = axios.create({
  baseURL: defaultBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

vendorApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('vendor_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

vendorApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('vendor_token');
      localStorage.removeItem('vendor_portal_slug');
      if (!window.location.pathname.startsWith('/vendor/login')) {
        window.location.href = '/vendor/login';
      }
    }
    return Promise.reject(error);
  }
);

export default vendorApi;
