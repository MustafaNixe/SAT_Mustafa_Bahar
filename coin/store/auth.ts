import { loginAPI, logoutAPI, registerAPI, setAuthToken } from '@/services/auth-api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type User = {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  token?: string;
};

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  useAPI: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  setUseAPI: (use: boolean) => void;
};

const usersStorage: Record<string, { password: string; email: string; createdAt: string }> = {};

usersStorage['demo'] = {
  password: 'demo123',
  email: 'demo@example.com',
  createdAt: new Date().toISOString(),
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get: () => AuthState) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      useAPI: true,

      setUseAPI: (use: boolean) => {
        set({ useAPI: use });
        AsyncStorage.setItem('auth-use-api', JSON.stringify(use));
      },

      checkAuth: async () => {
        try {
          const useAPI = await AsyncStorage.getItem('auth-use-api');
          const shouldUseAPI = useAPI ? JSON.parse(useAPI) : false;
          
          const state = get();
          if (state.user && state.isAuthenticated) {
            if (state.user.token) {
              setAuthToken(state.user.token);
            }
            set({ useAPI: shouldUseAPI, isLoading: false });
            return;
          }
          
          const storedUser = await AsyncStorage.getItem('auth-user');
          if (storedUser) {
            const user = JSON.parse(storedUser);
            if (user.token) {
              setAuthToken(user.token);
            }
            set({ user, isAuthenticated: true, useAPI: shouldUseAPI, isLoading: false });
          } else {
            set({ user: null, isAuthenticated: false, useAPI: shouldUseAPI, isLoading: false });
          }
        } catch (error) {
          console.error('Auth check error:', error);
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      login: async (username: string, password: string) => {
        try {
          const state = get();
          const shouldUseAPI = state.useAPI;

          if (shouldUseAPI) {
            const result = await loginAPI({ username, password });
            
            if (result.success && result.user) {
              const user: User = {
                id: result.user.id,
                username: result.user.username,
                email: result.user.email,
                createdAt: result.user.createdAt,
                token: result.user.token,
              };

              await AsyncStorage.setItem('auth-user', JSON.stringify(user));
              set({ user, isAuthenticated: true });
              return { success: true };
            }
            
            return { success: false, error: result.error };
          }

          await new Promise(resolve => setTimeout(resolve, 500));

          const userData = usersStorage[username.toLowerCase()];
          
          if (!userData) {
            return { success: false, error: 'Kullanıcı adı veya şifre hatalı' };
          }

          if (userData.password !== password) {
            return { success: false, error: 'Kullanıcı adı veya şifre hatalı' };
          }

          const user: User = {
            id: username.toLowerCase(),
            username,
            email: userData.email,
            createdAt: userData.createdAt,
          };

          await AsyncStorage.setItem('auth-user', JSON.stringify(user));
          set({ user, isAuthenticated: true });
          return { success: true };
        } catch (error) {
          console.error('Login error:', error);
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

          const state = get();
          const shouldUseAPI = state.useAPI;

          if (shouldUseAPI) {
            const result = await registerAPI({ username, email, password });
            
            if (result.success && result.user) {
              const user: User = {
                id: result.user.id,
                username: result.user.username,
                email: result.user.email,
                createdAt: result.user.createdAt,
                token: result.user.token,
              };

              await AsyncStorage.setItem('auth-user', JSON.stringify(user));
              set({ user, isAuthenticated: true });
              return { success: true };
            }
            
            return { success: false, error: result.error };
          }

          if (usersStorage[username.toLowerCase()]) {
            return { success: false, error: 'Bu kullanıcı adı zaten kullanılıyor' };
          }

          await new Promise(resolve => setTimeout(resolve, 500));

          usersStorage[username.toLowerCase()] = {
            password,
            email,
            createdAt: new Date().toISOString(),
          };

          const user: User = {
            id: username.toLowerCase(),
            username,
            email,
            createdAt: new Date().toISOString(),
          };

          await AsyncStorage.setItem('auth-user', JSON.stringify(user));
          set({ user, isAuthenticated: true });
          return { success: true };
        } catch (error) {
          console.error('Register error:', error);
          return { success: false, error: 'Kayıt olurken bir hata oluştu' };
        }
      },

      logout: async () => {
        try {
          const state = get();
          if (state.useAPI && state.user?.token) {
            await logoutAPI();
          }
          await AsyncStorage.removeItem('auth-user');
          setAuthToken(null);
          set({ user: null, isAuthenticated: false });
        } catch (error) {
          console.error('Logout error:', error);
        }
      },
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state: AuthState) => ({ 
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        useAPI: state.useAPI,
      }),
    }
  )
);

