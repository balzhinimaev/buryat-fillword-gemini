// src/screens/LevelPackScreen.tsx
import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Star, Lock, Check, Settings2, Plus } from 'lucide-react';
import { cn } from '../components/ui';
import { StickyHeader } from '../components/StickyHeader';
import { useTheme } from '../theme/ThemeContext';
import { getMenuStyles } from '../theme/menuStyles';
import { useBackButton } from '../hooks/useTelegram';
import { useAuth } from '../store/authStore';
import type { GameStore } from '../store/gameStore';
import { LEVEL_PACKS } from '../store/gameStore';
import { api, type AdminLevel, type LevelModeProgressResponse } from '../services/api';

interface LevelPackScreenProps {
  store: GameStore;
}

export const LevelPackScreen: React.FC<LevelPackScreenProps> = ({ store }) => {
  const { goBack, selectEndlessLevel, state, getPackProgress, navigateToLevelEditor } = store;
  const { themeId, isDark } = useTheme();
  const styles = getMenuStyles(themeId);
  const { state: authState } = useAuth();
  const isAdmin = authState.user?.role === 'admin';
  
  useBackButton(() => goBack());

  // Admin: загружаем список ручных уровней
  const [adminLevels, setAdminLevels] = useState<AdminLevel[]>([]);
  const [adminMode, setAdminMode] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    let isMounted = true;
    (async () => {
      try {
        const levels = await api.getAdminLevels();
        if (isMounted) setAdminLevels(levels);
      } catch {
        // ignore
      }
    })();
    return () => { isMounted = false; };
  }, [isAdmin]);

  // Set с номерами ручных уровней для быстрого lookup
  const adminLevelNumbers = useMemo(
    () => new Set(adminLevels.map((l) => l.levelNumber)),
    [adminLevels]
  );

  // Серверный прогресс уровневого режима
  const [serverProgress, setServerProgress] = useState<LevelModeProgressResponse | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await api.getLevelModeProgress();
        if (isMounted) setServerProgress(data);
      } catch {
        // fallback to local progress
      }
    })();
    return () => { isMounted = false; };
  }, []);

  // Map номер уровня → серверный прогресс для быстрого lookup
  const serverLevelMap = useMemo(() => {
    const map = new Map<number, { stars: number; bestTimeSeconds: number }>();
    if (serverProgress?.levels) {
      for (const lvl of serverProgress.levels) {
        map.set(lvl.levelNumber, { stars: lvl.stars, bestTimeSeconds: lvl.bestTimeSeconds });
      }
    }
    return map;
  }, [serverProgress]);

  // Получаем выбранный пакет
  const currentPack = useMemo(() => {
    return LEVEL_PACKS.find(p => p.id === state.selectedLevelPack) || LEVEL_PACKS[0];
  }, [state.selectedLevelPack]);

  // Прогресс пакета: предпочитаем серверный, fallback на локальный
  const packProgress = useMemo(() => {
    if (serverProgress) {
      // Считаем по серверным данным
      let completed = 0;
      let stars = 0;
      for (const lvl of serverProgress.levels) {
        if (lvl.levelNumber >= currentPack.levelStart && lvl.levelNumber <= currentPack.levelEnd) {
          if (lvl.stars >= 1) completed++;
          stars += lvl.stars;
        }
      }
      return {
        completed,
        total: currentPack.levelEnd - currentPack.levelStart + 1,
        stars,
      };
    }
    return getPackProgress(currentPack);
  }, [serverProgress, currentPack, getPackProgress]);

  // Генерируем уровни для пакета
  const levels = useMemo(() => {
    const result: Array<{
      level: number;
      stars: 0 | 1 | 2 | 3;
      completed: boolean;
      unlocked: boolean;
    }> = [];

    const maxUnlocked = serverProgress?.maxUnlockedLevel ?? null;

    for (let i = currentPack.levelStart; i <= currentPack.levelEnd; i++) {
      const serverLvl = serverLevelMap.get(i);
      
      // Используем серверные данные если есть, иначе fallback на локальные
      const stars = (serverLvl?.stars ?? state.endlessProgress.levelStars[i] ?? 0) as 0 | 1 | 2 | 3;
      const completed = stars >= 1;
      
      // Разблокировка: серверный maxUnlockedLevel или fallback на локальную логику
      const unlocked = maxUnlocked !== null
        ? i <= maxUnlocked
        : (i === currentPack.levelStart || 
           state.endlessProgress.completedLevels.includes(i - 1) ||
           completed);
      
      result.push({ level: i, stars, completed, unlocked });
    }

    return result;
  }, [currentPack, serverProgress, serverLevelMap, state.endlessProgress]);

  // Группируем уровни по 10 для красивого отображения
  const levelGroups = useMemo(() => {
    const groups: typeof levels[] = [];
    for (let i = 0; i < levels.length; i += 10) {
      groups.push(levels.slice(i, i + 10));
    }
    return groups;
  }, [levels]);

  return (
    <div className={cn("min-h-[100dvh] flex flex-col relative overflow-hidden", styles.pageGradient)}>
      {/* Sticky Header */}
      <StickyHeader 
        title={currentPack.name}
        onBack={() => goBack()}
        rightElement={
          <div className="flex items-center gap-1">
            <Star size={18} className={isDark ? "text-amber-400 fill-amber-400" : "text-amber-500 fill-amber-500"} />
            <span className={cn("font-bold", styles.statsCard.text.accent)}>{packProgress.stars}</span>
          </div>
        }
      />

      {/* Декоративный фон */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={cn(
          "absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-3xl opacity-30",
          `bg-gradient-to-b ${currentPack.gradient}`
        )} />
      </div>

      {/* Header */}
      <header className="relative z-10 px-5 pt-16 pb-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => goBack()}
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
          className="text-center pt-6"
        >
          {/* Иконка пакета */}
          <div className={cn(
            "w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center text-4xl shadow-lg",
            `bg-gradient-to-br ${currentPack.gradient}`
          )}>
            {currentPack.emoji}
          </div>
          
          <h1 className={cn("text-2xl font-bold mb-1", styles.buttons.text.primary)}>
            {currentPack.name}
          </h1>
          <p className={cn("text-sm mb-3", styles.buttons.text.muted)}>
            {currentPack.description}
          </p>

          {/* Прогресс бар */}
          <div className="max-w-xs mx-auto">
            <div className="flex justify-between text-xs mb-1">
              <span className={styles.buttons.text.muted}>Прогресс</span>
              <span className={styles.buttons.text.primary}>
                {packProgress.completed}/{packProgress.total}
              </span>
            </div>
            <div className={cn(
              "h-2.5 rounded-full overflow-hidden",
              isDark ? "bg-white/10" : "bg-black/5"
            )}>
              <motion.div 
                className={cn("h-full rounded-full", `bg-gradient-to-r ${currentPack.gradient}`)}
                initial={{ width: 0 }}
                animate={{ width: `${(packProgress.completed / packProgress.total) * 100}%` }}
                transition={{ type: 'spring', stiffness: 50 }}
              />
            </div>
          </div>
        </motion.div>
      </header>

      {/* Admin Banner */}
      {isAdmin && (
        <div className="relative z-10 px-5 pb-2">
          <div className={cn(
            "flex items-center justify-between p-3 rounded-xl border",
            isDark
              ? "bg-violet-500/10 border-violet-500/20"
              : "bg-violet-50 border-violet-200"
          )}>
            <div className="flex items-center gap-2">
              <Settings2 size={16} className={isDark ? "text-violet-400" : "text-violet-600"} />
              <span className={cn("text-xs font-medium", isDark ? "text-violet-300" : "text-violet-700")}>
                Режим админа
              </span>
              {adminLevelNumbers.size > 0 && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                  isDark ? "bg-violet-500/20 text-violet-300" : "bg-violet-200 text-violet-700"
                )}>
                  {adminLevelNumbers.size} ручных
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAdminMode(!adminMode)}
                className={cn(
                  "text-[10px] px-2 py-1 rounded-lg font-medium transition-colors",
                  adminMode
                    ? isDark ? "bg-violet-500 text-white" : "bg-violet-500 text-white"
                    : isDark ? "bg-white/10 text-white/50" : "bg-stone-200 text-stone-600"
                )}
              >
                {adminMode ? "Редактирование" : "Просмотр"}
              </button>
              <button
                onClick={() => navigateToLevelEditor(null)}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  isDark ? "bg-violet-500/20 hover:bg-violet-500/30" : "bg-violet-100 hover:bg-violet-200"
                )}
              >
                <Plus size={14} className={isDark ? "text-violet-400" : "text-violet-600"} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Levels grid */}
      <main className="flex-1 px-5 pb-6 relative z-10 overflow-auto">
        {levelGroups.map((group, groupIndex) => (
          <motion.div
            key={groupIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIndex * 0.1 }}
            className="mb-6"
          >
            {/* Заголовок группы */}
            <div className={cn(
              "text-xs font-medium mb-3 px-1",
              styles.buttons.text.muted
            )}>
              Уровни {group[0].level}—{group[group.length - 1].level}
            </div>

            {/* Сетка уровней 5x2 */}
            <div className="grid grid-cols-5 gap-2">
              {group.map((levelData, index) => {
                const { level, stars, completed, unlocked } = levelData;
                
                return (
                  <motion.button
                    key={level}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: groupIndex * 0.1 + index * 0.02 }}
                    whileHover={unlocked ? { scale: 1.1 } : {}}
                    whileTap={unlocked ? { scale: 0.95 } : {}}
                    onClick={() => {
                      if (adminMode && isAdmin) {
                        navigateToLevelEditor(level);
                      } else if (unlocked) {
                        selectEndlessLevel(level);
                      }
                    }}
                    disabled={!unlocked && !adminMode}
                    className={cn(
                      "relative aspect-square rounded-xl flex flex-col items-center justify-center transition-all",
                      // В режиме админа — подсветка ручных уровней
                      adminMode && isAdmin && adminLevelNumbers.has(level)
                        ? isDark
                          ? "bg-violet-500/20 border-2 border-violet-500/40 shadow-lg shadow-violet-500/10"
                          : "bg-violet-50 border-2 border-violet-300 shadow-lg shadow-violet-200/50"
                        : adminMode && isAdmin
                          ? isDark
                            ? "bg-white/5 border border-dashed border-white/20"
                            : "bg-stone-50 border border-dashed border-stone-300"
                          : unlocked
                            ? completed
                              ? `bg-gradient-to-br ${currentPack.gradient} shadow-lg`
                              : cn(styles.buttons.card.background, styles.buttons.card.border, "border")
                            : cn(
                                isDark ? "bg-stone-800/30" : "bg-stone-100",
                                "opacity-50"
                              )
                    )}
                  >
                    {/* Admin mode: wrench badge */}
                    {adminMode && isAdmin && adminLevelNumbers.has(level) && (
                      <div className={cn(
                        "absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full flex items-center justify-center",
                        "bg-violet-500 shadow"
                      )}>
                        <Settings2 size={8} className="text-white" />
                      </div>
                    )}

                    {unlocked || (adminMode && isAdmin) ? (
                      <>
                        {/* Номер уровня */}
                        <span className={cn(
                          "font-bold text-lg",
                          adminMode && isAdmin
                            ? isDark ? "text-violet-300" : "text-violet-700"
                            : completed ? "text-white" : styles.buttons.text.primary
                        )}>
                          {level}
                        </span>
                        
                        {/* Звёзды (не показываем в режиме админа) */}
                        {!adminMode && (
                          <div className="flex gap-0.5 mt-0.5">
                            {[1, 2, 3].map((s) => (
                              <Star
                                key={s}
                                size={10}
                                className={cn(
                                  stars >= s
                                    ? completed 
                                      ? "text-white fill-white"
                                      : "text-amber-400 fill-amber-400"
                                    : completed
                                      ? "text-white/30"
                                      : isDark ? "text-stone-600" : "text-stone-300"
                                )}
                              />
                            ))}
                          </div>
                        )}

                        {/* Admin mode: тип уровня */}
                        {adminMode && isAdmin && (
                          <span className={cn(
                            "text-[8px] mt-0.5 font-medium",
                            adminLevelNumbers.has(level)
                              ? isDark ? "text-violet-400" : "text-violet-600"
                              : isDark ? "text-white/20" : "text-stone-400"
                          )}>
                            {adminLevelNumbers.has(level) ? "ручной" : "авто"}
                          </span>
                        )}

                        {/* Иконка завершения (только не в admin mode) */}
                        {!adminMode && completed && stars === 3 && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow">
                            <Check size={10} className="text-emerald-500" />
                          </div>
                        )}
                      </>
                    ) : (
                      <Lock size={18} className={isDark ? "text-stone-600" : "text-stone-400"} />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ))}

        {/* Подсказка */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className={cn(
            "text-center py-4 px-6 rounded-2xl mt-4",
            isDark ? "bg-white/5" : "bg-black/5"
          )}
        >
          <p className={cn("text-sm", styles.buttons.text.muted)}>
            ⭐ Собери 3 звезды на каждом уровне для максимального результата
          </p>
        </motion.div>
      </main>
    </div>
  );
};

export default LevelPackScreen;

