// API сервис для работы с бэкендом
const API_URL = import.meta.env.VITE_API_URL || 'https://anoname.ru/api';

// Событие для уведомления о необходимости переавторизации
export const AUTH_REQUIRED_EVENT = 'auth:required';

// Типы для онбординга
export type AgeRange = '18-24' | '25-34' | '35-44' | '45+' | 'prefer_not_to_say';
export type BuriatLevel = 'beginner' | 'intermediate' | 'advanced' | 'native' | 'skip';
export type ReminderPlan = 'daily-10' | '3x-week-15' | 'weekend-20' | 'off';
export type ReminderTime = 'morning' | 'day' | 'evening';

// Типы ответов API
export interface AuthResponse {
  _id: string;
  access_token: string;
  refresh_token: string;
  telegramId: number;
  name: string;
  telegramUsername?: string;
  photoUrl?: string;
  role: string;
  trustScore: number;
  currentStreak?: number;
  stats: {
    wordsAdded: number;
    wordsVerified: number;
    wordsApproved: number;
    wordsRejected: number;
    verificationAccuracy: number;
  };
  isNewUser: boolean;
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

export interface RefreshResponse {
  access_token: string;
  currentStreak?: number;
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
  return apiRequest<UserResponse>('/users/me/name', {
    method: 'PATCH',
    body: JSON.stringify({ name }),
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
  options: RequestInit = {},
  isRetry = false
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
    
    // Если 401 и это не retry - пробуем обновить токен
    // НЕ пытаемся обновить токен если сам запрос /auth/refresh вернул 401
    const isAuthRefreshEndpoint = endpoint === '/auth/refresh';
    
    if (error.statusCode === 401 && !isRetry && tokens?.refresh_token && !isAuthRefreshEndpoint) {
      try {
        console.log('🔄 Пробуем обновить токен...');
        const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: tokens.refresh_token }),
        });
        
        if (refreshResponse.ok) {
          const { access_token }: RefreshResponse = await refreshResponse.json();
          console.log('✅ Токен обновлён успешно');
          setStoredTokens({ ...tokens, access_token });
          // Повторяем оригинальный запрос с новым токеном
          return apiRequest<T>(endpoint, options, true);
        } else {
          console.log('❌ Не удалось обновить токен:', await refreshResponse.text());
          // Refresh token невалиден - очищаем токены и уведомляем о необходимости переавторизации
          console.log('🔒 Очищаем невалидные токены и запрашиваем переавторизацию...');
          clearStoredTokens();
          window.dispatchEvent(new CustomEvent(AUTH_REQUIRED_EVENT));
        }
      } catch (refreshError) {
        console.log('❌ Ошибка при обновлении токена:', refreshError);
        // Если refresh не удался - очищаем токены и уведомляем
        clearStoredTokens();
        window.dispatchEvent(new CustomEvent(AUTH_REQUIRED_EVENT));
      }
    }
    
    // Если /auth/refresh сам вернул 401 - просто очищаем токены (событие будет отправлено вызывающим кодом)
    if (error.statusCode === 401 && isAuthRefreshEndpoint) {
      console.log('🔒 Refresh token недействителен, очищаем токены...');
      clearStoredTokens();
    }
    
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
  return apiRequest<ApiCategory[]>('/categories', { method: 'GET' });
}

// Получение диалектов
export async function getDialects(): Promise<ApiDialect[]> {
  return apiRequest<ApiDialect[]>('/dialects', { method: 'GET' });
}

// Получение частей речи
export async function getPartsOfSpeech(): Promise<ApiPartOfSpeech[]> {
  return apiRequest<ApiPartOfSpeech[]>('/parts-of-speech', { method: 'GET' });
}

// Создание нового слова
export async function createWord(data: CreateWordRequest): Promise<CreateWordResponse> {
  return apiRequest<CreateWordResponse>('/words', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Получение статистики проекта
export async function getProjectStats(): Promise<ProjectStats> {
  return apiRequest<ProjectStats>('/stats', { method: 'GET' });
}

// Получение общей статистики слов
export async function getWordsStats(): Promise<WordsStats> {
  return apiRequest<WordsStats>('/words/stats', { method: 'GET' });
}

// Топ хранителей языка
export async function getLanguageKeepersLeaderboard(): Promise<LanguageKeeperLeaderboardItem[]> {
  return apiRequest<LanguageKeeperLeaderboardItem[]>('/words/keepers/leaderboard', { method: 'GET' });
}

// Получение личной статистики пользователя
export async function getUserStats(): Promise<UserStats> {
  return apiRequest<UserStats>('/users/me/stats', { method: 'GET' });
}

// Присоединиться к хранителям языка
export async function joinLanguageKeepers(): Promise<UserResponse> {
  return apiRequest<UserResponse>('/users/me/join-keepers', { method: 'POST' });
}

// Покинуть хранителей языка
export async function leaveLanguageKeepers(): Promise<UserResponse> {
  return apiRequest<UserResponse>('/users/me/leave-keepers', { method: 'POST' });
}

// Получение слов на проверке
export async function getPendingWords(): Promise<PendingWord[]> {
  return apiRequest<PendingWord[]>('/words/pending', { method: 'GET' });
}

// Голосование за слово
export async function voteWord(data: VoteRequest): Promise<VoteResponse> {
  return apiRequest<VoteResponse>('/votes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Обновление онбординга
export async function updateOnboarding(data: UpdateOnboardingRequest): Promise<UserResponse> {
  return apiRequest<UserResponse>('/users/me/onboarding', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// API экспорт
export const api = {
  telegramAuth,
  refreshToken,
  logout,
  getStoredTokens,
  clearStoredTokens,
  getCategories,
  getDialects,
  getPartsOfSpeech,
  createWord,
  getProjectStats,
  getWordsStats,
  getLanguageKeepersLeaderboard,
  getUserStats,
  joinLanguageKeepers,
  leaveLanguageKeepers,
  getPendingWords,
  voteWord,
  updateOnboarding,
  updateName,
  
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

