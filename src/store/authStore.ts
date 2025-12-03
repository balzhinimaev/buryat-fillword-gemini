// Хранилище состояния авторизации
import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { telegramAuth, getStoredTokens, clearStoredTokens, type AuthResponse } from '../services/api';
import { useTelegram } from '../hooks/useTelegram';

export interface User {
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
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isNewUser: boolean;
}

export interface AuthStore {
  state: AuthState;
  login: () => Promise<void>;
  logout: () => void;
}

const AUTH_USER_KEY = 'auth_user';

const loadUser = (): User | null => {
  try {
    const stored = localStorage.getItem(AUTH_USER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const saveUser = (user: User | null): void => {
  if (user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_USER_KEY);
  }
};

export function useAuthStore(): AuthStore {
  const { initData, isReady, isTelegram } = useTelegram();
  
  const [state, setState] = useState<AuthState>(() => {
    const tokens = getStoredTokens();
    const user = loadUser();
    
    return {
      user,
      isAuthenticated: !!tokens && !!user,
      isLoading: false,
      error: null,
      isNewUser: false,
    };
  });

  const login = useCallback(async () => {
    // Если нет initData (не в Telegram), пропускаем авторизацию
    if (!initData) {
      console.log('No Telegram initData available, skipping auth');
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response: AuthResponse = await telegramAuth(initData);
      
      const user: User = {
        telegramId: response.telegramId,
        name: response.name,
        telegramUsername: response.telegramUsername,
        photoUrl: response.photoUrl,
        role: response.role,
        trustScore: response.trustScore,
        stats: response.stats,
      };

      saveUser(user);

      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        isNewUser: response.isNewUser,
      });

      console.log('Auth successful:', response.isNewUser ? 'new user' : 'existing user');
    } catch (error) {
      console.error('Auth failed:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : (error as { message?: string })?.message || 'Ошибка авторизации';

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [initData]);

  const logout = useCallback(() => {
    clearStoredTokens();
    saveUser(null);
    
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isNewUser: false,
    });
  }, []);

  // Автоматическая авторизация при запуске в Telegram
  useEffect(() => {
    if (isReady && isTelegram && initData && !state.isAuthenticated && !state.isLoading) {
      login();
    }
  }, [isReady, isTelegram, initData, state.isAuthenticated, state.isLoading, login]);

  return {
    state,
    login,
    logout,
  };
}

// Context для использования в компонентах
const AuthContext = createContext<AuthStore | null>(null);

export const AuthProvider = AuthContext.Provider;

export function useAuth(): AuthStore {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

