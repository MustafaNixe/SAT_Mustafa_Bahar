import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const getApiBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return `${process.env.EXPO_PUBLIC_API_URL}/api/auth`;
  }
  if (Platform.OS === 'android') {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const host = hostUri.split(':')[0];
      if (host === 'localhost' || host === '127.0.0.1') {
        return 'http://10.0.2.2:3001/api/auth';
      }
      return `http://${host}:3001/api/auth`;
    }
    return 'http://10.0.2.2:3001/api/auth';
  }
  if (Constants.expoConfig?.hostUri) {
    const host = Constants.expoConfig.hostUri.split(':')[0];
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:3001/api/auth`;
    }
  }
  return 'http://localhost:3001/api/auth';
};

const API_BASE_URL = getApiBaseUrl();

export type User = {
  id: string;
  username: string;
  email: string;
  createdAt: string;
};

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  fetchUserData: () => Promise<void>;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get: () => AuthState) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      checkAuth: async () => {
        try {
          const state = get();
          if (state.user && state.isAuthenticated) {
            set({ isLoading: false });
            return;
          }
          const storedUser = await AsyncStorage.getItem('auth-user');
          if (storedUser) {
            const user = JSON.parse(storedUser);
            set({ user, isAuthenticated: true, isLoading: false });
          } else {
            set({ user: null, isAuthenticated: false, isLoading: false });
          }
        } catch (error) {
          console.error('Auth check error:', error);
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      login: async (username: string, password: string) => {
        try {
          await AsyncStorage.removeItem('auth-user');
          await AsyncStorage.removeItem('auth-store');
          
          const response = await axios.post(`${API_BASE_URL}/login`, {
            emailOrUsername: username.trim(),
            password,
          }, {
            validateStatus: () => true,
          });

          if (response.status === 200 && response.data && response.data.success && response.data.user) {
            const userData = response.data.user;
            const user: User = {
              id: String(userData.id || userData.Id || userData._id || username.toLowerCase()),
              username: userData.username || userData.Username || username,
              email: userData.email || userData.Email,
              createdAt: userData.createdAt || userData.CreatedAt || userData.created_at || new Date().toISOString(),
            };

            await AsyncStorage.setItem('auth-user', JSON.stringify(user));
            set({ user, isAuthenticated: true, isLoading: false });
            return { success: true };
          } else {
            return { success: false, error: response.data?.message || 'Kullanıcı adı veya şifre hatalı' };
          }
        } catch (error: any) {
          if (error.response) {
            if (error.response.status === 401) {
              return { success: false, error: error.response.data?.message || 'Kullanıcı adı veya şifre hatalı' };
            }
            if (error.response.status === 404) {
              return { success: false, error: 'Kullanıcı adı veya şifre hatalı' };
            }
            if (error.response.data?.message) {
              return { success: false, error: error.response.data.message };
            }
          }
          if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
            return { success: false, error: 'API\'ye bağlanılamadı. Lütfen API sunucusunun çalıştığından emin olun.' };
          }
          return { success: false, error: 'Giriş yapılırken bir hata oluştu' };
        }
      },

      register: async (username: string, email: string, password: string) => {
        try {
          if (!username || username.length < 3) {
            return { success: false, error: 'Kullanıcı adı en az 3 karakter olmalıdır' };
          }

          if (!email || !email.includes('@')) {
            return { success: false, error: 'Geçerli bir e-posta adresi giriniz' };
          }

          if (!password || password.length < 6) {
            return { success: false, error: 'Şifre en az 6 karakter olmalıdır' };
          }

          console.log('Register request URL:', `${API_BASE_URL}/users`);
          console.log('Register request data:', { username: username.trim(), email: email.trim(), password: '***' });

          const response = await axios.post(`${API_BASE_URL}/users`, {
            username: username.trim(),
            email: email.trim(),
            password,
          }, {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 15000,
            validateStatus: (status) => status < 500,
          });

          console.log('Register response:', response.data);

          if (response.data) {
            let userData = null;
            
            if (response.data.users && Array.isArray(response.data.users) && response.data.users.length > 0) {
              userData = response.data.users[0];
            } else if (response.data.user) {
              userData = response.data.user;
            } else if (response.data.Id || response.data.id) {
              userData = response.data;
            }

            if (userData) {
              const user: User = {
                id: String(userData.Id || userData.id || userData._id || username.toLowerCase()),
                username: userData.Username || userData.username || username,
                email: userData.Email || userData.email || email,
                createdAt: userData.CreatedAt || userData.createdAt || userData.created_at || new Date().toISOString(),
              };

              await AsyncStorage.setItem('auth-user', JSON.stringify(user));
              set({ user, isAuthenticated: true });
              return { success: true };
            }
          }

          return { success: false, error: response.data?.message || 'Kayıt olunamadı' };
        } catch (error: any) {
          console.error('Register error:', error);
          console.error('Error response:', error.response?.data);
          console.error('Error status:', error.response?.status);
          
          if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
            return { success: false, error: 'API\'ye bağlanılamadı. Lütfen API sunucusunun çalıştığından emin olun.' };
          }

          if (error.response?.data?.message) {
            return { success: false, error: error.response.data.message };
          }

          if (error.response?.data?.error) {
            return { success: false, error: error.response.data.error };
          }

          if (error.response?.status === 409) {
            return { success: false, error: 'Bu kullanıcı adı veya e-posta zaten kullanılıyor' };
          }

          if (error.response?.status === 400) {
            return { success: false, error: error.response.data?.message || 'Geçersiz veri gönderildi' };
          }

          return { success: false, error: error.message || 'Kayıt olurken bir hata oluştu' };
        }
      },

      fetchUserData: async () => {
        try {
          const state = get();
          if (!state.user || !state.isAuthenticated || !state.user.id) {
            return;
          }

          const response = await axios.get(`${API_BASE_URL}/users`);

          if (response.data && response.data.success && response.data.users && response.data.users.length > 0) {
            const currentUser = response.data.users.find(
              (u: any) => {
                const userId = String(u.Id || u.id || u._id);
                const userUsername = u.Username || u.username;
                const userEmail = u.Email || u.email;
                return userId === state.user?.id || 
                       userUsername === state.user?.username ||
                       userEmail === state.user?.email;
              }
            );

            if (currentUser && currentUser.Username === state.user.username) {
              const user: User = {
                id: String(currentUser.Id || currentUser.id || currentUser._id || state.user.id),
                username: currentUser.Username || currentUser.username || state.user.username,
                email: currentUser.Email || currentUser.email || state.user.email,
                createdAt: currentUser.CreatedAt || currentUser.createdAt || currentUser.created_at || state.user.createdAt,
              };

              await AsyncStorage.setItem('auth-user', JSON.stringify(user));
              set({ user, isAuthenticated: true });
            }
          }
        } catch (error) {
          console.error('Fetch user data error:', error);
        }
      },

      logout: async () => {
        try {
          set({ user: null, isAuthenticated: false, isLoading: false });
          await AsyncStorage.removeItem('auth-user');
          await AsyncStorage.removeItem('auth-store');
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error('Logout error:', error);
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state: AuthState) => ({ 
        user: state.user,
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);

