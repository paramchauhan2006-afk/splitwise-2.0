import { create } from 'zustand';
import { api } from '../lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  upiId?: string | null;
}

interface AuthState {
  currentUser: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  currentUser: null,
  token: null,
  isLoading: true,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      console.log('Attempting login...', { email });
      const response = await api.post('/auth/login', { email, password });
      console.log('Login response:', response.data);
      set({ currentUser: response.data.data.user, token: response.data.data.token, isLoading: false });
      console.log('Login successful, user and token set');
    } catch (error: any) {
      console.error('Login failed:', error);
      console.error('Error response:', error.response?.data);
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      console.log('Attempting registration...', { name: data.name, email: data.email });
      const response = await api.post('/auth/register', data);
      console.log('Registration response:', response.data);
      set({ currentUser: response.data.data.user, token: response.data.data.token, isLoading: false });
      console.log('Registration successful, user and token set');
    } catch (error: any) {
      console.error('Registration failed:', error);
      console.error('Error response:', error.response?.data);
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    await api.post('/auth/logout');
    set({ currentUser: null, token: null });
  },

  fetchMe: async () => {
    set({ isLoading: true });
    const token = get().token;
    if (!token) {
      set({ currentUser: null, isLoading: false });
      return;
    }
    try {
      const response = await api.get('/auth/me');
      set({ currentUser: response.data.data.user, isLoading: false });
    } catch (error) {
      set({ currentUser: null, token: null, isLoading: false });
    }
  },

  setUser: (user) => {
    set({ currentUser: user });
  },
}));