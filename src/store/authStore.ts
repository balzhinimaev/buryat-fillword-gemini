// Хранилище состояния авторизации
import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { 
  telegramAuth,
  vkAuth,
  requestEmailOtp,
  verifyEmailOtp,
  getStoredTokens, 
  clearStoredTokens, 
  refreshToken, 
  AUTH_REQUIRED_EVENT, 
  type AuthResponse,
  type EmailOtpRequestResponse,
  getMe,
  resolvePaywallEligibility,
  type MeResponse,
  type MeStreakInfo,
  type MeCampaignStats,
  type MeXpInfo,
  type AgeRange,
  type BuriatLevel,
  type ReminderPlan,
  type ReminderTime,
  emailPasswordLogin,
  emailPasswordRegister,
  resetPasswordWithCode,
  vkMiniAppAuth,
} from '../services/api';
import { useTelegram } from '../hooks/useTelegram';
import { OFFLINE } from '../config/offline';
import { IS_VK_MINIAPP, VK_LAUNCH_PARAMS } from '../services/vkMiniApp';
import { offlineMe } from '../services/offlineStubs';
import { takePkce, VK_REDIRECT_URI, type VkReturn } from '../services/vkAuth';

export interface User {
  _id: string;
  telegramId?: number;
  name: string;
  telegramUsername?: string;
  photoUrl?: string;
  languageCode?: string;
  isPremium?: boolean;
  isLanguageKeeper?: boolean;
  languageKeeperJoinedAt?: string;
  paywallEligible?: boolean;
  role: string;
  trustScore: number;

  // Статистика вклада в словарь
  stats: {
    wordsAdded: number;
    wordsVerified: number;
    wordsApproved: number;
    wordsRejected: number;
    verificationAccuracy: number;
  };

  // Серия дней
  streak?: MeStreakInfo;
  // Статистика кампании
  campaignStats?: MeCampaignStats;
  // Опыт и уровень
  xp?: MeXpInfo;

  isBanned?: boolean;
  lastActiveAt?: string;
  createdAt?: string;
  // Поля онбординга
  onboardingCompleted: boolean;
  onboardingStep?: string;
  ageRange?: AgeRange;
  buriatLevel?: BuriatLevel;
  reminderPlan?: ReminderPlan;
  reminderTime?: ReminderTime;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isCheckingSession: boolean;
  error: string | null;
  isNewUser: boolean;
  onboardingCompleted: boolean;
}

export interface AuthStore {
  state: AuthState;
  login: () => Promise<void>;
  vkLogin: (ret: VkReturn) => Promise<void>;
  requestEmailOtp: (email: string) => Promise<EmailOtpRequestResponse>;
  verifyEmailOtp: (email: string, code: string) => Promise<void>;
  passwordLogin: (email: string, password: string) => Promise<void>;
  passwordRegister: (email: string, name: string, password: string) => Promise<void>;
  passwordReset: (email: string, code: string, newPassword: string) => Promise<void>;
  clearError: () => void;
  logout: () => void;
  setOnboardingCompleted: (user: User) => void;
  setUserName: (name: string) => void;
  refreshUser: () => Promise<void>;
  /** Повторный автологин в VK Mini App (свежими launch-параметрами) */
  reauthVkMiniApp: () => Promise<void>;
}

const AUTH_USER_KEY = 'auth_user';

const loadUser = (): User | null => {
  try {
    const stored = localStorage.getItem(AUTH_USER_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as User;
  } catch {
    return null;
  }
};

const saveUser = (user: User | null): void => {
  // fail-safe: в VK Mini App / iframe / Safari ITP localStorage может бросать
  // (SecurityError/QuotaError). Персистентность профиля опциональна — состояние
  // всё равно живёт в React на сессию; бросок здесь ронял вход и завершение
  // онбординга (тупик), поэтому глотаем ошибку.
  try {
    if (user) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_USER_KEY);
    }
  } catch {
    /* localStorage недоступен — профиль остаётся только в памяти сессии */
  }
};

