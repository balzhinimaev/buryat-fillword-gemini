// API сервис для работы с бэкендом.
// Офлайн-сборка (OFFLINE=true) работает по принципу local-first:
//  - игровое ядро (кампании, уровни, дейлик, статистика, настройки) — ВСЕГДА из локальных данных;
//  - онлайн-разделы (лидерборды, чужие профили, ачивки, вклад слов) — из сети, когда она есть,
//    с безопасным локальным фолбэком, когда её нет.
import { OFFLINE, isNetOnline } from '../config/offline';
import { API_BASE } from '../config/apiBase';
import {
  offlineGetLevel,
  offlineGetProgress,
  offlineSubmit,
  offlineLeaderboard,
} from './offlineEngine';
import {
  offlineGetWords,
  offlineGetWordDetail,
  offlineFindWordDetail,
  offlineGetCategories,
  offlineWordsStats,
} from './offlineDict';
import { offlineGetDailyToday, offlineSubmitDaily } from './offlineDaily';
import {
  offlineGetCampaignOverview,
  offlineGetCampaignLevel,
  offlineStartCampaignLevel,
  offlineSubmitCampaignLevel,
} from './offlineCampaign';
import {
  offlineOnly, offlineStreak, offlineProjectStats, offlineUserStats,
  offlineGlobalLeaderboard, offlineDailyLeaderboard, offlineKeepers, offlineDialects,
  offlinePartsOfSpeech, offlinePending, offlineAnalyticsAck, offlineSettings, offlineMe,
} from './offlineStubs';

const API_URL = API_BASE;

// В офлайн-сборке БЕЗ серверной сессии (не входили через VK/TG/email) авторизованные
// эндпоинты бессмысленны: не ходим в сеть и не провоцируем 401→переавторизацию.
const hasServerSession = (): boolean => !!getStoredTokens()?.refresh_token;
const netUsable = (): boolean => !OFFLINE || isNetOnline();
const authedNetUsable = (): boolean => netUsable() && (!OFFLINE || hasServerSession());

// Событие для уведомления о необходимости переавторизации
export const AUTH_REQUIRED_EVENT = 'auth:required';

let lastAuthRequiredDispatchAt = 0;
const AUTH_REQUIRED_DISPATCH_COOLDOWN_MS = 3000;

const dispatchAuthRequiredIfNeeded = () => {
  const now = Date.now();
  if (now - lastAuthRequiredDispatchAt < AUTH_REQUIRED_DISPATCH_COOLDOWN_MS) {
    return;
  }

  lastAuthRequiredDispatchAt = now;
  window.dispatchEvent(new CustomEvent(AUTH_REQUIRED_EVENT));
};

// Типы для онбординга
export type AgeRange = '18-24' | '25-34' | '35-44' | '45+' | 'prefer_not_to_say';
export type BuriatLevel = 'beginner' | 'intermediate' | 'advanced' | 'native' | 'skip';
export type ReminderPlan = 'daily-10' | '3x-week-15' | 'weekend-20' | 'off';
export type ReminderTime = 'morning' | 'day' | 'evening';

// Типы ответов API
export interface AuthResponse {
  _id?: string;
  access_token: string;
  refresh_token: string;
  telegramId?: number;
  email?: string;
  name: string;
  telegramUsername?: string;
  photoUrl?: string;
  role: string;
  trustScore?: number;
  currentStreak?: number;
  stats?: {
    wordsAdded: number;
    wordsVerified: number;
    wordsApproved: number;
    wordsRejected: number;
    verificationAccuracy: number;
  };
  isNewUser?: boolean;
  isLanguageKeeper?: boolean;
  languageKeeperJoinedAt?: string;
  // Поля онбординга
  onboardingCompleted: boolean;
  onboardingStep?: string;
  ageRange?: AgeRange;
  buriatLevel?: BuriatLevel;
  reminderPlan?: ReminderPlan;
  reminderTime?: ReminderTime;
}

export interface EmailOtpRequestResponse {
  ok: boolean;
  expiresInSeconds: number;
  resendAfterSeconds?: number;
  debugCode?: string;
}

export interface RefreshResponse {
  access_token: string;
  // Backend rotates refresh_token on every refresh.
  // Делаем опциональным для обратной совместимости, но если пришёл — сохраняем обязательно.
  refresh_token?: string;
  currentStreak?: number;
}

export interface PushDeviceRegisterRequest {
  token: string;
  platform: 'android';
  appVersion?: string;
  deviceModel?: string;
  osVersion?: string;
  locale?: string;
  timezone?: string;
}

// Текущий пользователь
// (отдельный эндпоинт /auth/me; поля могут расширяться)
export interface MeStreakInfo {
  current: number;
  longest: number;
  lastActiveDate?: string;
}

export interface MeCampaignStats {
  totalStars: number;
  maxPossibleStars: number;
  levelsCompleted: number;
  totalLevels: number;
  perfectLevels: number;
  totalAttempts?: number;
  totalPlayTimeSeconds?: number;
  globalRank?: number;
  completionPercent: number;
  bestLevel?: {
    slug: string;
    name?: string;
    timeSeconds?: number;
    rank?: number;
  };
}

export interface MeXpInfo {
  total: number;
  level: number;
  xpInCurrentLevel: number;
  xpToNextLevel: number; // Общее количество XP, нужное для перехода на следующий уровень
  xpRemainingToNextLevel: number; // Сколько осталось XP до следующего уровня
  progressPercent: number;
  maxLevel?: number;
}

export interface MeResponse {
  id: string;
  telegramId?: number;
  name: string;
  telegramUsername?: string;
  photoUrl?: string;
  languageCode?: string;
  isPremium?: boolean;
  isLanguageKeeper?: boolean;
  languageKeeperJoinedAt?: string;
  // Backend eligibility flag: paywall показываем только после первого value milestone
  paywallEligible?: boolean;

  onboardingCompleted: boolean;
  onboardingStep?: string;
  ageRange?: AgeRange;
  buriatLevel?: BuriatLevel;
  reminderPlan?: ReminderPlan;
  reminderTime?: ReminderTime;

  role: string;
  trustScore: number;

  // Статистика вклада в словарь
  stats?: {
    wordsAdded: number;
    wordsVerified: number;
    wordsApproved: number;
    wordsRejected: number;
    verificationAccuracy: number;
  };

  // Новые структурированные блоки
  streak?: MeStreakInfo;
  campaignStats?: MeCampaignStats;
  xp?: MeXpInfo;

  isBanned?: boolean;
  lastActiveAt?: string;
  createdAt?: string;
}

// Ответ пользователя (для join/leave keepers)
export interface UserResponse {
  _id: string;
  telegramId: number;
  name: string;
  telegramUsername?: string;
  photoUrl?: string;
  role: string;
  trustScore: number;
  isLanguageKeeper: boolean;
  languageKeeperJoinedAt?: string;
  stats: {
    wordsAdded: number;
    wordsVerified: number;
    wordsApproved: number;
    wordsRejected: number;
    verificationAccuracy: number;
  };
  // Поля онбординга
  onboardingCompleted: boolean;
  onboardingStep?: string;
  ageRange?: AgeRange;
  buriatLevel?: BuriatLevel;
  reminderPlan?: ReminderPlan;
  reminderTime?: ReminderTime;
}

// Запрос на обновление онбординга
export interface UpdateOnboardingRequest {
  onboardingCompleted: boolean;
  onboardingStep?: string;
  name?: string;
  ageRange?: AgeRange;
  buriatLevel?: BuriatLevel;
  reminderPlan?: ReminderPlan;
  reminderTime?: ReminderTime;
}

