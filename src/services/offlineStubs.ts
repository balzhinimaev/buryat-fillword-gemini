// Офлайн-заглушки для методов api без собственного офлайн-движка.
// Чтение → локальные данные, где они есть (стрик/статистика/XP), иначе безопасные
// пустые значения (экран не падает); запись → понятная ошибка.
import { localStreak, localXpInfo } from './localStats';
import { offlineCampaignMeStats } from './offlineCampaign';
import type {
  ActivityStreakResponse, ProjectStats, UserStats, LeaderboardResponse,
  DailyWordLeaderboardResponse, ApiSettings, MeResponse,
  LanguageKeeperLeaderboardItem, ApiDialect, ApiPartOfSpeech,
  PendingWord, IngestAnalyticsEventsResponse,
} from './api';

export const OFFLINE_ONLY_MSG = 'Доступно только при подключении к интернету';
export function offlineOnly(): never {
  throw new Error(OFFLINE_ONLY_MSG);
}

export const offlineStreak = (): ActivityStreakResponse => {
  const s = localStreak();
  return {
    currentStreak: s.current,
    longestStreak: s.longest,
    lastActiveDate: s.lastActiveDate,
    isStreakActive: s.isActive,
  };
};
export const offlineProjectStats = (): ProjectStats => ({
  wordsCount: 0, participantsCount: 0, categoriesCount: 0, languageKeepersCount: 0,
});
export const offlineUserStats = (): UserStats => ({
  wordsAdded: 0, wordsVerified: 0, wordsApproved: 0, wordsRejected: 0, verificationAccuracy: 0,
});
export const offlineGlobalLeaderboard = (): LeaderboardResponse => ({
  entries: [], total: 0, currentUser: null,
});
export const offlineDailyLeaderboard = (): DailyWordLeaderboardResponse => ({
  date: '', totalParticipants: 0, entries: [],
});
export const offlineKeepers = (): LanguageKeeperLeaderboardItem[] => [];
export const offlineDialects = (): ApiDialect[] => [];
export const offlinePartsOfSpeech = (): ApiPartOfSpeech[] => [];
export const offlinePending = (): PendingWord[] => [];
export const offlineAnalyticsAck = (): IngestAnalyticsEventsResponse =>
  ({ accepted: 0, inserted: 0, duplicates: 0 } as IngestAnalyticsEventsResponse);
export const offlineSettings = (): ApiSettings => ({
  isPublicProfile: false, remindersEnabled: false, hasSeenHowTo: true,
  hasSeenTimerOnboarding: true, hintsEnabled: true, timerEnabled: true,
  vibrationEnabled: true, soundEffectsEnabled: true, theme: 'steppe', difficulty: 'medium',
});
export function offlineMe(): MeResponse {
  let name = 'Игрок';
  try {
    const raw = localStorage.getItem('auth_user');
    if (raw) { const u = JSON.parse(raw); if (u?.name) name = String(u.name); }
  } catch { /* ignore */ }
  const s = localStreak();
  return {
    id: 'offline_user', name, role: 'user', trustScore: 0, onboardingCompleted: true,
    streak: { current: s.current, longest: s.longest, lastActiveDate: s.lastActiveDate },
    campaignStats: offlineCampaignMeStats(),
    xp: localXpInfo(),
  };
}