const mapAuthResponseToUser = (response: AuthResponse): User => ({
  _id: response._id ?? '',
  telegramId: response.telegramId,
  name: response.name,
  telegramUsername: response.telegramUsername,
  photoUrl: response.photoUrl,
  isLanguageKeeper: response.isLanguageKeeper,
  languageKeeperJoinedAt: response.languageKeeperJoinedAt,
  role: response.role,
  trustScore: response.trustScore ?? 0,
  stats: response.stats ?? {
    wordsAdded: 0,
    wordsVerified: 0,
    wordsApproved: 0,
    wordsRejected: 0,
    verificationAccuracy: 0,
  },
  // streak/campaignStats/xp придут из /auth/me
  streak: response.currentStreak != null
    ? { current: response.currentStreak, longest: response.currentStreak }
    : undefined,
  onboardingCompleted: response.onboardingCompleted,
  onboardingStep: response.onboardingStep,
  ageRange: response.ageRange,
  buriatLevel: response.buriatLevel,
  reminderPlan: response.reminderPlan,
  reminderTime: response.reminderTime,
});

const mapMeResponseToUser = (me: MeResponse, prevUser?: User | null): User => ({
  _id: me.id,
  telegramId: me.telegramId,
  name: me.name,
  telegramUsername: me.telegramUsername,
  photoUrl: me.photoUrl,
  languageCode: me.languageCode,
  isPremium: me.isPremium,
  isLanguageKeeper: me.isLanguageKeeper ?? prevUser?.isLanguageKeeper,
  languageKeeperJoinedAt: me.languageKeeperJoinedAt ?? prevUser?.languageKeeperJoinedAt,
  paywallEligible: resolvePaywallEligibility(me),
  role: me.role,
  trustScore: me.trustScore,
  stats: {
    wordsAdded: me.stats?.wordsAdded ?? prevUser?.stats.wordsAdded ?? 0,
    wordsVerified: me.stats?.wordsVerified ?? prevUser?.stats.wordsVerified ?? 0,
    wordsApproved: me.stats?.wordsApproved ?? prevUser?.stats.wordsApproved ?? 0,
    wordsRejected: me.stats?.wordsRejected ?? prevUser?.stats.wordsRejected ?? 0,
    verificationAccuracy: me.stats?.verificationAccuracy ?? prevUser?.stats.verificationAccuracy ?? 0,
  },
  streak: me.streak ?? prevUser?.streak,
  campaignStats: me.campaignStats ?? prevUser?.campaignStats,
  xp: me.xp ?? prevUser?.xp,
  isBanned: me.isBanned ?? prevUser?.isBanned,
  lastActiveAt: me.lastActiveAt ?? prevUser?.lastActiveAt,
  createdAt: me.createdAt ?? prevUser?.createdAt,
  onboardingCompleted: me.onboardingCompleted,
  onboardingStep: me.onboardingStep,
  ageRange: me.ageRange,
  buriatLevel: me.buriatLevel,
  reminderPlan: me.reminderPlan,
  reminderTime: me.reminderTime,
});

