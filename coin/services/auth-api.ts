import axios from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export type LoginRequest = {
  username: string;
  password: string;
};

export type RegisterRequest = {
  username: string;
  email: string;
  password: string;
};

export type AuthResponse = {
  success: boolean;
  user?: {
    id: string;
    username: string;
    email: string;
    createdAt: string;
    token?: string;
  };
  error?: string;
};

export async function loginAPI(data: LoginRequest): Promise<AuthResponse> {
  try {
    const response = await apiClient.post<AuthResponse>('/auth/login', data);
    
    if (response.data.success && response.data.user) {
      if (response.data.user.token) {
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${response.data.user.token}`;
      }
      return response.data;
    }
    
    return {
      success: false,
      error: response.data.error || 'Giriş yapılamadı',
    };
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        return {
          success: false,
          error: error.response.data?.error || error.response.data?.message || 'Giriş yapılamadı',
        };
      }
      if (error.request) {
        return {
          success: false,
          error: 'Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.',
        };
      }
    }
    return {
      success: false,
      error: 'Giriş yapılırken bir hata oluştu',
    };
  }
}

export async function registerAPI(data: RegisterRequest): Promise<AuthResponse> {
  try {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    
    if (response.data.success && response.data.user) {
      if (response.data.user.token) {
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${response.data.user.token}`;
      }
      return response.data;
    }
    
    return {
      success: false,
      error: response.data.error || 'Kayıt olunamadı',
    };
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        return {
          success: false,
          error: error.response.data?.error || error.response.data?.message || 'Kayıt olunamadı',
        };
      }
      if (error.request) {
        return {
          success: false,
          error: 'Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.',
        };
      }
    }
    return {
      success: false,
      error: 'Kayıt olurken bir hata oluştu',
    };
  }
}

export async function logoutAPI(): Promise<void> {
  try {
    await apiClient.post('/auth/logout');
  } catch (error) {
    console.warn('Logout API error:', error);
  } finally {
    delete apiClient.defaults.headers.common['Authorization'];
  }
}

export function setAuthToken(token: string | null) {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
}

export default apiClient;

