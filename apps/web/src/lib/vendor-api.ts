import axios from 'axios';

const vendorApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002',
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
