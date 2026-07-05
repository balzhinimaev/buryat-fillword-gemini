// src/screens/WordContributionScreen.tsx
// «Үгын Дархан» — словарная мастерская: добавление слов (с озвучкой),
// проверка слов и озвучек сообществом, «моё» (вклад со статусами), рейтинг.
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Check,
  Sparkles,
  Trophy,
  FolderHeart,
  Mic,
  SpellCheck,
  Flag,
} from 'lucide-react';
import type { GameStore } from '../store/gameStore';
import { useTelegram, useBackButton } from '../hooks/useTelegram';
import { useAuth } from '../store/authStore';
import { useTheme } from '../theme/ThemeContext';
import { cn } from '../components/ui';
import { StickyHeader } from '../components/StickyHeader';
import {
  api,
  type ApiCategory,
  type ApiDialect,
  type ApiPartOfSpeech,
  type ProjectStats,
  type UserStats,
  type WordsStats,
  type LanguageKeeperLeaderboardItem,
  type UserResponse,
  getDialects,
  getPartsOfSpeech,
  createWord,
  getProjectStats,
  getUserStats,
  getWordsStats,
  getLanguageKeepersLeaderboard,
  joinLanguageKeepers,
  getPendingAudioSuggestions,
  getOpenContentReports,
} from '../services/api';
import { WordVerificationPanel } from '../components/WordVerificationPanel';
import { WelcomeScreen, AddWordForm, StatsView, type Tab } from '../components/contribution';
import { MyWordsView } from '../components/contribution/MyWordsView';
import { AudioModerationPanel } from '../components/contribution/AudioModerationPanel';
import { ReportsModerationPanel } from '../components/contribution/ReportsModerationPanel';
import { OFFLINE } from '../config/offline';
import { submitWordOfflineAware, syncQueue, queueStats } from '../services/contribSync';
import { syncDictionary } from '../services/offlineDict';

interface Props {
  store: GameStore;
}