const normalizeAuthErrorMessage = (error: unknown, fallback: string): string => {
  const messageRaw = (error as { message?: unknown })?.message;
  const message = Array.isArray(messageRaw)
    ? String(messageRaw[0] ?? fallback)
    : typeof messageRaw === 'string'
      ? messageRaw
      : fallback;

  if (!message || message === 'Internal server error') {
    return 'Сервер временно недоступен. Попробуйте ещё раз через пару секунд.';
  }

  if (message === 'Failed to fetch') {
    return 'Нет соединения с сервером. Проверьте интернет и попробуйте снова.';
  }

  if (message.toLowerCase() === 'unauthorized') {
    return 'Сессия устарела. Сейчас переподключимся автоматически…';
  }

  return message;
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
      isCheckingSession: false,
      error: null,
      isNewUser: false,
      onboardingCompleted: user?.onboardingCompleted ?? false,
    };
  });

  const login = useCallback(async () => {
    // Если нет initData (не в Telegram), пропускаем авторизацию
    if (!initData) {
      console.log('No Telegram initData available, skipping auth');
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, isCheckingSession: false, error: null }));

    try {
      const response: AuthResponse = await telegramAuth(initData);
      
      let user: User = mapAuthResponseToUser(response);

      // Подтягиваем актуальные данные пользователя (level/xp и т.д.)
      try {
        const me = await getMe();
        user = mapMeResponseToUser(me, user);
      } catch (e) {
        console.log('⚠️ Не удалось загрузить /auth/me после логина:', e);
      }

      saveUser(user);

      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        isCheckingSession: false,
        error: null,
        isNewUser: !!response.isNewUser,
        onboardingCompleted: response.onboardingCompleted,
      });

      console.log('Auth successful:', response.isNewUser ? 'new user' : 'existing user', 'userId:', response._id, 'onboarding:', response.onboardingCompleted);
    } catch (error) {
      console.error('Auth failed:', error);
      
      const errorMessage = normalizeAuthErrorMessage(error, 'Ошибка авторизации');

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [initData]);

  // Вход через VK ID: code+device_id из редиректа + сохранённый code_verifier (PKCE) → наш JWT.
  const vkLogin = useCallback(async (ret: VkReturn) => {
    setState(prev => ({ ...prev, isLoading: true, isCheckingSession: false, error: null }));
    try {
      const codeVerifier = takePkce(ret.state);
      if (!codeVerifier) throw new Error('Сессия VK устарела, попробуйте снова');
      const response: AuthResponse = await vkAuth({
        code: ret.code,
        codeVerifier,
        deviceId: ret.deviceId,
        redirectUri: VK_REDIRECT_URI,
      });
      let user: User = mapAuthResponseToUser(response);
      try {
        const me = await getMe();
        user = mapMeResponseToUser(me, user);
      } catch (e) {
        console.log('⚠️ Не удалось загрузить /auth/me после VK-логина:', e);
      }
      saveUser(user);
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        isCheckingSession: false,
        error: null,
        isNewUser: !!response.isNewUser,
        onboardingCompleted: response.onboardingCompleted,
      });
    } catch (error) {
      console.error('VK auth failed:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: normalizeAuthErrorMessage(error, 'Ошибка входа через VK'),
      }));
    }
  }, []);

  const requestEmailOtpCode = useCallback(async (email: string): Promise<EmailOtpRequestResponse> => {
    setState(prev => ({ ...prev, isLoading: true, isCheckingSession: false, error: null }));

    try {
      const response = await requestEmailOtp(email);
      setState(prev => ({ ...prev, isLoading: false, error: null }));
      return response;
    } catch (error) {
      const errorMessage = normalizeAuthErrorMessage(error, 'Не удалось отправить код');

      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      throw error;
    }
  }, []);

  const verifyEmailOtpCode = useCallback(async (email: string, code: string) => {
    setState(prev => ({ ...prev, isLoading: true, isCheckingSession: false, error: null }));

    try {
      const response = await verifyEmailOtp(email, code);
      let user: User = mapAuthResponseToUser(response);

      try {
        const me = await getMe();
        user = mapMeResponseToUser(me, user);
      } catch (e) {
        console.log('⚠️ Не удалось загрузить /auth/me после email OTP:', e);
      }

      saveUser(user);

      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        isCheckingSession: false,
        error: null,
        isNewUser: !!response.isNewUser,
        onboardingCompleted: response.onboardingCompleted,
      });
    } catch (error) {
      const errorMessage = normalizeAuthErrorMessage(error, 'Неверный или просроченный код');

      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      throw error;
    }
  }, []);

  // Общий финал входа: маппинг ответа, догрузка /auth/me, установка сессии
  const applyAuthResponse = useCallback(async (response: AuthResponse) => {
    let user: User = mapAuthResponseToUser(response);
    try {
      const me = await getMe();
      user = mapMeResponseToUser(me, user);
    } catch (e) {
      console.log('⚠️ Не удалось загрузить /auth/me после входа:', e);
    }
    saveUser(user);
    setState({
      user,
      isAuthenticated: true,
      isLoading: false,
      isCheckingSession: false,
      error: null,
      isNewUser: !!response.isNewUser,
      onboardingCompleted: response.onboardingCompleted,
    });
  }, []);

  const passwordLogin = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true, isCheckingSession: false, error: null }));
    try {
      const response = await emailPasswordLogin(email, password);
      await applyAuthResponse(response);
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: normalizeAuthErrorMessage(error, 'Неверный email или пароль'),
      }));
      throw error;
    }
  }, [applyAuthResponse]);

  const passwordRegister = useCallback(async (email: string, name: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true, isCheckingSession: false, error: null }));
    try {
      const response = await emailPasswordRegister(email, name, password);
      await applyAuthResponse(response);
    } catch (error) {
      const raw = (error as { message?: string })?.message || '';
      const friendly = /already exists/i.test(raw)
        ? 'Такой email уже зарегистрирован — попробуйте войти'
        : normalizeAuthErrorMessage(error, 'Не удалось зарегистрироваться');
      setState(prev => ({ ...prev, isLoading: false, error: friendly }));
      throw error;
    }
  }, [applyAuthResponse]);

  const passwordReset = useCallback(async (email: string, code: string, newPassword: string) => {
    setState(prev => ({ ...prev, isLoading: true, isCheckingSession: false, error: null }));
    try {
      const response = await resetPasswordWithCode(email, code, newPassword);
      await applyAuthResponse(response);
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: normalizeAuthErrorMessage(error, 'Неверный или просроченный код'),
      }));
      throw error;
    }
  }, [applyAuthResponse]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const logout = useCallback(() => {
    clearStoredTokens();
    saveUser(null);
    
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isCheckingSession: false,
      error: null,
      isNewUser: false,
      onboardingCompleted: false,
    });
  }, []);

  // Обновление данных пользователя после онбординга
  const setOnboardingCompleted = useCallback((updatedUser: User) => {
    saveUser(updatedUser);
    setState(prev => ({
      ...prev,
      user: updatedUser,
      onboardingCompleted: updatedUser.onboardingCompleted,
      isNewUser: false, // После онбординга уже не новый
    }));
  }, []);

  // Обновление имени пользователя (локально после успешного запроса)
  const setUserName = useCallback((name: string) => {
    setState(prev => {
      if (!prev.user) return prev;
      const updatedUser: User = { ...prev.user, name };
      saveUser(updatedUser);
      return {
        ...prev,
        user: updatedUser,
      };
    });
  }, []);

  // Повторный VK-автологин (для кнопки на экране входа, если стартовый упал).
  // Используем мини-апп-авторизацию (launch-параметры), а НЕ web-OAuth —
  // redirect на id.vk.com внутри iframe VK ломается.
  const reauthVkMiniApp = useCallback(async () => {
    if (!IS_VK_MINIAPP || !VK_LAUNCH_PARAMS) return;
    setState(prev => ({ ...prev, isLoading: true, isCheckingSession: false, error: null }));
    try {
      const response = await vkMiniAppAuth(VK_LAUNCH_PARAMS);
      await applyAuthResponse(response);
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: normalizeAuthErrorMessage(error, 'Не удалось войти через ВКонтакте'),
      }));
    }
  }, [applyAuthResponse]);

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
      if (hasTriedAuthRef.current) return;

      // Офлайн-режим: без сети и без Telegram — заходим под локальным игроком.
      // Профиль каждый раз обогащаем локальной статистикой (стрик/кампания/XP),
      // чтобы карточка профиля и экран статистики показывали реальные цифры.
      if (OFFLINE) {
        hasTriedAuthRef.current = true;
        const stored = loadUser();
        const me = offlineMe();
        const offlineUser: User = {
          _id: stored?._id || 'offline_user',
          name: stored?.name || me.name,
          telegramId: stored?.telegramId,
          telegramUsername: stored?.telegramUsername,
          photoUrl: stored?.photoUrl,
          role: stored?.role || 'user',
          trustScore: stored?.trustScore ?? 0,
          stats: stored?.stats ?? {
            wordsAdded: 0,
            wordsVerified: 0,
            wordsApproved: 0,
            wordsRejected: 0,
            verificationAccuracy: 0,
          },
          streak: me.streak ?? stored?.streak,
          campaignStats: me.campaignStats ?? stored?.campaignStats,
          xp: me.xp ?? stored?.xp,
          onboardingCompleted: true,
        };
        saveUser(offlineUser);
        setState({
          user: offlineUser,
          isAuthenticated: true,
          isLoading: false,
          isCheckingSession: false,
          error: null,
          isNewUser: false,
          onboardingCompleted: true,
        });
        return;
      }

      if (!isReady) return;
      hasTriedAuthRef.current = true;
      setState(prev => ({ ...prev, isCheckingSession: true, error: null }));

      const tokens = getStoredTokens();
      
      // Если есть refresh_token - пробуем обновить
      if (tokens?.refresh_token) {
        console.log('🔄 Обновление токена при старте приложения...');
        
        try {
          const refreshData = await refreshToken();

          if (typeof refreshData.currentStreak === 'number') {
            setState(prev => {
              if (!prev.user) return prev;
              const updatedUser = { ...prev.user, currentStreak: refreshData.currentStreak };
              saveUser(updatedUser);
              return { ...prev, user: updatedUser };
            });
          }

          // После успешного рефреша — обновляем профиль через /auth/me
          try {
            const me = await getMe();
            setState(prev => {
              const updatedUser = mapMeResponseToUser(me, prev.user);
              saveUser(updatedUser);
              return { ...prev, user: updatedUser, isAuthenticated: true };
            });
          } catch (e) {
            console.log('⚠️ Не удалось обновить профиль через /auth/me при старте:', e);
          }

          console.log('✅ Токен успешно обновлён при старте');
          setState(prev => ({ ...prev, isLoading: false, isCheckingSession: false }));
          return; // Успех - выходим
        } catch (error) {
          console.error('❌ Не удалось обновить токен при старте:', error);

          // Если уже идёт переавторизация через событие - не дублируем
          if (isReauthenticatingRef.current) {
            console.log('⏭️ Переавторизация уже запущена через событие, пропускаем...');
            setState(prev => ({ ...prev, isLoading: false, isCheckingSession: false }));
            return;
          }

          const statusCode = (error as { statusCode?: number })?.statusCode;
          const isInvalidRefresh = statusCode === 401 || statusCode === 403;

          // VK Mini App: не выкидываем на экран входа при неудачном refresh —
          // ниже переавторизуемся свежими подписанными launch-параметрами.
          const canVkReauth = IS_VK_MINIAPP && !!VK_LAUNCH_PARAMS;

          if (isInvalidRefresh) {
            // Только при явной невалидной сессии делаем полный logout.
            clearStoredTokens();
            saveUser(null);
            if (!canVkReauth) {
              setState({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                isCheckingSession: false,
                error: null,
                isNewUser: false,
                onboardingCompleted: false,
              });
              return;
            }
            // проваливаемся к VK-автологину ниже
          } else {
            // Временный сетевой/серверный сбой: не выкидываем пользователя из сессии.
            console.log('⏳ Временный сбой refresh при старте, сохраняем локальную сессию');
            if (!canVkReauth) {
              setState(prev => ({
                ...prev,
                isLoading: false,
                isCheckingSession: false,
                error: null,
              }));
              return;
            }
            // в VK Mini App всё равно пробуем свежий VK-автологин ниже
          }
        }
      }

      // Если уже идёт переавторизация через событие - не дублируем
      if (isReauthenticatingRef.current) {
        console.log('⏭️ Переавторизация уже запущена через событие, пропускаем авторизацию...');
        setState(prev => ({ ...prev, isLoading: false, isCheckingSession: false }));
        return;
      }

      // VK Mini App: подписанные launch-параметры — автологин без экрана входа
      if (IS_VK_MINIAPP && VK_LAUNCH_PARAMS) {
        console.log('🔐 Автовход VK Mini App...');
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        try {
          const response = await vkMiniAppAuth(VK_LAUNCH_PARAMS);
          await applyAuthResponse(response);
          console.log('✅ VK Mini App: вход выполнен');
        } catch (error) {
          console.error('❌ VK Mini App auth failed:', error);
          setState(prev => ({
            ...prev,
            isLoading: false,
            isCheckingSession: false,
            error: normalizeAuthErrorMessage(error, 'Не удалось войти через ВКонтакте'),
          }));
        }
        return;
      }

      // Если мы в Telegram и есть initData - логинимся заново
      if (isTelegram && initData) {
        console.log('🔐 Выполняем авторизацию через Telegram...');
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
          const response: AuthResponse = await telegramAuth(initData);
          
          let user: User = mapAuthResponseToUser(response);

          try {
            const me = await getMe();
            user = mapMeResponseToUser(me, user);
          } catch (e) {
            console.log('⚠️ Не удалось загрузить /auth/me после авто-логина:', e);
          }

          saveUser(user);

          setState({
            user,
            isAuthenticated: true,
            isLoading: false,
            isCheckingSession: false,
            error: null,
            isNewUser: !!response.isNewUser,
            onboardingCompleted: response.onboardingCompleted,
          });

          console.log('✅ Авторизация успешна:', response.isNewUser ? 'новый пользователь' : 'существующий пользователь', 'userId:', response._id, 'onboarding:', response.onboardingCompleted);
        } catch (error) {
          console.error('❌ Ошибка авторизации:', error);
          
          const errorMessage = normalizeAuthErrorMessage(error, 'Ошибка авторизации');

          setState(prev => ({
            ...prev,
            isLoading: false,
            isCheckingSession: false,
            error: errorMessage,
          }));
        }
      }

      setState(prev => ({ ...prev, isLoading: false, isCheckingSession: false }));
    };

    authenticateOnStart();
  }, [isReady, isTelegram, initData]);

  // Слушаем событие о необходимости переавторизации (когда refresh token истёк)
  useEffect(() => {
    const handleAuthRequired = async () => {
      // Офлайн-сборка: протухший токен НЕ выбивает локального игрока на экран входа —
      // игра продолжается на локальных данных, а синк попросит перелогин позже.
      if (OFFLINE) {
        console.log('⏭️ OFFLINE: пропускаем принудительную переавторизацию');
        return;
      }

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
        isCheckingSession: false,
        error: null,
        isNewUser: false,
        onboardingCompleted: false,
      });

      // VK Mini App: подписанные launch-параметры — автологин без экрана входа
      if (IS_VK_MINIAPP && VK_LAUNCH_PARAMS) {
        console.log('🔐 Автовход VK Mini App...');
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        try {
          const response = await vkMiniAppAuth(VK_LAUNCH_PARAMS);
          await applyAuthResponse(response);
          console.log('✅ VK Mini App: вход выполнен');
        } catch (error) {
          console.error('❌ VK Mini App auth failed:', error);
          setState(prev => ({
            ...prev,
            isLoading: false,
            isCheckingSession: false,
            error: normalizeAuthErrorMessage(error, 'Не удалось войти через ВКонтакте'),
          }));
        } finally {
          isReauthenticatingRef.current = false;
        }
        return;
      }

      // Если мы в Telegram и есть initData - логинимся заново
      if (isTelegram && initData) {
        console.log('🔐 Выполняем переавторизацию через Telegram...');
        
        try {
          const response: AuthResponse = await telegramAuth(initData);
          
          let user: User = mapAuthResponseToUser(response);

          try {
            const me = await getMe();
            user = mapMeResponseToUser(me, user);
          } catch (e) {
            console.log('⚠️ Не удалось загрузить /auth/me после переавторизации:', e);
          }

          saveUser(user);

          setState({
            user,
            isAuthenticated: true,
            isLoading: false,
            isCheckingSession: false,
            error: null,
            isNewUser: !!response.isNewUser,
            onboardingCompleted: response.onboardingCompleted,
          });

          console.log('✅ Переавторизация успешна');
        } catch (error) {
          console.error('❌ Ошибка переавторизации:', error);
          
          const errorMessage = normalizeAuthErrorMessage(error, 'Ошибка авторизации');

          setState(prev => ({
            ...prev,
            isLoading: false,
            isCheckingSession: false,
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

  // Обновление данных пользователя через /auth/me
  // apiRequest автоматически обновит access_token через refresh_token при необходимости
  const refreshUser = useCallback(async () => {
    // Офлайн-сборка: источник истины — локальные данные. Пересобираем блоки
    // статистики из offlineMe() без сети и токенов — иначе campaignStats/streak/xp
    // замирают на снимке момента запуска и «статистика не растёт» до перезапуска.
    if (OFFLINE) {
      // Даём gameStore дописать своё состояние в localStorage (сохранение идёт в useEffect
      // того же коммита React) — иначе прочитаем XP/стрик до их записи.
      await new Promise(resolve => setTimeout(resolve, 0));
      const me = offlineMe();
      setState(prev => {
        if (!prev.user) return prev;
        const updatedUser: User = {
          ...prev.user,
          streak: me.streak ?? prev.user.streak,
          campaignStats: me.campaignStats ?? prev.user.campaignStats,
          xp: me.xp ?? prev.user.xp,
        };
        saveUser(updatedUser);
        return { ...prev, user: updatedUser };
      });
      return;
    }

    const tokens = getStoredTokens();
    // Проверяем наличие хотя бы refresh_token, так как apiRequest сам обновит access_token при 401
    if (!tokens?.refresh_token) {
      console.log('⚠️ Нет токенов для обновления пользователя');
      return;
    }

    try {
      // apiRequest автоматически обновит токен при 401 через refresh_token
      const me = await getMe();
      setState(prev => {
        if (!prev.user) {
          // Если пользователя нет, но пришли данные — создаём его
          const newUser = mapMeResponseToUser(me);
          saveUser(newUser);
          return {
            ...prev,
            user: newUser,
            isAuthenticated: true,
          };
        }
        // Обновляем существующего пользователя
        const updatedUser = mapMeResponseToUser(me, prev.user);
        saveUser(updatedUser);
        return { ...prev, user: updatedUser };
      });
      console.log('✅ Данные пользователя обновлены через /auth/me');
    } catch (error) {
      console.error('❌ Ошибка при обновлении данных пользователя:', error);
      // Не меняем состояние при ошибке, чтобы не потерять текущие данные
      // Если токен истёк и refresh не помог, apiRequest отправит AUTH_REQUIRED_EVENT
      // и authStore обработает это через существующий обработчик события
    }
  }, []);

  return {
    state,
    login,
    vkLogin,
    requestEmailOtp: requestEmailOtpCode,
    verifyEmailOtp: verifyEmailOtpCode,
    passwordLogin,
    passwordRegister,
    passwordReset,
    clearError,
    logout,
    setOnboardingCompleted,
    setUserName,
    refreshUser,
    reauthVkMiniApp,
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