// Обновление имени
export async function updateName(name: string): Promise<UserResponse> {
  if (!authedNetUsable()) return offlineOnly();
  return apiRequest<UserResponse>('/users/me/name', {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
}

// === Настройки пользователя ===

// Ответ/запрос настроек (имена полей = серверные)
export interface ApiSettings {
  isPublicProfile: boolean;
  remindersEnabled: boolean;
  hasSeenHowTo: boolean;
  hasSeenTimerOnboarding: boolean;
  hintsEnabled: boolean;
  timerEnabled: boolean;
  vibrationEnabled: boolean;
  soundEffectsEnabled: boolean;
  theme: 'steppe' | 'light' | 'dark';
  difficulty: 'easy' | 'medium' | 'hard';
}

// Частичное обновление — все поля опциональные
export type ApiSettingsUpdate = Partial<ApiSettings>;

// Получить текущие настройки
export async function getSettings(): Promise<ApiSettings> {
  if (OFFLINE) return offlineSettings();
  return apiRequest<ApiSettings>('/users/me/settings', { method: 'GET' });
}

// Обновить настройки (PATCH, частично)
export async function patchSettings(data: ApiSettingsUpdate): Promise<ApiSettings> {
  if (OFFLINE) return offlineSettings();
  return apiRequest<ApiSettings>('/users/me/settings', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

// Категории из API
export interface ApiCategory {
  _id: string;
  slug: string;
  name: string;
  nameBur: string;
  emoji: string;
  difficulty: 'easy' | 'medium' | 'hard';
  gridSize: number;
  wordCount: number;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Диалекты из API
export interface ApiDialect {
  _id: string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// Части речи из API
export interface ApiPartOfSpeech {
  _id: string;
  code: string;
  name: string;
  emoji: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// Запрос на создание слова
export interface CreateWordRequest {
  bur: string;
  ru: string;
  categoryId: string;
  dialectId?: string;
  partOfSpeechId?: string;
  exampleBur?: string;
  exampleRu?: string;
  difficulty?: number;
}

// Статистика проекта
export interface ProjectStats {
  wordsCount: number;
  participantsCount: number;
  categoriesCount: number;
  languageKeepersCount: number;
}

// Личная статистика пользователя
export interface UserStats {
  wordsAdded: number;
  wordsVerified: number;
  wordsApproved: number;
  wordsRejected: number;
  verificationAccuracy: number;
}

// Топ хранителей
export interface LanguageKeeperLeaderboardItem {
  _id: string;
  name: string;
  telegramUsername?: string;
  photoUrl?: string;
  stats: UserStats;
  role: string;
  trustScore: number;
  isLanguageKeeper: boolean;
  languageKeeperJoinedAt?: string;
}

// Общая статистика слов
export interface WordsStats {
  total: number;
  pending: number;
  verified: number;
  rejected: number;
  activeInGame: number;
}

// Слово из API (GET /words)
export type WordStatus = 'pending' | 'verified' | 'rejected' | 'archived';
export type WordSortBy = 'createdAt' | 'viewCount' | 'lookupCount';

export interface ApiWordComment {
  _id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiWord {
  _id: string;
  // Основное
  bur: string;
  ru: string;
  // Дополнительно
  exampleBur?: string;
  exampleRu?: string;
  pronunciation?: string;
  audioUrl?: string | null;
  // Лексические связи
  synonyms: string[];
  antonyms: string[];
  relatedWords: { _id: string; bur: string; ru: string }[];
  // Классификация
  categoryId?: string;
  dialectId?: { _id: string; code: string; name: string } | null;
  partOfSpeechId?: { _id: string; code: string; name: string; emoji: string } | null;
  tags: string[];
  // Источники
  sources: string[];
  // Комментарии
  comments: ApiWordComment[];
  // Популярность
  viewCount: number;
  lookupCount: number;
  // Контрибьютор
  contributor: {
    id: string;
    name: string;
    telegramId?: number;
  };
  // Верификация
  status: WordStatus;
  verificationScore: number;
  upvotes: string[];
  downvotes: string[];
  // Игра
  isActiveInGame: boolean;
  difficulty: number;
  // Модерация
  rejectionReason?: string | null;
  moderatedBy?: string | null;
  moderatedAt?: string | null;
  // Таймстампы
  createdAt: string;
  updatedAt: string;
}

export interface ApiWordsResponse {
  words: ApiWord[];
  total: number;
}

// Детальная страница слова (GET /words/:id)
export interface ApiWordDetailRelated {
  _id: string;
  bur: string;
  ru: string;
  tags: string[];
  difficulty: number;
  status: string;
}

export interface ApiWordDetail extends Omit<ApiWord, 'categoryId' | 'relatedWords'> {
  categoryId: { _id: string; name: string; slug: string } | null;
  relatedWords: ApiWordDetailRelated[];
}

export interface ApiWordDetailResponse {
  word: ApiWordDetail;
  otherTranslations: { _id: string; bur: string; ru: string }[];
  relatedWords: ApiWordDetailRelated[];
  commentsCount: number;
  votesUp: number;
  votesDown: number;
}

export interface GetWordsParams {
  status?: WordStatus;
  categoryId?: string;
  dialectId?: string;
  partOfSpeechId?: string;
  isActiveInGame?: boolean;
  tag?: string;
  sortBy?: WordSortBy;
  limit?: number;
  offset?: number;
}

// Ответ при создании слова
export interface CreateWordResponse {
  _id: string;
  bur: string;
  ru: string;
  categoryId: string;
  dialectId?: string;
  partOfSpeechId?: string;
  exampleBur?: string;
  exampleRu?: string;
  synonyms: string[];
  contributor: {
    id: string;
    name: string;
    telegramId: number;
  };
  status: 'pending' | 'verified' | 'rejected';
  verificationScore: number;
  upvotes: string[];
  downvotes: string[];
  isActiveInGame: boolean;
  difficulty: number;
  createdAt: string;
  updatedAt: string;
}

// Слово на проверке (pending)
export interface PendingWord {
  _id: string;
  bur: string;
  ru: string;
  categoryId: string;
  example?: string;
  exampleBur?: string;
  exampleRu?: string;
  synonyms: string[];
  dialectId?: string;
  partOfSpeechId?: string;
  contributor: {
    id: string;
    name: string;
    telegramId: number;
  };
  status: 'pending' | 'verified' | 'rejected';
  verificationScore: number;
  upvotes: string[];
  downvotes: string[];
  isActiveInGame: boolean;
  difficulty: number;
  createdAt: string;
  updatedAt: string;
}

// Запрос на голосование
export interface VoteRequest {
  wordId: string;
  type: 'upvote' | 'downvote';
  reason?: string;
}

// Ответ голоса
export interface VoteResponse {
  vote: {
    wordId: string;
    voterId: string;
    type: 'upvote' | 'downvote';
    reason?: string;
    wordBur: string;
    wordRu: string;
    voterName: string;
    voterTelegramId: number;
    voterTrustScoreAtVote: number;
    _id: string;
    createdAt: string;
    updatedAt: string;
  };
  word: PendingWord;
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
    if (!stored) return null;

    const parsed = JSON.parse(stored) as Partial<StoredTokens> | null;
    const access = parsed?.access_token;
    const refresh = parsed?.refresh_token;

    if (typeof access !== 'string' || !access || typeof refresh !== 'string' || !refresh) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }

    return {
      access_token: access,
      refresh_token: refresh,
    };
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
};

export const setStoredTokens = (tokens: StoredTokens): void => {
  if (!tokens?.access_token || !tokens?.refresh_token) {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }

  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
};

export const clearStoredTokens = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

// Базовая функция для API запросов
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  // Runtime-проверка: если сети реально нет — мгновенно отдаём офлайн-ошибку
  // (без "Failed to fetch" и ожидания таймаута). При наличии сети запросы проходят
  // и в офлайн-сборке — так оживают онлайн-разделы (лидерборды, ачивки, синк).
  if (OFFLINE && !isNetOnline() && !endpoint.startsWith('/auth/')) {
    throw { statusCode: 0, message: 'Нет подключения к интернету', error: 'offline' } as ApiError;
  }

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

    // Если 401 и это не retry - пробуем обновить токен
    // НЕ пытаемся обновить токен если сам запрос /auth/refresh вернул 401
    const isAuthRefreshEndpoint = endpoint === '/auth/refresh';
    const isUnauthorized = error.statusCode === 401;
    let authRecoveryTriggered = false;

    if (isUnauthorized && !isRetry && tokens?.refresh_token && !isAuthRefreshEndpoint) {
      try {
        console.log('🔄 Пробуем обновить токен...');
        const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: tokens.refresh_token }),
        });

        if (refreshResponse.ok) {
          const refreshed: RefreshResponse = await refreshResponse.json();
          const nextTokens: StoredTokens = {
            access_token: refreshed.access_token,
            refresh_token: refreshed.refresh_token ?? tokens.refresh_token,
          };

          console.log('✅ Токен обновлён успешно');
          setStoredTokens(nextTokens);
          // Повторяем оригинальный запрос с новым токеном
          return apiRequest<T>(endpoint, options, true);
        }

        const refreshStatus = refreshResponse.status;
        const refreshBody = await refreshResponse.text();
        console.log('❌ Не удалось обновить токен:', refreshStatus, refreshBody);

        // Сессию сбрасываем только если refresh действительно невалиден.
        if (refreshStatus === 401 || refreshStatus === 403) {
          console.log('🔒 Refresh token недействителен, очищаем токены и запрашиваем переавторизацию...');
          clearStoredTokens();
          dispatchAuthRequiredIfNeeded();
          authRecoveryTriggered = true;
        } else {
          // Временные сетевые/серверные ошибки: не теряем сессию принудительно.
          console.log('⏳ Временная ошибка refresh, сохраняем текущие токены');
        }
      } catch (refreshError) {
        console.log('❌ Ошибка сети при обновлении токена, сохраняем текущие токены:', refreshError);
        // При сетевом сбое не сбрасываем сессию.
      }
    }

    // Если /auth/refresh сам вернул 401 - очищаем токены
    if (isUnauthorized && isAuthRefreshEndpoint) {
      console.log('🔒 Refresh token недействителен, очищаем токены...');
      clearStoredTokens();
    }

    // Fallback: если пришёл 401 и recovery ещё не запущен, всё равно инициируем переавторизацию.
    // Только если серверная сессия вообще была — иначе (локальный игрок офлайн-сборки,
    // дернувший авторизованный эндпоинт) молча отдаём ошибку без выбивания на экран входа.
    if (isUnauthorized && !isAuthRefreshEndpoint && !authRecoveryTriggered && tokens?.refresh_token) {
      dispatchAuthRequiredIfNeeded();
      throw {
        ...error,
        message: 'Сессия обновляется… Подождите пару секунд и повторите действие.',
      } as ApiError;
    }

    throw error;
  }

  // 204 No Content — нет тела ответа
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Авторизация через VK ID (OAuth 2.1, PKCE) — натив и веб
export async function vkAuth(params: {
  code: string;
  codeVerifier: string;
  deviceId: string;
  redirectUri: string;
}): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponse>('/auth/vk', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  setStoredTokens({
    access_token: response.access_token,
    refresh_token: response.refresh_token,
  });
  return response;
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

// Регистрация аккаунта по email/паролю (используется для тихого per-device аккаунта офлайн-синка)
export async function registerDeviceAccount(
  email: string,
  password: string,
  name: string,
): Promise<{ access_token: string; refresh_token: string; _id: string }> {
  const response = await apiRequest<{ access_token: string; refresh_token: string; _id: string }>(
    '/auth/register',
    { method: 'POST', body: JSON.stringify({ email, password, name }) },
  );
  setStoredTokens({
    access_token: response.access_token,
    refresh_token: response.refresh_token,
  });
  return response;
}

// Запрос OTP кода на email
export async function requestEmailOtp(email: string): Promise<EmailOtpRequestResponse> {
  return apiRequest<EmailOtpRequestResponse>('/auth/otp/request', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

// Верификация OTP и вход/регистрация
export async function verifyEmailOtp(email: string, code: string): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponse>('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });

  setStoredTokens({
    access_token: response.access_token,
    refresh_token: response.refresh_token,
  });

  return response;
}

export async function registerPushDevice(payload: PushDeviceRegisterRequest): Promise<void> {
  if (!authedNetUsable()) return undefined;
  await apiRequest('/push/devices/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function unregisterPushDevice(token: string): Promise<void> {
  if (!authedNetUsable()) return undefined;
  await apiRequest('/push/devices/unregister', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

// Обновление токена
export async function refreshToken(): Promise<RefreshResponse> {
  const tokens = getStoredTokens();
  
  if (!tokens?.refresh_token) {
    throw new Error('No refresh token available');
  }

  const response = await apiRequest<RefreshResponse>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: tokens.refresh_token }),
  });

  setStoredTokens({
    access_token: response.access_token,
    refresh_token: response.refresh_token ?? tokens.refresh_token,
  });

  return response;
}

// Текущий пользователь
export async function getMe(): Promise<MeResponse> {
  if (OFFLINE) return offlineMe();
  return apiRequest<MeResponse>('/auth/me', { method: 'GET' });
}

// FE fallback (детерминированный): используем, если backend flag paywallEligible ещё не пришёл.
export function resolvePaywallEligibility(me?: MeResponse | null): boolean {
  if (!me) return false;
  if (typeof me.paywallEligible === 'boolean') return me.paywallEligible;

  const totalStars = me.campaignStats?.totalStars ?? 0;
  const levelsCompleted = me.campaignStats?.levelsCompleted ?? 0;
  return levelsCompleted > 0 || totalStars >= 3;
}

// Выход
export async function logout(): Promise<void> {
  if (OFFLINE) return undefined;
  const tokens = getStoredTokens();
  
  if (tokens?.refresh_token) {
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: tokens.refresh_token }),
      });
    } catch {
      // Игнорируем ошибки при выходе
    }
  }

  clearStoredTokens();
}

