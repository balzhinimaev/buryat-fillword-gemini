// src/screens/WordContributionScreen.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Plus, 
  Check, 
  Sparkles,
  Trophy,
  Heart,
  Users
} from 'lucide-react';
import type { GameStore } from '../store/gameStore';
import { useContributionStore } from '../store/contributionStore';
import { useTelegram, useBackButton } from '../hooks/useTelegram';
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
  getDialects, 
  getPartsOfSpeech, 
  createWord, 
  getProjectStats, 
  getUserStats, 
  getWordsStats,
  getLanguageKeepersLeaderboard,
  joinLanguageKeepers 
} from '../services/api';
import { WordVerificationPanel } from '../components/WordVerificationPanel';
import { WelcomeScreen, AddWordForm, StatsView, type Tab } from '../components/contribution';

interface Props {
  store: GameStore;
}

// Главный компонент экрана
export const WordContributionScreen: React.FC<Props> = ({ store }) => {
  const { navigate } = store;
  const contribution = useContributionStore();
  const { user: telegramUser } = useTelegram();
  const { theme, isDark } = useTheme();
  
  useBackButton(() => navigate('menu'));
  const [activeTab, setActiveTab] = useState<Tab>('add');
  
  // Категории из API
  const [apiCategories, setApiCategories] = useState<ApiCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  
  // Диалекты из API
  const [apiDialects, setApiDialects] = useState<ApiDialect[]>([]);
  const [dialectsLoading, setDialectsLoading] = useState(true);
  
  // Части речи из API
  const [apiPartsOfSpeech, setApiPartsOfSpeech] = useState<ApiPartOfSpeech[]>([]);
  const [partsOfSpeechLoading, setPartsOfSpeechLoading] = useState(true);
  
  // Статистика проекта из API
  const [projectStats, setProjectStats] = useState<ProjectStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [wordsStats, setWordsStats] = useState<WordsStats | null>(null);
  const [wordsStatsLoading, setWordsStatsLoading] = useState(true);
  
  // Личная статистика пользователя
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [userStatsLoading, setUserStatsLoading] = useState(false);
  
  // Лидерборд хранителей
  const [leaderboard, setLeaderboard] = useState<LanguageKeeperLeaderboardItem[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  
  // Загрузка категорий, диалектов, частей речи и статистики при монтировании
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        const data = await api.getCategories();
        // Сортируем по order
        setApiCategories(data.sort((a, b) => a.order - b.order));
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setCategoriesLoading(false);
      }
    };
    
    const fetchDialects = async () => {
      try {
        setDialectsLoading(true);
        const data = await getDialects();
        // Сортируем по sortOrder
        setApiDialects(data.sort((a, b) => a.sortOrder - b.sortOrder));
      } catch (error) {
        console.error('Failed to fetch dialects:', error);
      } finally {
        setDialectsLoading(false);
      }
    };
    
    const fetchPartsOfSpeech = async () => {
      try {
        setPartsOfSpeechLoading(true);
        const data = await getPartsOfSpeech();
        // Сортируем по sortOrder
        setApiPartsOfSpeech(data.sort((a, b) => a.sortOrder - b.sortOrder));
      } catch (error) {
        console.error('Failed to fetch parts of speech:', error);
      } finally {
        setPartsOfSpeechLoading(false);
      }
    };
    
    const fetchProjectStats = async () => {
      try {
        setStatsLoading(true);
        const data = await getProjectStats();
        setProjectStats(data);
      } catch (error) {
        console.error('Failed to fetch project stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };
    
    fetchCategories();
    fetchDialects();
    fetchPartsOfSpeech();
    fetchProjectStats();
    const fetchWordsStats = async () => {
      try {
        setWordsStatsLoading(true);
        const data = await getWordsStats();
        setWordsStats(data);
      } catch (error) {
        console.error('Failed to fetch words stats:', error);
        setWordsStats(null);
      } finally {
        setWordsStatsLoading(false);
      }
    };
    fetchWordsStats();
  }, []);
  
  // Загрузка личной статистики и лидерборда при открытии вкладки "Статистика"
  useEffect(() => {
    if (activeTab === 'stats' && contribution.currentContributor) {
      const fetchUserStats = async () => {
        try {
          setUserStatsLoading(true);
          const data = await getUserStats();
          setUserStats(data);
        } catch (error) {
          console.error('Failed to fetch user stats:', error);
          setUserStats(null);
        } finally {
          setUserStatsLoading(false);
        }
      };
      
      const fetchLeaderboard = async () => {
        try {
          setLeaderboardLoading(true);
          const data = await getLanguageKeepersLeaderboard();
          setLeaderboard(data);
        } catch (error) {
          console.error('Failed to fetch leaderboard:', error);
          setLeaderboard([]);
        } finally {
          setLeaderboardLoading(false);
        }
      };
      
      fetchUserStats();
      fetchLeaderboard();
    }
  }, [activeTab, contribution.currentContributor]);

  const tabs = [
    { id: 'add' as Tab, label: 'Добавить', icon: Plus },
    { id: 'verify' as Tab, label: 'Проверить', icon: Check, badge: contribution.getWordsForVerification.length },
    { id: 'stats' as Tab, label: 'Статистика', icon: Trophy },
  ];

  const handleExport = () => {
    const data = contribution.exportVerifiedWords();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `buryat_words_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn(
      "min-h-[100dvh] flex flex-col",
      isDark ? theme.backgrounds.primaryGradient : "bg-gradient-to-b from-stone-50 via-amber-50/30 to-orange-50/20"
    )}>
      {/* Sticky Header при скролле */}
      <StickyHeader 
        title="Үгын Дархан" 
        onBack={() => navigate('menu')}
        rightElement={<Heart size={20} className="text-rose-400 fill-rose-400/50" />}
      />
      
      {/* Декоративный фон */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {isDark ? (
          <>
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/3 -left-32 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl" />
          </>
        ) : (
          <>
            <div className="absolute top-20 right-0 w-96 h-96 bg-amber-200/30 rounded-full blur-3xl" />
            <div className="absolute bottom-0 -left-20 w-80 h-80 bg-orange-200/20 rounded-full blur-3xl" />
          </>
        )}
      </div>

      {/* Header */}
      <header className={cn(
        "p-4 pb-6 relative z-10",
        isDark ? "" : "rounded-b-3xl shadow-lg",
        theme.header.bg,
        theme.header.text
      )}>
        {isDark && <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl" />}
        
        <div className="relative z-10 flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('menu')}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
          >
            <ArrowLeft size={20} />
          </motion.button>
          
          <div className="flex-1">
            <h1 className="text-xl font-bold">Үгын Дархан</h1>
            <p className="text-sm opacity-80">Словарная мастерская</p>
          </div>

          {/* Аватар контрибьютора */}
          {contribution.currentContributor && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 p-0.5">
                {telegramUser?.photo_url ? (
                  <img 
                    src={telegramUser.photo_url} 
                    alt={contribution.currentContributor.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className={cn(
                    "w-full h-full rounded-full flex items-center justify-center font-bold text-sm",
                    isDark ? "bg-stone-800 text-amber-400" : "bg-white text-amber-600"
                  )}>
                    {contribution.currentContributor.name[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">
                  {contribution.currentContributor.name}
                </p>
                <p className="text-xs opacity-70">
                  {contribution.currentContributor.wordsAdded} слов
                </p>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Контент */}
      <main className={cn(
        "flex-1 px-4 pb-6 overflow-y-auto relative z-10",
        isDark ? "pt-6" : "pt-6 -mt-4"
      )}>
        {!contribution.currentContributor ? (
          // Приветственный экран
          <WelcomeScreen 
            onJoin={contribution.setContributor}
            onJoinKeepers={joinLanguageKeepers}
            telegramUser={telegramUser} 
            projectStats={projectStats}
            statsLoading={statsLoading}
          />
        ) : (
          <>
            {/* Табы */}
            <div className={cn(
              "flex gap-2 mb-6 p-1.5 rounded-2xl shadow-sm",
              isDark ? theme.backgrounds.card : "bg-white border border-stone-200"
            )}>
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-1 py-3 px-4 rounded-xl font-medium transition-all",
                    "flex items-center justify-center gap-2 relative",
                    activeTab === tab.id 
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25' 
                      : cn(isDark ? "text-stone-400 hover:text-white hover:bg-stone-700/30" : "text-stone-500 hover:text-stone-800 hover:bg-stone-100")
                  )}
                >
                  <tab.icon size={18} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 
                                     text-white text-xs flex items-center justify-center font-bold">
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
                    "mb-6 p-4 rounded-2xl border",
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
                          Введите бурятское слово, его перевод и выберите категорию. 
                          Слово появится в игре после проверки другими носителями языка.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <AddWordForm 
                    onSubmit={createWord}
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
                  <WordVerificationPanel categories={apiCategories} />
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
                    stats={contribution.stats} 
                    wordsStats={wordsStats}
                    wordsStatsLoading={wordsStatsLoading}
                    userStats={userStats} 
                    userStatsLoading={userStatsLoading}
                    leaderboard={leaderboard}
                    leaderboardLoading={leaderboardLoading}
                    onExport={handleExport} 
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className={cn(
        "p-4 text-center border-t relative z-10",
        isDark ? "border-stone-800" : "border-stone-200"
      )}>
        <p className={cn("text-sm", theme.text.dimmed)}>
          <Users className="inline-block mr-1" size={14} />
          Вместе сохраняем бурятский язык 💛
        </p>
      </footer>
    </div>
  );
};

export default WordContributionScreen;
