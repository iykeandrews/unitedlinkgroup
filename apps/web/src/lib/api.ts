import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const selectedBusiness = localStorage.getItem('selectedBusiness');
    if (selectedBusiness) {
        try {
            const business = JSON.parse(selectedBusiness);
            if (business?.id) {
                config.headers['x-business-id'] = business.id;
            }
        } catch (e) {
            // Ignore invalid JSON
        }
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        // Clear storage
        localStorage.removeItem('token');
        localStorage.removeItem('selectedBusiness');
        
        // Redirect to login if not already there
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
