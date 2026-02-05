// src/screens/GameModeSelectScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  BookOpen, 
  Infinity as InfinityIcon, 
  Star, 
  Lock,
  ChevronRight,
  GraduationCap,
  Zap,
  Trophy,
  Crown,
  Medal
} from 'lucide-react';
import { cn } from '../components/ui';
import { StickyHeader } from '../components/StickyHeader';
import { useTheme } from '../theme/ThemeContext';
import { getMenuStyles } from '../theme/menuStyles';
import { useBackButton } from '../hooks/useTelegram';
import type { GameStore } from '../store/gameStore';
import { LEVEL_PACKS } from '../store/gameStore';
import { api, type CampaignOverviewResponse } from '../services/api';

interface GameModeSelectScreenProps {
  store: GameStore;
}

export const GameModeSelectScreen: React.FC<GameModeSelectScreenProps> = ({ store }) => {
  const { navigate, selectLevelPack, isPackUnlocked, getPackProgress, state } = store;
  const { themeId, isDark } = useTheme();
  const styles = getMenuStyles(themeId);
  
  useBackButton(() => navigate('menu'));

  const totalCompletedLevels = state.endlessProgress.completedLevels.length;

  const [campaignOverview, setCampaignOverview] = useState<CampaignOverviewResponse | null>(null);
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await api.getCampaignOverview();
        if (isMounted) setCampaignOverview(data);
      } catch {
        if (isMounted) setCampaignOverview(null);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const campaignStarsText = useMemo(() => {
    const earned = campaignOverview?.earnedStars ?? state.stats.totalStars;
    const total = campaignOverview?.totalStars ?? 36;
    return `${earned}/${total}`;
  }, [campaignOverview, state.stats.totalStars]);

  const campaignProgressPercent = useMemo(() => {
    if (typeof campaignOverview?.progressPercent === 'number') return campaignOverview.progressPercent;
    if (typeof campaignOverview?.totalStars === 'number' && campaignOverview.totalStars > 0) {
      return ((campaignOverview.earnedStars ?? 0) / campaignOverview.totalStars) * 100;
    }
    return Math.min(100, (state.stats.totalStars / 36) * 100);
  }, [campaignOverview, state.stats.totalStars]);

  return (
    <div className={cn("min-h-[100dvh] flex flex-col relative overflow-hidden", styles.pageGradient)}>
      {/* Sticky Header */}
      <StickyHeader 
        title="Выбор режима" 
        onBack={() => navigate('menu')}
        rightElement={<Zap size={22} className={isDark ? "text-amber-400" : "text-amber-500"} />}
      />

      {/* Декоративный фон */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={cn("absolute top-1/4 -left-32 w-64 h-64 rounded-full blur-3xl", styles.decorativeOrbs.primary)} />
        <div className={cn("absolute bottom-1/3 -right-32 w-80 h-80 rounded-full blur-3xl", styles.decorativeOrbs.secondary)} />
        
        {/* Сетка */}
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{
            backgroundImage: `
              linear-gradient(to right, ${styles.gridPattern} 1px, transparent 1px),
              linear-gradient(to bottom, ${styles.gridPattern} 1px, transparent 1px)
            `,
            backgroundSize: '28px 28px'
          }} 
        />
      </div>

      {/* Header */}
      <header className="relative z-10 px-5 pt-16 pb-6">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('menu')}
          className={cn(
            "absolute top-4 left-4 p-2 rounded-xl transition-colors",
            isDark ? "bg-white/10 hover:bg-white/20" : "bg-black/5 hover:bg-black/10"
          )}
        >
          <ArrowLeft size={24} className={styles.buttons.text.primary} />
        </motion.button>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center pt-8"
        >
          <h1 className={cn("text-2xl font-bold mb-2", styles.buttons.text.primary)}>
            Выбери режим игры
          </h1>
          <p className={cn("text-sm", styles.buttons.text.muted)}>
            Изучай бурятский язык в своём темпе
          </p>
        </motion.div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-5 pb-6 relative z-10 space-y-6">
        
        {/* Режим Кампания */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('levels')}
            className="relative w-full p-5 rounded-2xl overflow-hidden group text-left"
          >
            {/* Фон градиент */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 transition-all duration-300" />
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
            
            {/* Декоративные элементы */}
            <GraduationCap className="absolute top-3 right-3 text-white/20" size={32} />
            
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
                <BookOpen size={32} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-bold text-xl text-white">Кампания</h2>
                  <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs text-white/90">
                    Обучение
                  </span>
                </div>
                <p className="text-sm text-white/80 mb-2">
                  Изучай слова по категориям: животные, еда, числа и другие темы
                </p>
                <div className="flex items-center justify-between gap-3 text-xs text-white/70">
                  <div className="flex items-center gap-2">
                    <Star size={14} className="fill-current" />
                    <span>{campaignStarsText} ⭐</span>
                  </div>
                  <span className="text-white/60">
                    {campaignProgressPercent.toFixed(2)}%
                  </span>
                </div>
              </div>
              <ChevronRight size={24} className="text-white/60" />
            </div>
          </motion.button>
        </motion.div>

        {/* Разделитель */}
        <div className="flex items-center gap-4 px-2">
          <div className={cn("flex-1 h-px", isDark ? "bg-white/10" : "bg-black/10")} />
          <span className={cn("text-sm font-medium", styles.buttons.text.muted)}>или</span>
          <div className={cn("flex-1 h-px", isDark ? "bg-white/10" : "bg-black/10")} />
        </div>

        {/* Режим Уровни */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                isDark ? "bg-violet-500/20" : "bg-violet-100"
              )}>
                <InfinityIcon size={20} className={isDark ? "text-violet-400" : "text-violet-600"} />
              </div>
              <div>
                <h2 className={cn("font-bold text-lg", styles.buttons.text.primary)}>
                  Уровневый режим
                </h2>
                <p className={cn("text-xs", styles.buttons.text.muted)}>
                  Пройди все уровни и стань легендой
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className={cn("text-xs", styles.buttons.text.muted)}>Пройдено</div>
              <div className={cn("font-bold", styles.statsCard.text.accent)}>
                {totalCompletedLevels}/200
              </div>
            </div>
          </div>

          {/* Пакеты уровней */}
          <div className="space-y-3">
            {LEVEL_PACKS.map((pack, index) => {
              const unlocked = isPackUnlocked(pack);
              const progress = getPackProgress(pack);
              const progressPercent = (progress.completed / progress.total) * 100;
              
              return (
                <motion.button
                  key={pack.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  whileHover={unlocked ? { scale: 1.02, y: -2 } : {}}
                  whileTap={unlocked ? { scale: 0.98 } : {}}
                  onClick={() => unlocked && selectLevelPack(pack.id)}
                  disabled={!unlocked}
                  className={cn(
                    "relative w-full p-4 rounded-2xl border transition-all text-left overflow-hidden",
                    unlocked 
                      ? cn(styles.buttons.card.background, styles.buttons.card.border, styles.buttons.card.borderHover)
                      : cn(
                          isDark ? "bg-stone-800/30" : "bg-stone-100/50",
                          "border-dashed",
                          isDark ? "border-stone-700/30" : "border-stone-300/50"
                        )
                  )}
                >
                  {/* Прогресс бар фон */}
                  {unlocked && progressPercent > 0 && (
                    <div 
                      className={cn(
                        "absolute left-0 top-0 bottom-0 opacity-10",
                        `bg-gradient-to-r ${pack.gradient}`
                      )}
                      style={{ width: `${progressPercent}%` }}
                    />
                  )}
                  
                  <div className="relative z-10 flex items-center gap-4">
                    {/* Иконка */}
                    <div className={cn(
                      "w-14 h-14 rounded-xl flex items-center justify-center text-2xl",
                      unlocked 
                        ? `bg-gradient-to-br ${pack.gradient} shadow-lg`
                        : isDark ? "bg-stone-700/50" : "bg-stone-200"
                    )}>
                      {unlocked ? (
                        <span>{pack.emoji}</span>
                      ) : (
                        <Lock size={24} className={isDark ? "text-stone-500" : "text-stone-400"} />
                      )}
                    </div>
                    
                    {/* Инфо */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={cn(
                          "font-bold",
                          unlocked ? styles.buttons.text.primary : styles.buttons.text.muted
                        )}>
                          {pack.name}
                        </h3>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          unlocked
                            ? isDark ? "bg-white/10 text-white/70" : "bg-black/5 text-stone-600"
                            : isDark ? "bg-stone-700/50 text-stone-500" : "bg-stone-200 text-stone-400"
                        )}>
                          {pack.levelStart}-{pack.levelEnd}
                        </span>
                      </div>
                      <p className={cn(
                        "text-sm truncate",
                        unlocked ? styles.buttons.text.muted : (isDark ? "text-stone-600" : "text-stone-400")
                      )}>
                        {unlocked ? pack.description : `Нужно пройти ${pack.unlockRequirement} уровней`}
                      </p>
                      
                      {/* Прогресс */}
                      {unlocked && (
                        <div className="flex items-center gap-2 mt-2">
                          <div className={cn(
                            "flex-1 h-1.5 rounded-full overflow-hidden",
                            isDark ? "bg-white/10" : "bg-black/5"
                          )}>
                            <div 
                              className={cn("h-full rounded-full", `bg-gradient-to-r ${pack.gradient}`)}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <span className={cn("text-xs font-medium", styles.buttons.text.muted)}>
                            {progress.completed}/{progress.total}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Звёзды или стрелка */}
                    <div className="flex flex-col items-end gap-1">
                      {unlocked ? (
                        <>
                          <div className="flex items-center gap-1">
                            <Star size={14} className={isDark ? "text-amber-400 fill-amber-400" : "text-amber-500 fill-amber-500"} />
                            <span className={cn("text-sm font-bold", styles.statsCard.text.accent)}>
                              {progress.stars}
                            </span>
                          </div>
                          <ChevronRight size={20} className={styles.buttons.text.muted} />
                        </>
                      ) : (
                        <Lock size={18} className={isDark ? "text-stone-600" : "text-stone-400"} />
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Баннер рейтинга */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('leaderboard')}
            className={cn(
              "relative w-full p-4 rounded-2xl overflow-hidden text-left",
              isDark
                ? "bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/20"
                : "bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200/60"
            )}
          >
            {/* Shimmer */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 }}
            />

            <div className="relative z-10 flex items-center gap-3.5">
              {/* Trophy icon */}
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                isDark
                  ? "bg-gradient-to-br from-amber-500/25 to-orange-500/25"
                  : "bg-gradient-to-br from-amber-100 to-orange-100"
              )}>
                <Trophy size={24} className={isDark ? "text-amber-400" : "text-amber-600"} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("font-bold text-[15px]", styles.buttons.text.primary)}>
                    Рейтинг игроков
                  </span>
                  <div className="flex items-center gap-0.5">
                    <Crown size={12} className={isDark ? "text-amber-400" : "text-amber-500"} />
                    <Medal size={12} className={isDark ? "text-stone-400" : "text-stone-500"} />
                  </div>
                </div>
                <p className={cn("text-xs mt-0.5", styles.buttons.text.muted)}>
                  Играй, набирай очки и соревнуйся!
                </p>
              </div>

              <ChevronRight size={20} className={isDark ? "text-amber-400/60" : "text-amber-500/60"} />
            </div>
          </motion.button>
        </motion.div>
      </main>
    </div>
  );
};

export default GameModeSelectScreen;

