import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
console.log('API Base URL:', baseURL);

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  console.log('Request interceptor - Token:', token ? 'Present' : 'None');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log('Making request to:', config.url, 'with method:', config.method);
  return config;
});

// Response interceptor for 401 handling
api.interceptors.response.use(
  (response) => {
    console.log('Response received:', response.config.url, 'Status:', response.status);
    return response;
  },
  (error) => {
    console.error('Response error:', error.config?.url, 'Status:', error.response?.status);
    console.error('Error details:', error.response?.data);
    if (error.response?.status === 401 && !error.config.url?.includes('/auth/')) {
      console.log('Unauthorized - redirecting to login');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
