import axios from 'axios';
import { LoginCredentials, LoginResponse } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Интерцептор для добавления токена
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Интерцептор для обработки ошибок
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Токен истёк, попытка обновить
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const newToken = response.data.access_token;
          localStorage.setItem('access_token', newToken);
          // Повторить оригинальный запрос
          error.config.headers.Authorization = `Bearer ${newToken}`;
          return api(error.config);
        } catch (refreshError) {
          // Refresh token тоже истёк, выходим
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    await api.post('/auth/logout', { refresh_token: refreshToken });
  },

  refreshToken: async (refreshToken: string) => {
    const response = await api.post<LoginResponse>('/auth/refresh', { refresh_token: refreshToken });
    return response.data;
  },
};

export default api;
