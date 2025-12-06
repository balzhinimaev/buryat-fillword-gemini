// Хранилище состояния авторизации
import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { telegramAuth, getStoredTokens, clearStoredTokens, refreshToken, AUTH_REQUIRED_EVENT, type AuthResponse } from '../services/api';
import { useTelegram } from '../hooks/useTelegram';

export interface User {
  _id: string;
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
        _id: response._id,
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

      console.log('Auth successful:', response.isNewUser ? 'new user' : 'existing user', 'userId:', response._id);
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

  // Флаг для предотвращения повторного рефреша/логина
  const hasTriedAuthRef = useRef(false);
  // Флаг для отслеживания, что сейчас идёт переавторизация через событие
  const isReauthenticatingRef = useRef(false);

  // Автоматическая авторизация при запуске
  // 1. Если есть токен - пробуем рефрешнуть
  // 2. Если рефреш не удался или токена нет - логинимся через initData
  useEffect(() => {
    const authenticateOnStart = async () => {
      // Предотвращаем повторные попытки
      if (hasTriedAuthRef.current || !isReady) return;
      hasTriedAuthRef.current = true;

      const tokens = getStoredTokens();
      
      // Если есть refresh_token - пробуем обновить
      if (tokens?.refresh_token) {
        console.log('🔄 Обновление токена при старте приложения...');
        
        try {
          await refreshToken();
          console.log('✅ Токен успешно обновлён при старте');
          return; // Успех - выходим
        } catch (error) {
          console.error('❌ Не удалось обновить токен при старте:', error);
          
          // Если уже идёт переавторизация через событие - не дублируем
          if (isReauthenticatingRef.current) {
            console.log('⏭️ Переавторизация уже запущена через событие, пропускаем...');
            return;
          }
          
          // Очищаем невалидные токены
          clearStoredTokens();
          saveUser(null);
          setState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            isNewUser: false,
          });
        }
      }

      // Если уже идёт переавторизация через событие - не дублируем
      if (isReauthenticatingRef.current) {
        console.log('⏭️ Переавторизация уже запущена через событие, пропускаем авторизацию...');
        return;
      }

      // Если мы в Telegram и есть initData - логинимся заново
      if (isTelegram && initData) {
        console.log('🔐 Выполняем авторизацию через Telegram...');
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
          const response: AuthResponse = await telegramAuth(initData);
          
          const user: User = {
            _id: response._id,
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

          console.log('✅ Авторизация успешна:', response.isNewUser ? 'новый пользователь' : 'существующий пользователь', 'userId:', response._id);
        } catch (error) {
          console.error('❌ Ошибка авторизации:', error);
          
          const errorMessage = error instanceof Error 
            ? error.message 
            : (error as { message?: string })?.message || 'Ошибка авторизации';

          setState(prev => ({
            ...prev,
            isLoading: false,
            error: errorMessage,
          }));
        }
      }
    };

    authenticateOnStart();
  }, [isReady, isTelegram, initData]);

  // Слушаем событие о необходимости переавторизации (когда refresh token истёк)
  useEffect(() => {
    const handleAuthRequired = async () => {
      // Предотвращаем повторные переавторизации
      if (isReauthenticatingRef.current) {
        console.log('⏭️ Переавторизация уже в процессе, пропускаем...');
        return;
      }
      
      console.log('🔐 Получен запрос на переавторизацию...');
      isReauthenticatingRef.current = true;
      
      // Очищаем данные пользователя
      saveUser(null);
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        error: null,
        isNewUser: false,
      });

      // Если мы в Telegram и есть initData - логинимся заново
      if (isTelegram && initData) {
        console.log('🔐 Выполняем переавторизацию через Telegram...');
        
        try {
          const response: AuthResponse = await telegramAuth(initData);
          
          const user: User = {
            _id: response._id,
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

          console.log('✅ Переавторизация успешна');
        } catch (error) {
          console.error('❌ Ошибка переавторизации:', error);
          
          const errorMessage = error instanceof Error 
            ? error.message 
            : (error as { message?: string })?.message || 'Ошибка авторизации';

          setState(prev => ({
            ...prev,
            isLoading: false,
            error: errorMessage,
          }));
        } finally {
          isReauthenticatingRef.current = false;
        }
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Требуется авторизация',
        }));
        isReauthenticatingRef.current = false;
      }
    };

    window.addEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired);
    return () => window.removeEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired);
  }, [isTelegram, initData]);

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

