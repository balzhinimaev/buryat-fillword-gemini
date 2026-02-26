// src/screens/LevelsScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Star, ArrowLeft, Layers, Lock, Clock, Hash, RefreshCw, Sparkles } from 'lucide-react';
import { CategoryCard, cn } from '../components/ui';
import { StickyHeader } from '../components/StickyHeader';
import { useTheme } from '../theme/ThemeContext';
import { useBackButton } from '../hooks/useTelegram';
import type { GameStore } from '../store/gameStore';
import { api, type ApiError, type CampaignDifficulty, type CampaignOverviewResponse, type CampaignOverviewLevel, type CampaignOverviewModule } from '../services/api';

interface LevelsScreenProps {
  store: GameStore;
}

export const LevelsScreen: React.FC<LevelsScreenProps> = ({ store }) => {
  const { state, goBack, selectCategory, getLevelProgress } = store;
  const { theme } = useTheme();
  
  useBackButton(() => goBack());

  const [overview, setOverview] = useState<CampaignOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errorToMessage = (e: unknown): string => {
    if (!e) return 'Не удалось загрузить кампанию';
    const apiError = e as Partial<ApiError>;
    if (typeof apiError.message === 'string' && apiError.message.length > 0) return apiError.message;
    if (e instanceof Error && e.message) return e.message;
    return 'Не удалось загрузить кампанию';
  };

  const mapDifficulty = (d: CampaignDifficulty | undefined): 'easy' | 'medium' | 'hard' => {
    switch (d) {
      case 'beginner':
        return 'easy';
      case 'intermediate':
        return 'medium';
      case 'expert':
        return 'hard';
      default:
        return 'easy';
    }
  };

  const formatTime = (seconds?: number) => {
    if (!seconds || seconds <= 0) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const loadOverview = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getCampaignOverview();
      setOverview(data);
    } catch (e) {
      setError(errorToMessage(e));
      setOverview(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const difficultySections = useMemo(() => {
    const cats = overview?.categories ?? [];
    return [...cats].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [overview]);

  const moduleSections = useMemo(() => {
    const mods = overview?.modules ?? [];
    return [...mods].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [overview]);

  const moduleHasProgress = useCallback((module: CampaignOverviewModule): boolean => {
    return (module.levels ?? []).some(level => {
      if ((level.earnedStars ?? 0) > 0) return true;
      if ((level.attempts ?? 0) > 0) return true;
      if (typeof level.bestTimeSeconds === 'number') return true;
      return Boolean(level.firstCompletedAt);
    });
  }, []);

  const getModuleEntryLevel = useCallback((module: CampaignOverviewModule): CampaignOverviewLevel | undefined => {
    const levels = [...(module.levels ?? [])].sort((a, b) => {
      const reqA = a.requiredStars ?? 0;
      const reqB = b.requiredStars ?? 0;
      if (reqA !== reqB) return reqA - reqB;
      const orderA = a.order ?? 0;
      const orderB = b.order ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return (a.slug ?? '').localeCompare(b.slug ?? '');
    });

    const firstUnlocked = levels.find(level => level.isUnlocked === true);
    return firstUnlocked ?? levels[0];
  }, []);

  return (
    <div className={cn(theme.backgrounds.primaryGradient, "min-h-[100dvh] flex flex-col relative overflow-hidden")}>
      {/* Sticky Header при скролле */}
      <StickyHeader 
        title="Кампания" 
        onBack={() => goBack()}
        rightElement={
          <div className="flex items-center gap-3">
            <button
              onClick={() => void loadOverview()}
              className={cn(
                "p-2 rounded-xl transition-colors",
                "bg-white/10 hover:bg-white/20"
              )}
              aria-label="Обновить"
              disabled={isLoading}
            >
              <RefreshCw size={18} className={cn(theme.header.text, isLoading && "animate-spin")} />
            </button>
            <Layers size={22} className={theme.text.accent} />
          </div>
        }
      />
      
      {/* Декоративный фон */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-amber-500/10 via-steppe-500/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-terra-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className={cn(theme.header.bg, theme.header.text, "relative z-10 p-4 pb-6 rounded-b-3xl shadow-lg overflow-hidden")}>
        {/* Декоративный элемент */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => goBack()}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ArrowLeft size={24} className={theme.header.text} />
            </motion.button>
            <h1 className="text-xl font-bold flex-1">Кампания</h1>
            <Layers size={24} />
          </div>
          
          {/* Stars progress */}
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Star size={20} className="text-white fill-white" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-white/70 mb-1">
                Собрано звёзд
                {typeof overview?.progressPercent === 'number' && (
                  <span className="ml-2 text-white/60">
                    ({overview.progressPercent.toFixed(2)}%)
                  </span>
                )}
              </div>
              <div className={cn("h-2 rounded-full overflow-hidden", theme.progress.track)}>
                <motion.div 
                  className={theme.progress.fill.amber}
                  style={{ height: '100%' }}
                  initial={{ width: 0 }}
                  animate={{ 
                    width: `${Math.min(
                      100, 
                      (typeof overview?.totalStars === 'number' && overview.totalStars > 0)
                        ? ((overview.earnedStars ?? 0) / overview.totalStars) * 100
                        : (state.stats.totalStars / 36) * 100
                    )}%` 
                  }}
                />
              </div>
            </div>
            <div className="text-2xl font-bold">
              <span className="text-amber-400">{overview?.earnedStars ?? state.stats.totalStars}</span>
              <span className="text-white/50">/{overview?.totalStars ?? 36}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Categories list */}
      <main className="flex-1 p-4 overflow-auto relative z-10">
        {isLoading && !overview && (
          <div className={cn("text-center py-10", theme.text.muted)}>Загрузка кампании…</div>
        )}

        {error && (
          <div className={cn("mb-4 p-4 rounded-2xl border", theme.categoryCard.bg, theme.categoryCard.border)}>
            <div className={cn("font-semibold mb-1", theme.text.primary)}>Ошибка</div>
            <div className={cn("text-sm", theme.text.secondary)}>{error}</div>
            <button
              onClick={() => void loadOverview()}
              className={cn("mt-3 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors", theme.header.text)}
            >
              Повторить
            </button>
          </div>
        )}

        {moduleSections.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className={cn('inline-flex items-center gap-2 px-3 py-1 rounded-full', theme.categoryCard.bg, theme.categoryCard.border, 'border')}>
                <Sparkles size={14} className={theme.text.accent} />
                <span className={cn('font-semibold text-sm', theme.text.primary)}>Тематические модули</span>
              </div>
              <div className={cn('text-xs', theme.text.muted)}>
                {moduleSections.length} мод.
              </div>
            </div>

            <div className="space-y-3">
              {moduleSections.map((module, index) => {
                const sortedLevels = [...(module.levels ?? [])].sort((a, b) => {
                  const reqA = a.requiredStars ?? 0;
                  const reqB = b.requiredStars ?? 0;
                  if (reqA !== reqB) return reqA - reqB;
                  const orderA = a.order ?? 0;
                  const orderB = b.order ?? 0;
                  if (orderA !== orderB) return orderA - orderB;
                  return (a.slug ?? '').localeCompare(b.slug ?? '');
                });
                const entryLevel = getModuleEntryLevel(module);
                const moduleLocked = module.isUnlocked === false || !entryLevel;
                const moduleStars = module.earnedStars ?? sortedLevels.reduce((sum, lvl) => sum + (lvl.earnedStars ?? 0), 0);
                const moduleTotalStars = module.totalStars ?? sortedLevels.reduce((sum, lvl) => sum + (lvl.maxStars ?? 3), 0);
                const moduleIsNew = !moduleLocked && !moduleHasProgress(module);
                const moduleDifficulty = mapDifficulty(entryLevel?.difficulty);
                const moduleEmoji = entryLevel?.icon ?? '🌙';
                const moduleDescription = sortedLevels.length > 0
                  ? `${sortedLevels.length} уровней · старт: ${entryLevel?.name ?? sortedLevels[0]?.name ?? 'Уровень'}`
                  : 'Тематический модуль';

                return (
                  <motion.div
                    key={module.id ?? `${module.title}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="space-y-1 relative"
                  >
                    {moduleIsNew && (
                      <div className={cn(
                        'absolute -top-1 right-2 z-20 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide',
                        'bg-emerald-500 text-white shadow'
                      )}>
                        Новый
                      </div>
                    )}

                    <CategoryCard
                      emoji={moduleEmoji}
                      name={module.title ?? module.titleBur ?? 'Тематический модуль'}
                      description={moduleDescription}
                      stars={moduleStars}
                      isLocked={moduleLocked}
                      difficulty={moduleDifficulty}
                      onClick={() => {
                        if (!entryLevel) return;
                        if (module.id) {
                          void api.trackCampaignModuleOpened(module.id, 'levels_screen').catch(() => undefined);
                        }
                        selectCategory(entryLevel.slug);
                      }}
                    />

                    <div className={cn('flex items-center justify-between px-2', theme.text.muted)}>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span>⭐ {moduleStars}/{moduleTotalStars}</span>
                        <span>•</span>
                        <span>{sortedLevels.length} ур.</span>
                      </div>

                      {moduleLocked && typeof module.requiredStars === 'number' && (
                        <div className="text-[11px] inline-flex items-center gap-1">
                          <Lock size={12} />
                          Нужно {module.requiredStars} ⭐
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {difficultySections.map((section) => {
          const uiDifficulty = mapDifficulty(section.difficulty);
          const levels = [...(section.levels ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          const sectionLocked = section.isUnlocked === false;

          return (
            <div key={`${section.difficulty}-${section.order ?? 0}`} className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className={cn(
                  'inline-flex items-center gap-2 px-3 py-1 rounded-full',
                  theme.difficultyBadge[uiDifficulty].bg
                )}>
                  <span className={cn('font-semibold text-sm', theme.difficultyBadge[uiDifficulty].text)}>
                    {section.name ?? (uiDifficulty === 'easy' ? 'Начинающий' : uiDifficulty === 'medium' ? 'Продолжающий' : 'Эксперт')}
                  </span>
                  {sectionLocked && <Lock size={14} className={theme.text.muted} />}
                </div>

                <div className={cn("text-xs", theme.text.muted)}>
                  <span className="mr-2">
                    ⭐ {section.earnedStars ?? 0}/{section.totalStars ?? levels.reduce((s, l) => s + (l.maxStars ?? 3), 0)}
                  </span>
                  {typeof section.requiredStars === 'number' && sectionLocked && (
                    <span>Нужно {section.requiredStars} ⭐</span>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {levels.map((lvl: CampaignOverviewLevel, index) => {
                  // Если API явно указал isUnlocked, используем это значение
                  // Иначе проверяем по earnedStars из overview
                  const unlocked = lvl.isUnlocked === true || 
                    (lvl.isUnlocked !== false && 
                     typeof overview?.earnedStars === 'number' && 
                     overview.earnedStars >= (lvl.requiredStars ?? 0));

                  const stars = lvl.earnedStars ?? getLevelProgress(lvl.slug)?.stars ?? 0;
                  const icon = lvl.icon ?? '📚';
                  const desc = lvl.description ?? 'Уровень кампании';

                  return (
                    <motion.div
                      key={lvl.slug}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="space-y-1"
                    >
                      <CategoryCard
                        emoji={icon}
                        name={lvl.name ?? lvl.slug}
                        description={desc}
                        stars={stars}
                        isLocked={!unlocked}
                        difficulty={uiDifficulty}
                        onClick={() => selectCategory(lvl.slug)}
                      />

                      {/* Плашки-детали (плюшки) */}
                      <div className={cn("flex items-center justify-between px-2", theme.text.muted)}>
                        <div className="flex items-center gap-2 text-[11px]">
                          {typeof lvl.timeLimitSeconds === 'number' && (
                            <span className="inline-flex items-center gap-1">
                              <Clock size={12} />
                              {formatTime(lvl.timeLimitSeconds)}
                            </span>
                          )}
                          {typeof lvl.wordCount === 'number' && (
                            <span className="inline-flex items-center gap-1">
                              <Hash size={12} />
                              {lvl.wordCount}
                            </span>
                          )}
                          {typeof lvl.bestTimeSeconds === 'number' && (
                            <span className="inline-flex items-center gap-1">
                              ⭐ {formatTime(lvl.bestTimeSeconds)}
                            </span>
                          )}
                        </div>

                        {!unlocked && typeof lvl.requiredStars === 'number' && (
                          <div className="text-[11px] inline-flex items-center gap-1">
                            <Lock size={12} />
                            Нужно {lvl.requiredStars} ⭐
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
};

export default LevelsScreen;