// Главный компонент экрана
export const WordContributionScreen: React.FC<Props> = ({ store }) => {
  const { goBack } = store;
  const { state: authState, refreshUser } = useAuth();
  const { user: telegramUser } = useTelegram();
  const { theme, isDark } = useTheme();

  const [joinCompletedLocally, setJoinCompletedLocally] = useState(false);

  const isLanguageKeeper = Boolean(authState.user?.isLanguageKeeper || joinCompletedLocally);
  const userRole = authState.user?.role ?? 'user';
  const canModerate = userRole === 'moderator' || userRole === 'admin';
  const contributorName =
    authState.user?.name ||
    [telegramUser?.first_name, telegramUser?.last_name].filter(Boolean).join(' ') ||
    telegramUser?.username ||
    'Гость';
  const contributorPhoto = authState.user?.photoUrl || telegramUser?.photo_url;
  const contributorWordsAdded = authState.user?.stats?.wordsAdded ?? 0;

  useBackButton(() => goBack());
  const [activeTab, setActiveTab] = useState<Tab>('add');
  // подраздел вкладки «Проверка» для модераторов: слова | озвучки
  const [verifyMode, setVerifyMode] = useState<'words' | 'audio' | 'reports'>('words');
  const [pendingAudioCount, setPendingAudioCount] = useState(0);
  const [openReportsCount, setOpenReportsCount] = useState(0);

  // Офлайн-синхронизация раздела (очередь выгрузки слов)
  const [qstats, setQstats] = useState(() => queueStats());
  const [syncingQ, setSyncingQ] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const handleSyncQueue = async () => {
    // Одноразовое пояснение: синхронизация создаёт анонимный аккаунт устройства.
    if (!localStorage.getItem('burlive_sync_consent')) {
      const ok = window.confirm(
        'Синхронизация создаст анонимный аккаунт устройства и отправит добавленные слова на сервер (на модерацию). Слова появятся в общем словаре после проверки. Продолжить?'
      );
      if (!ok) return;
      localStorage.setItem('burlive_sync_consent', '1');
    }
    setSyncingQ(true);
    setSyncMsg('');
    try {
      const r = await syncQueue();
      const d = await syncDictionary();
      setQstats(queueStats());
      if (!r.ok) setSyncMsg(r.reason === 'offline' ? 'нет сети' : 'не удалось войти');
      else setSyncMsg(`отправлено +${r.pushed}, обновлено ${r.pulled}${d.added ? `, словарь +${d.added}` : ''}${r.failed ? `, ошибок ${r.failed}` : ''}`);
    } finally {
      setSyncingQ(false);
    }
  };

  // Справочники и статистика
  const [apiCategories, setApiCategories] = useState<ApiCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [apiDialects, setApiDialects] = useState<ApiDialect[]>([]);
  const [dialectsLoading, setDialectsLoading] = useState(true);
  const [apiPartsOfSpeech, setApiPartsOfSpeech] = useState<ApiPartOfSpeech[]>([]);
  const [partsOfSpeechLoading, setPartsOfSpeechLoading] = useState(true);
  const [projectStats, setProjectStats] = useState<ProjectStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [wordsStats, setWordsStats] = useState<WordsStats | null>(null);
  const [wordsStatsLoading, setWordsStatsLoading] = useState(true);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [userStatsLoading, setUserStatsLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LanguageKeeperLeaderboardItem[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  useEffect(() => {
    const run = async <T,>(
      fetcher: () => Promise<T>,
      set: (v: T) => void,
      setLoading: (v: boolean) => void,
    ) => {
      try {
        setLoading(true);
        set(await fetcher());
      } catch (error) {
        console.error('Workshop fetch failed:', error);
      } finally {
        setLoading(false);
      }
    };

    void run(async () => (await api.getCategories()).sort((a, b) => a.order - b.order), setApiCategories, setCategoriesLoading);
    void run(async () => (await getDialects()).sort((a, b) => a.sortOrder - b.sortOrder), setApiDialects, setDialectsLoading);
    void run(async () => (await getPartsOfSpeech()).sort((a, b) => a.sortOrder - b.sortOrder), setApiPartsOfSpeech, setPartsOfSpeechLoading);
    void run(getProjectStats, setProjectStats, setStatsLoading);
    void run(getWordsStats, setWordsStats, setWordsStatsLoading);
  }, []);

  // Счётчик озвучек на модерации (бейдж для модераторов)
  useEffect(() => {
    if (!canModerate) return;
    getPendingAudioSuggestions()
      .then((list) => setPendingAudioCount(list.length))
      .catch(() => {});
    getOpenContentReports()
      .then((list) => setOpenReportsCount(list.length))
      .catch(() => {});
  }, [canModerate, activeTab]);

  // Синхронизация флага хранителя: после первого успешного join не
  // показываем welcome повторно даже если refresh /auth/me чуть задержался.
  useEffect(() => {
    if (authState.user?.isLanguageKeeper) {
      setJoinCompletedLocally(true);
    }
  }, [authState.user?.isLanguageKeeper]);

  // При входе в экран подтягиваем актуальный профиль с backend
  useEffect(() => {
    if (!authState.isAuthenticated) return;
    refreshUser();
  }, [authState.isAuthenticated, refreshUser]);

  const handleJoinKeepers = useCallback(async (): Promise<UserResponse> => {
    const response = await joinLanguageKeepers();
    setJoinCompletedLocally(true);
    await refreshUser();
    return response;
  }, [refreshUser]);

  // Личная статистика и лидерборд при открытии вкладки «Рейтинг»
  useEffect(() => {
    if (activeTab !== 'stats' || !isLanguageKeeper) return;
    setUserStatsLoading(true);
    getUserStats()
      .then(setUserStats)
      .catch(() => setUserStats(null))
      .finally(() => setUserStatsLoading(false));
    setLeaderboardLoading(true);
    getLanguageKeepersLeaderboard()
      .then(setLeaderboard)
      .catch(() => setLeaderboard([]))
      .finally(() => setLeaderboardLoading(false));
  }, [activeTab, isLanguageKeeper]);

  const tabs: Array<{ id: Tab; label: string; icon: typeof Plus; badge?: number }> = [
    { id: 'add', label: 'Добавить', icon: Plus },
    { id: 'verify', label: 'Проверка', icon: Check, badge: canModerate ? pendingAudioCount + openReportsCount : 0 },
    { id: 'mine', label: 'Моё', icon: FolderHeart },
    { id: 'stats', label: 'Рейтинг', icon: Trophy },
  ];

  const heroChip = (value: React.ReactNode, label: string) => (
    <div className="px-3 py-2 rounded-xl bg-white/10 backdrop-blur-sm text-center min-w-[72px]">
      <div className="text-base font-extrabold leading-none">{value}</div>
      <div className="text-[10px] uppercase tracking-wider opacity-70 mt-1">{label}</div>
    </div>
  );

  return (
    <div className={cn(
      "min-h-[100dvh] flex flex-col",
      isDark ? theme.backgrounds.primaryGradient : "bg-gradient-to-b from-stone-50 via-amber-50/30 to-orange-50/20"
    )}>
      {/* Sticky Header при скролле */}
      <StickyHeader
        title="Үгын Дархан"
        onBack={() => goBack()}
      />

      {/* Hero-шапка */}
      <header className={cn(
        'relative overflow-hidden p-4 pb-5',
        isDark ? '' : 'rounded-b-3xl shadow-lg',
        theme.header.bg,
        theme.header.text
      )}>
        <div className="absolute -top-12 -right-8 w-44 h-44 rounded-full bg-amber-500/15 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 -left-10 w-36 h-36 rounded-full bg-orange-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <button onClick={() => goBack()} aria-label="Назад" className="p-2 -ml-2 rounded-xl active:bg-white/10">
              <ArrowLeft size={22} />
            </button>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-60">
              сообщество
            </span>
          </div>

          <div className="flex items-end justify-between gap-3 mt-1">
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold leading-tight">Үгын Дархан</h1>
              <p className="text-xs opacity-70 mt-1">
                Мастерская слов: пополняем словарь и озвучиваем его вместе
              </p>
            </div>

            {isLanguageKeeper && (
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 p-0.5 flex-shrink-0">
                {contributorPhoto ? (
                  <img
                    src={contributorPhoto}
                    alt={contributorName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className={cn(
                    "w-full h-full rounded-full flex items-center justify-center font-bold",
                    isDark ? "bg-stone-800 text-amber-400" : "bg-white text-amber-600"
                  )}>
                    {contributorName[0]?.toUpperCase() || 'Г'}
                  </div>
                )}
              </div>
            )}
          </div>

          {isLanguageKeeper && (
            <div className="flex gap-2 mt-4">
              {heroChip(wordsStatsLoading ? '…' : (wordsStats?.verified ?? '—'), 'в словаре')}
              {heroChip(wordsStatsLoading ? '…' : (wordsStats?.pending ?? '—'), 'на проверке')}
              {heroChip(contributorWordsAdded, 'мой вклад')}
            </div>
          )}
        </div>
      </header>

      {/* Контент */}
      <main className="flex-1 px-4 pb-6 pt-4 overflow-y-auto relative z-10">
        {!isLanguageKeeper ? (
          <WelcomeScreen
            onJoinKeepers={handleJoinKeepers}
            telegramUser={telegramUser}
            projectStats={projectStats}
            statsLoading={statsLoading}
          />
        ) : (
          <>
            {/* Табы */}
            <div className={cn(
              "flex gap-1 mb-5 p-1 rounded-2xl shadow-sm",
              isDark ? theme.backgrounds.card : "bg-white border border-stone-200"
            )}>
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-1 py-2.5 px-1 rounded-xl font-medium transition-all relative",
                    "flex flex-col items-center justify-center gap-0.5",
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25'
                      : cn(isDark ? "text-stone-400 hover:text-white hover:bg-stone-700/30" : "text-stone-500 hover:text-stone-800 hover:bg-stone-100")
                  )}
                >
                  <tab.icon size={17} />
                  <span className="text-[11px] leading-none">{tab.label}</span>
                  {!!tab.badge && (
                    <span className="absolute top-1 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Контент табов */}
            <AnimatePresence mode="wait">
              {activeTab === 'add' && (
                <motion.div
                  key="add"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <div className={cn(
                    "mb-5 p-4 rounded-2xl border",
                    isDark
                      ? "bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20"
                      : "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300 shadow-sm"
                  )}>
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                        isDark ? "bg-amber-500/20" : "bg-amber-100"
                      )}>
                        <Sparkles className={isDark ? "text-amber-400" : "text-amber-600"} size={20} />
                      </div>
                      <div>
                        <p className={cn("font-semibold mb-1", isDark ? "text-amber-200" : "text-amber-800")}>Как добавить слово?</p>
                        <p className={cn("text-sm", isDark ? "text-stone-400" : "text-amber-700/80")}>
                          Введите бурятское слово, перевод и категорию — можно сразу записать
                          произношение. Слово появится в игре после проверки носителями языка.
                        </p>
                      </div>
                    </div>
                  </div>

                  {OFFLINE && (
                    <div className="mb-3 p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-3">
                      <div className="text-sm">
                        <div className="font-medium">Синхронизация словаря</div>
                        <div className="opacity-70">
                          {qstats.pending} в очереди · {qstats.synced} отправлено
                          {syncMsg ? ` · ${syncMsg}` : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleSyncQueue}
                        disabled={syncingQ}
                        className="px-3 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium disabled:opacity-50 whitespace-nowrap"
                      >
                        {syncingQ ? 'Синхронизация…' : 'Синхронизировать'}
                      </button>
                    </div>
                  )}
                  <AddWordForm
                    onSubmit={
                      OFFLINE
                        ? async (d) => {
                            const r = await submitWordOfflineAware(d);
                            setQstats(queueStats());
                            return r;
                          }
                        : createWord
                    }
                    categories={apiCategories}
                    categoriesLoading={categoriesLoading}
                    dialects={apiDialects}
                    dialectsLoading={dialectsLoading}
                    partsOfSpeech={apiPartsOfSpeech}
                    partsOfSpeechLoading={partsOfSpeechLoading}
                  />
                </motion.div>
              )}

              {activeTab === 'verify' && (
                <motion.div
                  key="verify"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  {canModerate && (
                    <div className={cn(
                      "flex gap-1 mb-4 p-1 rounded-xl w-fit",
                      isDark ? "bg-stone-800/70" : "bg-stone-100"
                    )}>
                      {([
                        { id: 'words' as const, label: 'Слова', icon: SpellCheck },
                        { id: 'audio' as const, label: `Озвучки${pendingAudioCount ? ` · ${pendingAudioCount}` : ''}`, icon: Mic },
                        { id: 'reports' as const, label: `Жалобы${openReportsCount ? ` · ${openReportsCount}` : ''}`, icon: Flag },
                      ]).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setVerifyMode(m.id)}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition',
                            verifyMode === m.id
                              ? 'bg-amber-500 text-white shadow'
                              : theme.text.muted,
                          )}
                        >
                          <m.icon size={13} />
                          {m.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {canModerate && verifyMode === 'audio' && <AudioModerationPanel />}
                  {canModerate && verifyMode === 'reports' && <ReportsModerationPanel />}
                  {(!canModerate || verifyMode === 'words') && <WordVerificationPanel categories={apiCategories} />}
                </motion.div>
              )}

              {activeTab === 'mine' && (
                <motion.div
                  key="mine"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <MyWordsView />
                </motion.div>
              )}

              {activeTab === 'stats' && (
                <motion.div
                  key="stats"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <StatsView
                    stats={{ totalWords: 0, pendingWords: 0, verifiedWords: 0, rejectedWords: 0, topContributors: [] }}
                    wordsStats={wordsStats}
                    wordsStatsLoading={wordsStatsLoading}
                    userStats={userStats}
                    userStatsLoading={userStatsLoading}
                    leaderboard={leaderboard}
                    leaderboardLoading={leaderboardLoading}
                    onExport={() => {}}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </main>
    </div>
  );
};

export default WordContributionScreen;
