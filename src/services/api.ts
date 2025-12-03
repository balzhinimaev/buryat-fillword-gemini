// API сервис для работы с бэкендом
const API_URL = import.meta.env.VITE_API_URL || 'https://anoname.ru/api';

// Типы ответов API
export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  telegramId: number;
  name: string;
  telegramUsername?: string;
  photoUrl?: string;
  role: string;
  trustScore: number;
  stats: {
    wordsAdded: number;
    wordsVerified: number;
    wordsApproved: number;
    wordsRejected: number;
    verificationAccuracy: number;
  };
  isNewUser: boolean;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

// Хранение токенов
const TOKEN_KEY = 'auth_tokens';

interface StoredTokens {
  access_token: string;
  refresh_token: string;
}

export const getStoredTokens = (): StoredTokens | null => {
  try {
    const stored = localStorage.getItem(TOKEN_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const setStoredTokens = (tokens: StoredTokens): void => {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
};

export const clearStoredTokens = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

// Базовая функция для API запросов
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const tokens = getStoredTokens();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (tokens?.access_token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${tokens.access_token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      statusCode: response.status,
      message: response.statusText,
    }));
    throw error;
  }

  return response.json();
}

// Авторизация через Telegram
export async function telegramAuth(initData: string): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponse>('/auth/telegram', {
    method: 'POST',
    body: JSON.stringify({ initData }),
  });

  // Сохраняем токены
  setStoredTokens({
    access_token: response.access_token,
    refresh_token: response.refresh_token,
  });

  return response;
}

// Обновление токена
export async function refreshToken(): Promise<{ access_token: string }> {
  const tokens = getStoredTokens();
  
  if (!tokens?.refresh_token) {
    throw new Error('No refresh token available');
  }

  const response = await apiRequest<{ access_token: string }>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: tokens.refresh_token }),
  });

  setStoredTokens({
    ...tokens,
    access_token: response.access_token,
  });

  return response;
}

// Выход
export async function logout(): Promise<void> {
  const tokens = getStoredTokens();
  
  if (tokens?.refresh_token) {
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: tokens.refresh_token }),
      });
    } catch {
      // Игнорируем ошибки при выходе
    }
  }

  clearStoredTokens();
}

// API экспорт
export const api = {
  telegramAuth,
  refreshToken,
  logout,
  getStoredTokens,
  clearStoredTokens,
  
  // Универсальные методы для других запросов
  get: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, data?: unknown) => 
    apiRequest<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(endpoint: string, data?: unknown) => 
    apiRequest<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  delete: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: 'DELETE' }),
};