// Получение категорий
export async function getCategories(): Promise<ApiCategory[]> {
  if (OFFLINE) return offlineGetCategories();
  return apiRequest<ApiCategory[]>('/categories', { method: 'GET' });
}

// Получение диалектов
export async function getDialects(): Promise<ApiDialect[]> {
  if (!netUsable()) return offlineDialects();
  return apiRequest<ApiDialect[]>('/dialects', { method: 'GET' });
}

// Получение частей речи
export async function getPartsOfSpeech(): Promise<ApiPartOfSpeech[]> {
  if (!netUsable()) return offlinePartsOfSpeech();
  return apiRequest<ApiPartOfSpeech[]>('/parts-of-speech', { method: 'GET' });
}

// Создание нового слова (офлайн-очередь живёт в contribSync — сюда попадаем только при сети)
export async function createWord(data: CreateWordRequest): Promise<CreateWordResponse> {
  if (!netUsable()) return offlineOnly();
  return apiRequest<CreateWordResponse>('/words', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Получение статистики проекта
export async function getProjectStats(): Promise<ProjectStats> {
  if (!netUsable()) return offlineProjectStats();
  return apiRequest<ProjectStats>('/stats', { method: 'GET' });
}

// Получение общей статистики слов
export async function getWordsStats(): Promise<WordsStats> {
  if (!netUsable()) return offlineWordsStats();
  return apiRequest<WordsStats>('/words/stats', { method: 'GET' });
}

// Получение списка слов (публичный эндпоинт)
export async function getWords(params: GetWordsParams = {}): Promise<ApiWordsResponse> {
  if (OFFLINE) return offlineGetWords(params);
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set('status', params.status);
  if (params.categoryId) searchParams.set('categoryId', params.categoryId);
  if (params.dialectId) searchParams.set('dialectId', params.dialectId);
  if (params.partOfSpeechId) searchParams.set('partOfSpeechId', params.partOfSpeechId);
  if (params.isActiveInGame !== undefined) searchParams.set('isActiveInGame', String(params.isActiveInGame));
  if (params.tag) searchParams.set('tag', params.tag);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.limit !== undefined) searchParams.set('limit', String(params.limit));
  if (params.offset !== undefined) searchParams.set('offset', String(params.offset));

  const qs = searchParams.toString();
  return apiRequest<ApiWordsResponse>(`/words${qs ? `?${qs}` : ''}`, { method: 'GET' });
}

// Получение детальной информации о слове (публичный эндпоинт).
// В офлайн-сборке — local-first: своё слово отдаём мгновенно; незнакомый id
// (например, серверный ObjectId из очереди синка) при сети запрашиваем у сервера.
export async function getWordDetail(id: string): Promise<ApiWordDetailResponse> {
  if (OFFLINE) {
    const local = offlineFindWordDetail(id);
    if (local) return local;
    if (!isNetOnline()) return offlineGetWordDetail(id);
  }
  return apiRequest<ApiWordDetailResponse>(`/words/${encodeURIComponent(id)}`, { method: 'GET' });
}

// =========================
// Комментарии к слову
// =========================

/** Добавить комментарий к слову (POST /words/:wordId/comments) — возвращает объект слова */
export async function addComment(wordId: string, text: string): Promise<ApiWord> {
  return apiRequest<ApiWord>(`/words/${encodeURIComponent(wordId)}/comments`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

/** Редактировать комментарий (PATCH /words/:wordId/comments/:commentId) — возвращает объект слова */
export async function editComment(
  wordId: string,
  commentId: string,
  text: string,
): Promise<ApiWord> {
  return apiRequest<ApiWord>(
    `/words/${encodeURIComponent(wordId)}/comments/${encodeURIComponent(commentId)}`,
    { method: 'PATCH', body: JSON.stringify({ text }) },
  );
}

/** Удалить комментарий (DELETE /words/:wordId/comments/:commentId) */
export async function deleteComment(wordId: string, commentId: string): Promise<void> {
  await apiRequest<void>(
    `/words/${encodeURIComponent(wordId)}/comments/${encodeURIComponent(commentId)}`,
    { method: 'DELETE' },
  );
}

// Топ хранителей языка
export async function getLanguageKeepersLeaderboard(): Promise<LanguageKeeperLeaderboardItem[]> {
  if (!netUsable()) return offlineKeepers();
  return apiRequest<LanguageKeeperLeaderboardItem[]>('/words/keepers/leaderboard', { method: 'GET' });
}

// Получение личной статистики пользователя
export async function getUserStats(): Promise<UserStats> {
  if (!authedNetUsable()) return offlineUserStats();
  return apiRequest<UserStats>('/users/me/stats', { method: 'GET' });
}

// Присоединиться к хранителям языка
export async function joinLanguageKeepers(): Promise<UserResponse> {
  if (!authedNetUsable()) return offlineOnly();
  return apiRequest<UserResponse>('/users/me/join-keepers', { method: 'POST' });
}

// Покинуть хранителей языка
export async function leaveLanguageKeepers(): Promise<UserResponse> {
  if (!authedNetUsable()) return offlineOnly();
  return apiRequest<UserResponse>('/users/me/leave-keepers', { method: 'POST' });
}

// Получение слов на проверке
export async function getPendingWords(): Promise<PendingWord[]> {
  if (!authedNetUsable()) return offlinePending();
  return apiRequest<PendingWord[]>('/words/pending', { method: 'GET' });
}

// Голосование за слово
export async function voteWord(data: VoteRequest): Promise<VoteResponse> {
  if (!authedNetUsable()) return offlineOnly();
  return apiRequest<VoteResponse>('/votes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Обновление онбординга
export async function updateOnboarding(data: UpdateOnboardingRequest): Promise<UserResponse> {
  if (!authedNetUsable()) return offlineOnly();
  return apiRequest<UserResponse>('/users/me/onboarding', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// =========================
// Campaign (server-driven)
// =========================

// Делает типы "гибкими": допускаем расширение ответа новыми полями без правок фронта.
type ExtensibleRecord = Record<string, unknown>;

export type CampaignDifficulty = 'beginner' | 'intermediate' | 'expert' | string;

export interface CampaignWord extends ExtensibleRecord {
  bur: string;
  ru: string;
}

export interface CampaignOverviewLevel extends ExtensibleRecord {
  id: string;
  slug: string;
  name?: string;
  nameBur?: string;
  difficulty?: CampaignDifficulty;
  order?: number;
  icon?: string;
  requiredStars?: number;
  wordCount?: number;
  maxStars?: number;
  timeLimitSeconds?: number;
  isActive?: boolean;
  description?: string;
  descriptionBur?: string;

  // Progress fields (may be absent for new users / future changes)
  earnedStars?: number;
  isUnlocked?: boolean;
  bestTimeSeconds?: number;
  attempts?: number;
  firstCompletedAt?: string;
}

export interface CampaignOverviewCategory extends ExtensibleRecord {
  difficulty: CampaignDifficulty;
  name?: string;
  nameBur?: string;
  order?: number;
  requiredStars?: number;
  isUnlocked?: boolean;
  levels: CampaignOverviewLevel[];
  totalStars?: number;
  earnedStars?: number;
}

export interface CampaignOverviewModule extends ExtensibleRecord {
  id: string;
  title?: string;
  titleBur?: string;
  order?: number;
  requiredStars?: number;
  isUnlocked?: boolean;
  levels: CampaignOverviewLevel[];
  totalStars?: number;
  earnedStars?: number;
}

export interface CampaignOverviewProgressSummary {
  totalStars: number;
  earnedStars: number;
  progressPercent: number;
}

export interface CampaignOverviewResponse extends ExtensibleRecord {
  categories: CampaignOverviewCategory[];
  modules?: CampaignOverviewModule[];

  // Новая сегментация прогресса
  classicProgress?: CampaignOverviewProgressSummary;
  modulesProgress?: CampaignOverviewProgressSummary;
  overallProgress?: CampaignOverviewProgressSummary;

  // Legacy-поля (для обратной совместимости)
  totalStars?: number;
  earnedStars?: number;
  progressPercent?: number;
}

export interface CampaignMapVariantMeta {
  variantId: string;
  preferredDifficultyLevel: 1 | 2 | 3 | number;
  selectedDifficultyLevel: 1 | 2 | 3 | number;
  selectionReason: 'exact' | 'nearest' | string;
}

export interface CampaignWordPlacement {
  bur: string;
  ru: string;
  path: Array<{ r: number; c: number }>;
}

export interface CampaignLevelResponse extends ExtensibleRecord {
  id: string;
  slug: string;
  name?: string;
  nameBur?: string;
  words: CampaignWord[];
  timeLimitSeconds?: number;
  maxStars?: number;
  currentStars?: number;
  bestTimeSeconds?: number;
  gridSize?: number;
  grid?: string[][];
  wordPlacements?: CampaignWordPlacement[];
  mapVariantMeta?: CampaignMapVariantMeta;
}

export interface CampaignLevelStartResponse extends ExtensibleRecord {
  sessionId: string;
  expiresAt: string;
}

export interface CampaignSubmitLevelResultRequest extends ExtensibleRecord {
  // required
  timeSeconds: number;
  foundWords: string[];
  // optional
  sessionId?: string;
  mistakes?: number;
}

export interface CampaignLevelResultResponse extends ExtensibleRecord {
  success?: boolean;
  earnedStars?: number;
  isNewStarRecord?: boolean;
  isNewTimeRecord?: boolean;
  timeSeconds?: number; // server time (if sessionId used)
  totalUserStars?: number;
  unlockedLevelSlugs?: string[];

  // details
  wordsFound?: number;
  wordsTotal?: number;
  wordsFoundPercent?: number;
  validFoundWords?: string[];
  missedWords?: string[];
  timeLimitSeconds?: number;
  previousBestStars?: number;
  previousBestTime?: number;
  attemptNumber?: number;

  // XP
  xpGained?: number;
  totalXp?: number;
  userLevel?: number;
  leveledUp?: boolean;
  xpReason?: string;
}

export async function getCampaignOverview(): Promise<CampaignOverviewResponse> {
  if (OFFLINE) return offlineGetCampaignOverview();
  return apiRequest<CampaignOverviewResponse>('/campaign/overview', { method: 'GET' });
}

export async function getCampaignLevel(slug: string): Promise<CampaignLevelResponse> {
  if (OFFLINE) return offlineGetCampaignLevel(slug);
  return apiRequest<CampaignLevelResponse>(`/campaign/level/${encodeURIComponent(slug)}`, { method: 'GET' });
}

export async function startCampaignLevel(slug: string): Promise<CampaignLevelStartResponse> {
  if (OFFLINE) return offlineStartCampaignLevel(slug);
  return apiRequest<CampaignLevelStartResponse>(`/campaign/level/${encodeURIComponent(slug)}/start`, { method: 'POST' });
}

export async function submitCampaignLevel(
  slug: string,
  body: CampaignSubmitLevelResultRequest
): Promise<CampaignLevelResultResponse> {
  if (OFFLINE) return offlineSubmitCampaignLevel(slug, body);
  return apiRequest<CampaignLevelResultResponse>(`/campaign/level/${encodeURIComponent(slug)}/submit`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function trackCampaignModuleOpened(moduleId: string, source?: string): Promise<{ ok: true }> {
  if (!authedNetUsable()) return { ok: true };
  return apiRequest<{ ok: true }>(`/campaign/module/${encodeURIComponent(moduleId)}/open`, {
    method: 'POST',
    body: JSON.stringify(source ? { source } : {}),
  });
}

export async function trackCampaignPaywallShown(payload?: {
  context?: string;
  source?: string;
}): Promise<{ ok: true }> {
  if (!authedNetUsable()) return { ok: true };
  return apiRequest<{ ok: true }>('/campaign/paywall/shown', {
    method: 'POST',
    body: JSON.stringify(payload ?? {}),
  });
}

// =========================
// Activity (streak + heartbeat)
// =========================

export interface ActivityStreakResponse {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate?: string;
  isStreakActive: boolean;
}

export async function getActivityStreak(recalculate = false): Promise<ActivityStreakResponse> {
  if (OFFLINE) return offlineStreak();
  const params = new URLSearchParams();
  if (recalculate) params.set('recalculate', 'true');

  const suffix = params.toString();
  return apiRequest<ActivityStreakResponse>(`/activity/streak${suffix ? `?${suffix}` : ''}`, {
    method: 'GET',
  });
}

// Серверный heartbeat активности; локальная серия дней живёт в gameStore и не зависит от него.
export async function trackActivity(type?: string): Promise<ActivityStreakResponse> {
  if (!authedNetUsable()) return offlineStreak();
  const params = new URLSearchParams();
  if (type) params.set('type', type);

  const suffix = params.toString();
  return apiRequest<ActivityStreakResponse>(`/activity/track${suffix ? `?${suffix}` : ''}`, {
    method: 'POST',
  });
}

// =========================
// Analytics (event stream)
// =========================

export type AnalyticsEventName =
  | 'app_open'
  | 'daily_started'
  | 'daily_completed'
  | 'daily_opened'
  | 'daily_abandoned'
  | 'daily_nudge_dismissed'
  | 'mode_selected_from_menu'
  | 'campaign_level_started'
  | 'campaign_level_completed'
  | 'level_started'
  | 'level_completed'
  | 'module_opened'
  | 'resume_clicked'
  | 'reactivation_sent'
  | 'reactivation_opened';

export interface AnalyticsEventContext {
  source?: 'menu' | 'startapp' | 'broadcast' | 'push' | 'unknown';
  startappIntent?: 'daily' | 'resume' | 'module';
  campaignId?: string;
  moduleId?: string;
  platform?: 'android' | 'ios' | 'web';
  appVersion?: string;
}

export interface AnalyticsEventInput {
  eventId?: string;
  eventName: AnalyticsEventName;
  occurredAtClient?: string;
  sessionId?: string;
  ctx?: AnalyticsEventContext;
  props?: Record<string, unknown>;
}

export interface IngestAnalyticsEventsResponse {
  accepted: number;
  inserted: number;
  duplicates: number;
}

export interface CampaignPerformanceResponse {
  campaignId: string;
  windowHours: number;
  conversionWindowHours: number;
  from: string;
  to: string;
  events: {
    sent: number;
    opened: number;
    started: number;
    completed: number;
  };
  users: {
    sent: number;
    opened: number;
    started: number;
    completed: number;
  };
  rates: {
    openFromSent: number;
    startFromOpened: number;
    completeFromOpened: number;
    completeFromSent: number;
  };
}

export interface AnalyticsDailyKpiResponse {
  date: string;
  dau: number;
  newUsers: number;
  d1Retention: number;
  d7Retention: number;
  reactivation: {
    sent: number;
    opened24h: number;
    started24h: number;
    completed24h: number;
  };
  funnel: {
    appOpen: number;
    gameStart: number;
    gameComplete: number;
  };
  computedAt: string;
}

export interface AnalyticsAdminEngagementTimelinePoint {
  date: string;
  dailyOpened: number;
  dailyStarted: number;
  dailyCompleted: number;
  dailyAbandoned: number;
  modeSelections: number;
  dailyNudgeDismissed: number;
}

export interface AnalyticsAdminEngagementResponse {
  days: number;
  from: string;
  to: string;
  totals: {
    dailyOpened: number;
    dailyStarted: number;
    dailyCompleted: number;
    dailyAbandoned: number;
    dailyNudgeDismissed: number;
    modeSelections: number;
  };
  rates: {
    dailyAbandonedFromOpened: number;
    dailyAbandonedFromStarted: number;
    dailyCompletionFromStarted: number;
  };
  timeline: AnalyticsAdminEngagementTimelinePoint[];
  modeSelectionBreakdown: Array<{ mode: string; count: number }>;
  dailyAbandonmentInsights: {
    avgProgressPercent: number;
    avgTimeSeconds: number;
    topEntrypoints: Array<{ entrypoint: string; count: number }>;
  };
}

export async function trackAnalyticsEvents(events: AnalyticsEventInput[]): Promise<IngestAnalyticsEventsResponse> {
  if (!authedNetUsable()) return offlineAnalyticsAck();
  if (events.length === 0) {
    return { accepted: 0, inserted: 0, duplicates: 0 };
  }

  return apiRequest<IngestAnalyticsEventsResponse>('/analytics/events', {
    method: 'POST',
    body: JSON.stringify({ events }),
  });
}

export async function getCampaignPerformance(
  campaignId: string,
  hours = 72,
  conversionHours = 24,
): Promise<CampaignPerformanceResponse> {
  const params = new URLSearchParams({
    campaignId,
    hours: String(hours),
    conversionHours: String(conversionHours),
  });

  return apiRequest<CampaignPerformanceResponse>(`/analytics/campaign?${params.toString()}`, {
    method: 'GET',
  });
}

export async function getAnalyticsDaily(limit = 14): Promise<AnalyticsDailyKpiResponse[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  return apiRequest<AnalyticsDailyKpiResponse[]>(`/analytics/daily?${params.toString()}`, {
    method: 'GET',
  });
}

export async function getAnalyticsAdminEngagement(days = 14): Promise<AnalyticsAdminEngagementResponse> {
  const params = new URLSearchParams({ days: String(days) });
  return apiRequest<AnalyticsAdminEngagementResponse>(`/analytics/admin/engagement?${params.toString()}`, {
    method: 'GET',
  });
}

// =========================
// Campaign Admin (chapters + lessons)
// =========================

export type CampaignContentStatus = 'draft' | 'scheduled' | 'published' | 'archived';

export interface CampaignChapter {
  id: string;
  title: string;
  titleBur?: string;
  description?: string;
  descriptionBur?: string;
  order: number;
  status: CampaignContentStatus;
  isActive: boolean;
  isArchived: boolean;
  lessonsTotal?: number;
  lessonsPublished?: number;
  lessonsDraft?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CampaignParentChapterState {
  id: string;
  status: CampaignContentStatus;
  isActive: boolean;
  isArchived: boolean;
}

export interface CampaignAdminWord {
  bur: string;
  ru: string;
  wordId?: string;
}

export interface CampaignMapGridCell {
  r: number;
  c: number;
}

export interface CampaignMapWordPlacementAdmin {
  word: string;
  path: CampaignMapGridCell[];
}

export interface CampaignMapVariantAdmin {
  variantId?: string;
  title?: string;
  difficultyLevel: 1 | 2 | 3 | number;
  gridSize: number;
  grid: string[][];
  wordPlacements: CampaignMapWordPlacementAdmin[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CampaignAdminLevel {
  id: string;
  slug: string;
  name: string;
  nameBur: string;
  difficulty: CampaignDifficulty;
  order: number;
  icon: string;
  requiredStars: number;
  wordCount: number;
  maxStars: number;
  timeLimitSeconds: number;
  isActive: boolean;
  status: CampaignContentStatus;
  chapterId?: string;
  parentChapterState?: CampaignParentChapterState | null;
  description?: string;
  descriptionBur?: string;
  words?: CampaignAdminWord[];
  mapVariants?: CampaignMapVariantAdmin[];
}

export interface CampaignChapterCreateRequest {
  title: string;
  titleBur?: string;
  description?: string;
  descriptionBur?: string;
  order: number;
  status?: CampaignContentStatus;
  isActive?: boolean;
}

export type CampaignChapterUpdateRequest = Partial<CampaignChapterCreateRequest>;

export interface CampaignAdminLevelCreateRequest {
  slug: string;
  name: string;
  nameBur: string;
  difficulty: CampaignDifficulty;
  order: number;
  icon: string;
  requiredStars: number;
  words: CampaignAdminWord[];
  timeLimitSeconds?: number;
  isActive?: boolean;
  chapterId?: string;
  status?: CampaignContentStatus;
  description?: string;
  descriptionBur?: string;
  mapVariants?: CampaignMapVariantAdmin[];
}

export type CampaignAdminLevelUpdateRequest = Partial<Omit<CampaignAdminLevelCreateRequest, 'slug'>>;

export interface CampaignAdminLevelsQuery {
  chapterId?: string;
  status?: CampaignContentStatus;
  search?: string;
}

export async function getCampaignAdminChapters(): Promise<CampaignChapter[]> {
  return apiRequest<CampaignChapter[]>('/campaign/admin/chapters', { method: 'GET' });
}

export async function getCampaignAdminChapter(chapterId: string): Promise<CampaignChapter> {
  return apiRequest<CampaignChapter>(`/campaign/admin/chapter/${encodeURIComponent(chapterId)}`, { method: 'GET' });
}

export async function createCampaignAdminChapter(data: CampaignChapterCreateRequest): Promise<CampaignChapter> {
  return apiRequest<CampaignChapter>('/campaign/admin/chapters', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCampaignAdminChapter(
  chapterId: string,
  data: CampaignChapterUpdateRequest
): Promise<CampaignChapter> {
  return apiRequest<CampaignChapter>(`/campaign/admin/chapter/${encodeURIComponent(chapterId)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function updateCampaignAdminChapterStatus(
  chapterId: string,
  status: CampaignContentStatus
): Promise<CampaignChapter> {
  return apiRequest<CampaignChapter>(`/campaign/admin/chapter/${encodeURIComponent(chapterId)}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export async function getCampaignAdminLevels(
  query: CampaignAdminLevelsQuery = {}
): Promise<CampaignAdminLevel[]> {
  const params = new URLSearchParams();
  if (query.chapterId) params.set('chapterId', query.chapterId);
  if (query.status) params.set('status', query.status);
  if (query.search) params.set('search', query.search);
  const qs = params.toString();

  return apiRequest<CampaignAdminLevel[]>(`/campaign/admin/levels${qs ? `?${qs}` : ''}`, {
    method: 'GET',
  });
}

export async function getCampaignAdminLevel(slug: string): Promise<CampaignAdminLevel> {
  return apiRequest<CampaignAdminLevel>(`/campaign/admin/level/${encodeURIComponent(slug)}`, {
    method: 'GET',
  });
}

export async function createCampaignAdminLevel(
  data: CampaignAdminLevelCreateRequest
): Promise<CampaignAdminLevel> {
  return apiRequest<CampaignAdminLevel>('/campaign/admin/levels', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCampaignAdminLevel(
  slug: string,
  data: CampaignAdminLevelUpdateRequest
): Promise<CampaignAdminLevel> {
  return apiRequest<CampaignAdminLevel>(`/campaign/admin/level/${encodeURIComponent(slug)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteCampaignAdminLevel(slug: string): Promise<void> {
  return apiRequest<void>(`/campaign/admin/level/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
  });
}

export interface CampaignAdminMapVariantsResponse {
  slug: string;
  mapVariants: CampaignMapVariantAdmin[];
}

export async function getCampaignAdminMapVariants(
  slug: string
): Promise<CampaignAdminMapVariantsResponse> {
  return apiRequest<CampaignAdminMapVariantsResponse>(
    `/campaign/admin/level/${encodeURIComponent(slug)}/map-variants`,
    { method: 'GET' }
  );
}

export async function createCampaignAdminMapVariant(
  slug: string,
  data: CampaignMapVariantAdmin
): Promise<CampaignAdminMapVariantsResponse> {
  return apiRequest<CampaignAdminMapVariantsResponse>(
    `/campaign/admin/level/${encodeURIComponent(slug)}/map-variants`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );
}

export async function updateCampaignAdminMapVariant(
  slug: string,
  variantId: string,
  data: CampaignMapVariantAdmin
): Promise<CampaignAdminMapVariantsResponse> {
  return apiRequest<CampaignAdminMapVariantsResponse>(
    `/campaign/admin/level/${encodeURIComponent(slug)}/map-variants/${encodeURIComponent(variantId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    }
  );
}

export async function deleteCampaignAdminMapVariant(
  slug: string,
  variantId: string
): Promise<CampaignAdminMapVariantsResponse> {
  return apiRequest<CampaignAdminMapVariantsResponse>(
    `/campaign/admin/level/${encodeURIComponent(slug)}/map-variants/${encodeURIComponent(variantId)}`,
    {
      method: 'DELETE',
    }
  );
}

// =========================
// Leaderboard
// =========================

export type LeaderboardType = 'stars' | 'xp' | 'streak';
export type LeaderboardPeriod = 'all' | 'week' | 'month';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  telegramUsername?: string | null;
  photoUrl?: string | null;
  value: number;
  level: number;
  totalStars: number;
  levelsCompleted: number;
  currentStreak: number;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  total: number;
  currentUser: LeaderboardEntry | null;
}

export interface LeaderboardParams {
  type?: LeaderboardType;
  period?: LeaderboardPeriod;
  limit?: number;
  offset?: number;
}

export async function getLeaderboard(params: LeaderboardParams = {}): Promise<LeaderboardResponse> {
  if (!netUsable()) return offlineGlobalLeaderboard();
  const searchParams = new URLSearchParams();
  if (params.type) searchParams.set('type', params.type);
  if (params.period) searchParams.set('period', params.period);
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.offset) searchParams.set('offset', String(params.offset));

  const qs = searchParams.toString();
  return apiRequest<LeaderboardResponse>(`/leaderboard${qs ? `?${qs}` : ''}`, { method: 'GET' });
}

// =========================
// User Profile
// =========================

export interface UserProfileUser {
  id: string;
  name: string;
  photoUrl?: string | null;
  telegramUsername?: string | null;
  isLanguageKeeper: boolean;
  registeredAt: string;
}

export interface UserProfileXp {
  totalXp: number;
  level: number;
  xpInCurrentLevel: number;
  xpToNextLevel: number;
  progressPercent: number;
}

export interface UserProfileStreak {
  currentStreak: number;
  longestStreak: number;
  isStreakActive: boolean;
}

export interface UserProfileCampaign {
  totalStars: number;
  levelsCompleted: number;
  levelsPlayed: number;
}

export interface UserProfileDictionary {
  wordsAdded: number;
  wordsVerified: number;
  wordsApproved: number;
}

export interface UserProfileXpByType {
  type: string;
  totalAmount: number;
  count: number;
}

export interface UserProfileXpHistoryItem {
  id: string;
  type: string;
  amount: number;
  totalXpAfter: number;
  levelAfter: number;
  description: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface UserProfileAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'starter' | 'progress' | 'streak' | 'campaign' | 'daily' | 'community';
  target: number;
  progress: number;
  progressPercent: number;
  isUnlocked: boolean;
}

export interface UserProfileAchievementSummary {
  total: number;
  unlocked: number;
  completionPercent: number;
}

export interface UserProfileResponse {
  user: UserProfileUser;
  xp: UserProfileXp;
  streak: UserProfileStreak;
  campaign: UserProfileCampaign;
  dictionary: UserProfileDictionary;
  xpByType: UserProfileXpByType[];
  recentXpHistory: UserProfileXpHistoryItem[];
  achievements: UserProfileAchievement[];
  nextAchievements: UserProfileAchievement[];
  achievementSummary: UserProfileAchievementSummary;
  isOwnProfile: boolean;
}

export async function getUserProfile(userId: string): Promise<UserProfileResponse> {
  if (!netUsable()) return offlineOnly();
  return apiRequest<UserProfileResponse>(`/users/${encodeURIComponent(userId)}/profile`, { method: 'GET' });
}

// =========================
// Broadcast (admin)
// =========================

export type BroadcastCohortType =
  | 'all'
  | 'telegram_ids'
  | 'role'
  | 'premium'
  | 'active'
  | 'inactive'
  | 'language_keepers'
  | 'prelaunch'
  | 'zero_star_inactive_24h';

export type BroadcastStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export interface BroadcastButton {
  text: string;
  url: string;
  isMiniApp?: boolean;
}

export interface BroadcastRequest {
  message: string;
  cohortType: BroadcastCohortType;
  telegramIds?: number[];
  role?: 'user' | 'trusted' | 'moderator' | 'admin';
  days?: number;
  button?: BroadcastButton;
}

export interface BroadcastErrorBreakdown {
  blocked: number;
  deactivated: number;
  chatNotFound: number;
  other: number;
}

export interface BroadcastItem {
  _id: string;
  message: string;
  cohortType: BroadcastCohortType;
  cohortParams?: {
    telegramIds?: number[];
    role?: string;
    days?: number;
    button?: BroadcastButton;
  };
  status: BroadcastStatus;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  failedTelegramIds: number[];
  errorBreakdown?: BroadcastErrorBreakdown;
  initiatedBy: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface BroadcastPreviewResponse {
  count: number;
  sampleTelegramIds: number[];
}

export interface BroadcastListResponse {
  items: BroadcastItem[];
  total: number;
}

export async function sendBroadcast(data: BroadcastRequest): Promise<BroadcastItem> {
  return apiRequest<BroadcastItem>('/broadcast', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function previewBroadcast(data: BroadcastRequest): Promise<BroadcastPreviewResponse> {
  return apiRequest<BroadcastPreviewResponse>('/broadcast/preview', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getBroadcastList(page = 1, limit = 20): Promise<BroadcastListResponse> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  return apiRequest<BroadcastListResponse>(`/broadcast?${params}`, { method: 'GET' });
}

export async function getBroadcastDetail(id: string): Promise<BroadcastItem> {
  return apiRequest<BroadcastItem>(`/broadcast/${encodeURIComponent(id)}`, { method: 'GET' });
}

// =========================
// Level Mode (уровневый режим — player API)
// =========================

export interface LevelModeProgressLevel {
  levelNumber: number;
  stars: number;
  bestTimeSeconds: number;
  attempts: number;
  firstCompletedAt: string;
}

export interface LevelModeProgressResponse {
  maxUnlockedLevel: number;
  maxCompletedLevel: number;
  totalStars: number;
  levelsCompleted: number;
  perfectLevels: number;
  levels: LevelModeProgressLevel[];
}

export interface LevelModeLevelWord {
  bur: string;
  rus: string;
  wordId: string;
}

export interface LevelModeLevelResponse {
  levelNumber: number;
  words: LevelModeLevelWord[];
  gridSize: number;
  timeLimitSeconds: number;
  maxStars: number;
  currentStars: number | null;
  bestTimeSeconds: number | null;
  sessionId: string;
  sessionExpiresAt: string;
  isManual: boolean;
}

export interface LevelModeSubmitRequest {
  timeSeconds: number;
  sessionId: string;
  foundWords: string[];
  mistakes?: number;
}

export interface LevelModeSubmitResponse {
  success: boolean;
  earnedStars: number;
  isNewStarRecord: boolean;
  isNewTimeRecord: boolean;
  previousBestTime: number | null;
  timeSeconds: number;
  nextLevelUnlocked: boolean;
  wordsFound: number;
  wordsTotal: number;
  wordsFoundPercent: number;
  validFoundWords: string[];
  missedWords: string[];
  invalidWords: string[] | null;
  timeLimitSeconds: number;
  previousBestStars: number | null;
  attemptNumber: number;
  xpGained: number;
  totalXp: number;
  userLevel: number;
  leveledUp: boolean;
  xpReason: string;
}

export interface LevelModeLevelLeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  telegramUsername?: string;
  stars: number;
  bestTimeSeconds?: number;
  attempts: number;
  firstCompletedAt?: string;
  isCurrentUser: boolean;
}

export interface LevelModeLevelLeaderboardResponse {
  levelNumber: number;
  totalParticipants: number;
  totalAttempts: number;
  avgAttempts?: number;
  avgBestTimeSeconds?: number;
  myRank?: number;
  myBestResult?: LevelModeLevelLeaderboardEntry;
  entries: LevelModeLevelLeaderboardEntry[];
}

export async function getLevelModeProgress(): Promise<LevelModeProgressResponse> {
  if (OFFLINE) return offlineGetProgress();
  return apiRequest<LevelModeProgressResponse>('/level-mode/progress', { method: 'GET' });
}

export async function getLevelModeLevel(levelNumber: number): Promise<LevelModeLevelResponse> {
  if (OFFLINE) return offlineGetLevel(levelNumber);
  return apiRequest<LevelModeLevelResponse>(`/level-mode/levels/${levelNumber}`, { method: 'GET' });
}

export async function submitLevelModeLevel(
  levelNumber: number,
  body: LevelModeSubmitRequest
): Promise<LevelModeSubmitResponse> {
  if (OFFLINE) return offlineSubmit(levelNumber, body);
  return apiRequest<LevelModeSubmitResponse>(`/level-mode/levels/${levelNumber}/submit`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getLevelModeLevelLeaderboard(
  levelNumber: number,
  limit = 50,
): Promise<LevelModeLevelLeaderboardResponse> {
  if (OFFLINE) return offlineLeaderboard(levelNumber);
  const params = new URLSearchParams({ limit: String(limit) });
  return apiRequest<LevelModeLevelLeaderboardResponse>(
    `/level-mode/levels/${levelNumber}/leaderboard?${params.toString()}`,
    { method: 'GET' },
  );
}

// =========================
// Admin: Level Mode (ручные уровни)
// =========================

export interface AdminLevel {
  _id: string;
  levelNumber: number;
  words?: string[];     // массив _id из коллекции words (пустой = автогенерация)
  gridSize?: number;    // 4-10, дефолт 6
  timeLimitSeconds?: number; // >= 30, дефолт 120
  wordCount?: number;   // 3-20, для автогенерации
  maxDifficulty?: number; // 1-10, для автогенерации
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  // Populated слова (если сервер отдаёт)
  populatedWords?: Array<{ _id: string; bur: string; ru: string }>;
}

export interface AdminLevelCreateRequest {
  levelNumber: number;
  words?: string[];
  gridSize?: number;
  timeLimitSeconds?: number;
  wordCount?: number;
  maxDifficulty?: number;
  isActive?: boolean;
}

export interface GenerateAdminLevelWordsRequest {
  gridSize: number;
  maxDifficulty?: number;
  minWordLength?: number;
  maxWordLength?: number;
  minWords?: number;
  maxWords?: number;
  attempts?: number;
}

export interface GeneratedAdminLevelWord {
  _id: string;
  bur: string;
  ru: string;
  length: number;
}

export interface GenerateAdminLevelWordsResponse {
  gridSize: number;
  targetLetters: number;
  totalLetters: number;
  words: GeneratedAdminLevelWord[];
}

export interface LevelDifficultyThresholds {
  mediumAvgAttempts: number;
  hardAvgAttempts: number;
  mediumAvgBestTimeSeconds: number;
  hardAvgBestTimeSeconds: number;
}

export type AdminLevelUpdateRequest = Omit<Partial<AdminLevelCreateRequest>, 'levelNumber'>;

export async function getAdminLevels(): Promise<AdminLevel[]> {
  return apiRequest<AdminLevel[]>('/level-mode/admin/levels', { method: 'GET' });
}

export async function createAdminLevel(data: AdminLevelCreateRequest): Promise<AdminLevel> {
  return apiRequest<AdminLevel>('/level-mode/admin/levels', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function generateAdminLevelWords(
  data: GenerateAdminLevelWordsRequest,
): Promise<GenerateAdminLevelWordsResponse> {
  return apiRequest<GenerateAdminLevelWordsResponse>('/level-mode/admin/generate-words', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAdminLevel(levelNumber: number, data: AdminLevelUpdateRequest): Promise<AdminLevel> {
  return apiRequest<AdminLevel>(`/level-mode/admin/levels/${levelNumber}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteAdminLevel(levelNumber: number): Promise<void> {
  return apiRequest<void>(`/level-mode/admin/levels/${levelNumber}`, { method: 'DELETE' });
}

export async function getLevelDifficultyThresholds(): Promise<LevelDifficultyThresholds> {
  if (OFFLINE) {
    return { mediumAvgAttempts: 3, hardAvgAttempts: 6, mediumAvgBestTimeSeconds: 90, hardAvgBestTimeSeconds: 180 };
  }
  return apiRequest<LevelDifficultyThresholds>('/level-mode/settings/level-difficulty-thresholds', {
    method: 'GET',
  });
}

export async function updateLevelDifficultyThresholds(
  data: LevelDifficultyThresholds,
): Promise<LevelDifficultyThresholds> {
  return apiRequest<LevelDifficultyThresholds>('/level-mode/admin/settings/level-difficulty-thresholds', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// =========================
// Daily Word (player — Филлворд дня)
// =========================

export interface DailyWordWord {
  bur: string;
  rus: string;
  wordId: string;
}

export interface DailyWordPlacement {
  wordId: string;
  bur: string;
  rus: string;
  path: Array<{ r: number; c: number }>;
}

export interface DailyWordTodayResponse {
  date: string;
  words: DailyWordWord[];
  gridSize: number;
  timeLimitSeconds: number;
  maxStars: number;
  currentStars: number | null;
  bestTimeSeconds: number | null;
  sessionId: string;
  sessionExpiresAt: string;
  /** Статичная сетка, нарисованная админом (если есть) */
  grid?: string[][];
  /** Пути слов на сетке (если есть) */
  wordPlacements?: DailyWordPlacement[];
}

export interface DailyWordSubmitRequest {
  sessionId: string;
  timeSeconds: number;
  foundWords: string[];
  mistakes?: number;
}

export interface DailyWordSubmitWordInfo {
  bur: string;
  rus: string;
}

export interface DailyWordSubmitResponse {
  success: boolean;
  date: string;
  earnedStars: number;
  isNewStarRecord: boolean;
  isNewTimeRecord: boolean;
  previousBestTime: number | null;
  timeSeconds: number;
  wordsFound: number;
  wordsTotal: number;
  wordsFoundPercent: number;
  validFoundWords: DailyWordSubmitWordInfo[];
  missedWords: DailyWordSubmitWordInfo[] | null;
  invalidWords: string[] | null;
  timeLimitSeconds: number;
  previousBestStars: number | null;
  attemptNumber: number;
  xpGained: number;
  totalXp: number;
  userLevel: number;
  leveledUp: boolean;
  xpReason?: string;
}

// Офлайн-сборка: дейлик ВСЕГДА локальный (детерминированный по дате) — серверный дейлик
// это другой пазл с серверной сессией, смешивать их нельзя.
export async function getDailyWordToday(): Promise<DailyWordTodayResponse> {
  if (OFFLINE) return offlineGetDailyToday();
  return apiRequest<DailyWordTodayResponse>('/daily-word/today', { method: 'GET' });
}

export async function submitDailyWord(body: DailyWordSubmitRequest): Promise<DailyWordSubmitResponse> {
  if (OFFLINE) return offlineSubmitDaily(body);
  return apiRequest<DailyWordSubmitResponse>('/daily-word/today/submit', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export interface DailyWordLeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  telegramUsername?: string;
  stars: number;
  bestTimeSeconds?: number;
  firstCompletedAt?: string;
  isCurrentUser: boolean;
}

export interface DailyWordLeaderboardResponse {
  date: string;
  totalParticipants: number;
  myRank?: number;
  myBestResult?: DailyWordLeaderboardEntry;
  entries: DailyWordLeaderboardEntry[];
}

export async function getDailyWordTodayLeaderboard(limit = 50): Promise<DailyWordLeaderboardResponse> {
  if (OFFLINE) return offlineDailyLeaderboard();
  const params = new URLSearchParams({ limit: String(limit) });
  return apiRequest<DailyWordLeaderboardResponse>(`/daily-word/today/leaderboard?${params.toString()}`, {
    method: 'GET',
  });
}

// =========================
// Admin: Daily Word (Филлворд дня)
// =========================

export interface DailyWordPopulatedWord {
  _id: string;
  bur: string;
  ru: string;
}

export interface DailyWordItem {
  _id: string;
  date: string; // YYYY-MM-DD
  words: string[] | DailyWordPopulatedWord[];
  gridSize: number;
  timeLimitSeconds: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DailyWordAdminPlacement {
  wordId: string;
  path: Array<{ r: number; c: number }>;
}

export interface DailyWordDetailResponse {
  _id: string;
  date: string;
  words: DailyWordPopulatedWord[];
  gridSize: number;
  timeLimitSeconds: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** Статичная сетка, нарисованная админом */
  grid?: string[][];
  /** Пути слов */
  wordPlacements?: DailyWordAdminPlacement[];
}

export interface DailyWordCreateRequest {
  date: string; // YYYY-MM-DD
  words: string[]; // word IDs
  gridSize: number;
  timeLimitSeconds: number;
  isActive?: boolean;
  /** Статичная сетка */
  grid?: string[][];
  /** Пути слов */
  wordPlacements?: DailyWordAdminPlacement[];
}

export interface DailyWordUpdateRequest {
  words?: string[];
  gridSize?: number;
  timeLimitSeconds?: number;
  isActive?: boolean;
  /** Статичная сетка */
  grid?: string[][];
  /** Пути слов */
  wordPlacements?: DailyWordAdminPlacement[];
}

export interface GenerateDailyWordGridRequest {
  gridSize: number;
  minWordLength?: number;
  maxWordLength?: number;
  minWords?: number;
  maxWords?: number;
  difficultyMin?: number;
  difficultyMax?: number;
  attempts?: number;
}

export interface GeneratedDailyWordGridWord {
  _id: string;
  bur: string;
  ru: string;
  length: number;
}

export interface GeneratedDailyWordGridResponse {
  gridSize: number;
  targetCells: number;
  totalLetters: number;
  words: GeneratedDailyWordGridWord[];
  grid: string[][];
  wordPlacements: DailyWordAdminPlacement[];
}

export async function getDailyWordList(): Promise<DailyWordItem[]> {
  return apiRequest<DailyWordItem[]>('/daily-word/admin/list', { method: 'GET' });
}

export async function getDailyWordByDate(date: string): Promise<DailyWordDetailResponse> {
  return apiRequest<DailyWordDetailResponse>(`/daily-word/admin/${encodeURIComponent(date)}`, { method: 'GET' });
}

export async function createDailyWord(data: DailyWordCreateRequest): Promise<DailyWordItem> {
  return apiRequest<DailyWordItem>('/daily-word/admin', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function generateDailyWordGrid(
  data: GenerateDailyWordGridRequest,
): Promise<GeneratedDailyWordGridResponse> {
  return apiRequest<GeneratedDailyWordGridResponse>('/daily-word/admin/generate-grid', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateDailyWord(date: string, data: DailyWordUpdateRequest): Promise<DailyWordItem> {
  return apiRequest<DailyWordItem>(`/daily-word/admin/${encodeURIComponent(date)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteDailyWord(date: string): Promise<void> {
  return apiRequest<void>(`/daily-word/admin/${encodeURIComponent(date)}`, { method: 'DELETE' });
}

// API экспорт
export const api = {
  telegramAuth,
  requestEmailOtp,
  verifyEmailOtp,
  refreshToken,
  getMe,
  resolvePaywallEligibility,
  logout,
  getStoredTokens,
  clearStoredTokens,
  getCategories,
  getDialects,
  getPartsOfSpeech,
  createWord,
  getProjectStats,
  getWordsStats,
  getWords,
  getWordDetail,
  getLanguageKeepersLeaderboard,
  getUserStats,
  joinLanguageKeepers,
  leaveLanguageKeepers,
  getPendingWords,
  voteWord,
  updateOnboarding,
  updateName,

  // Comments
  addComment,
  editComment,
  deleteComment,

  // Campaign
  getCampaignOverview,
  getCampaignLevel,
  startCampaignLevel,
  submitCampaignLevel,
  trackCampaignModuleOpened,
  trackCampaignPaywallShown,

  // Activity
  getActivityStreak,
  trackActivity,

  // Analytics
  trackAnalyticsEvents,
  getCampaignPerformance,
  getAnalyticsDaily,
  getAnalyticsAdminEngagement,

  // Campaign Admin
  getCampaignAdminChapters,
  getCampaignAdminChapter,
  createCampaignAdminChapter,
  updateCampaignAdminChapter,
  updateCampaignAdminChapterStatus,
  getCampaignAdminLevels,
  getCampaignAdminLevel,
  createCampaignAdminLevel,
  updateCampaignAdminLevel,
  deleteCampaignAdminLevel,
  getCampaignAdminMapVariants,
  createCampaignAdminMapVariant,
  updateCampaignAdminMapVariant,
  deleteCampaignAdminMapVariant,

  // Leaderboard
  getLeaderboard,

  // User Profile
  getUserProfile,

  // Settings
  getSettings,
  patchSettings,

  // Broadcast
  sendBroadcast,
  previewBroadcast,
  getBroadcastList,
  getBroadcastDetail,

  // Level Mode (player)
  getLevelModeProgress,
  getLevelModeLevel,
  submitLevelModeLevel,
  getLevelModeLevelLeaderboard,

  // Admin: Level Mode
  getAdminLevels,
  createAdminLevel,
  generateAdminLevelWords,
  updateAdminLevel,
  deleteAdminLevel,
  getLevelDifficultyThresholds,
  updateLevelDifficultyThresholds,

  // Daily Word (player)
  getDailyWordToday,
  getDailyWordTodayLeaderboard,
  submitDailyWord,

  // Admin: Daily Word
  getDailyWordList,
  getDailyWordByDate,
  createDailyWord,
  generateDailyWordGrid,
  updateDailyWord,
  deleteDailyWord,

  // Универсальные методы для других запросов
  get: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, data?: unknown) => 
    apiRequest<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(endpoint: string, data?: unknown) => 
    apiRequest<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  patch: <T>(endpoint: string, data?: unknown) => 
    apiRequest<T>(endpoint, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: 'DELETE' }),
};

