// src/screens/OnboardingScreen.tsx
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Calendar, 
  BookOpen, 
  Bell, 
  ChevronRight, 
  ChevronLeft,
  Check,
  Sun,
  Sunset,
  Moon,
  Sparkles
} from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';
import { getMenuStyles } from '../theme/menuStyles';
import { cn } from '../components/ui';
import { useTelegram } from '../hooks/useTelegram';
import { useAuth } from '../store/authStore';
import { 
  updateOnboarding, 
  type AgeRange, 
  type BuriatLevel, 
  type ReminderPlan, 
  type ReminderTime,
  type UpdateOnboardingRequest 
} from '../services/api';
import type { GameStore } from '../store/gameStore';

interface OnboardingScreenProps {
  store: GameStore;
}

type OnboardingStep = 'name' | 'age' | 'level' | 'reminders';

const STEPS: OnboardingStep[] = ['name', 'age', 'level', 'reminders'];

// Конфигурация шагов
const STEP_CONFIG = {
  name: {
    title: 'Как вас зовут?',
    subtitle: 'Это имя будет отображаться в игре',
    icon: User,
    emoji: '👋',
  },
  age: {
    title: 'Ваш возраст',
    subtitle: 'Поможет подобрать контент',
    icon: Calendar,
    emoji: '🎂',
  },
  level: {
    title: 'Ваш уровень бурятского',
    subtitle: 'Чтобы настроить сложность',
    icon: BookOpen,
    emoji: '📚',
  },
  reminders: {
    title: 'Напоминания',
    subtitle: 'Когда вам удобнее заниматься?',
    icon: Bell,
    emoji: '🔔',
  },
};

const AGE_OPTIONS: { value: AgeRange; label: string }[] = [
  { value: '18-24', label: '18-24 года' },
  { value: '25-34', label: '25-34 года' },
  { value: '35-44', label: '35-44 года' },
  { value: '45+', label: '45+ лет' },
  { value: 'prefer_not_to_say', label: 'Не указывать' },
];

const LEVEL_OPTIONS: { value: BuriatLevel; label: string; description: string; emoji: string }[] = [
  { value: 'beginner', label: 'Начинающий', description: 'Только начинаю изучать', emoji: '🌱' },
  { value: 'intermediate', label: 'Средний', description: 'Понимаю базовые фразы', emoji: '🌿' },
  { value: 'advanced', label: 'Продвинутый', description: 'Свободно общаюсь', emoji: '🌳' },
  { value: 'native', label: 'Носитель', description: 'Родной язык', emoji: '🏔️' },
  { value: 'skip', label: 'Пропустить', description: '', emoji: '⏭️' },
];

const REMINDER_PLAN_OPTIONS: { value: ReminderPlan; label: string; description: string; emoji: string }[] = [
  { value: 'daily-10', label: 'Ежедневно', description: '~10 минут в день', emoji: '📆' },
  { value: '3x-week-15', label: '3 раза в неделю', description: '~15 минут', emoji: '📅' },
  { value: 'weekend-20', label: 'По выходным', description: '~20 минут', emoji: '🗓️' },
  { value: 'off', label: 'Без напоминаний', description: '', emoji: '🔕' },
];

const REMINDER_TIME_OPTIONS: { value: ReminderTime; label: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
  { value: 'morning', label: 'Утро', icon: Sun },
  { value: 'day', label: 'День', icon: Sunset },
  { value: 'evening', label: 'Вечер', icon: Moon },
];

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ store }) => {
  const { themeId, isDark } = useTheme();
  const styles = getMenuStyles(themeId);
  const { hapticFeedback } = useTelegram();
  const { state: authState, setOnboardingCompleted } = useAuth();
  const { updateSettings } = store;

  // Состояние онбординга
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [name, setName] = useState(authState.user?.name || '');
  const [ageRange, setAgeRange] = useState<AgeRange | null>(null);
  const [buriatLevel, setBuriatLevel] = useState<BuriatLevel | null>(null);
  const [reminderPlan, setReminderPlan] = useState<ReminderPlan | null>(null);
  const [reminderTime, setReminderTime] = useState<ReminderTime | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentStep = STEPS[currentStepIndex];
  const stepConfig = STEP_CONFIG[currentStep];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEPS.length - 1;

  // Проверка можно ли продолжить
  const canContinue = useCallback(() => {
    switch (currentStep) {
      case 'name':
        return name.trim().length >= 2;
      case 'age':
        return ageRange !== null;
      case 'level':
        return buriatLevel !== null;
      case 'reminders':
        return reminderPlan !== null && (reminderPlan === 'off' || reminderTime !== null);
      default:
        return false;
    }
  }, [currentStep, name, ageRange, buriatLevel, reminderPlan, reminderTime]);

  // Переход к следующему шагу
  const goNext = useCallback(() => {
    if (!canContinue()) return;
    hapticFeedback('light');
    setCurrentStepIndex(prev => Math.min(prev + 1, STEPS.length - 1));
  }, [canContinue, hapticFeedback]);

  // Переход к предыдущему шагу
  const goPrev = useCallback(() => {
    hapticFeedback('light');
    setCurrentStepIndex(prev => Math.max(prev - 1, 0));
  }, [hapticFeedback]);

  // Завершение онбординга
  const handleComplete = useCallback(async () => {
    if (!canContinue() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    hapticFeedback('medium');

    try {
      const requestData: UpdateOnboardingRequest = {
        onboardingCompleted: true,
        onboardingStep: 'done',
        name: name.trim(),
      };

      if (ageRange && ageRange !== 'prefer_not_to_say') {
        requestData.ageRange = ageRange;
      }
      if (buriatLevel && buriatLevel !== 'skip') {
        requestData.buriatLevel = buriatLevel;
      }
      if (reminderPlan) {
        requestData.reminderPlan = reminderPlan;
      }
      if (reminderTime && reminderPlan !== 'off') {
        requestData.reminderTime = reminderTime;
      }

      await updateOnboarding(requestData);

      // Обновляем имя в настройках игры
      updateSettings({ playerName: name.trim() });

      // Обновляем состояние авторизации
      if (authState.user) {
        setOnboardingCompleted({
          ...authState.user,
          name: name.trim(),
          onboardingCompleted: true,
          onboardingStep: 'done',
          ageRange: requestData.ageRange,
          buriatLevel: requestData.buriatLevel,
          reminderPlan: requestData.reminderPlan,
          reminderTime: requestData.reminderTime,
        });
      }

      hapticFeedback('success');
      
      // Переход в меню
      store.navigate('menu');
    } catch (err) {
      console.error('Onboarding error:', err);
      setError('Не удалось сохранить данные. Попробуйте ещё раз.');
      hapticFeedback('error');
    } finally {
      setIsSubmitting(false);
    }
  }, [canContinue, isSubmitting, hapticFeedback, ageRange, buriatLevel, reminderPlan, reminderTime, name, updateSettings, authState.user, setOnboardingCompleted, store]);

  // Рендер шага "Имя"
  const renderNameStep = () => (
    <div className="space-y-6">
      <div className="relative">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Введите ваше имя"
          maxLength={30}
          className={cn(
            "w-full px-5 py-4 text-lg rounded-2xl border-2 transition-all duration-200",
            "focus:outline-none focus:ring-0",
            isDark 
              ? "bg-stone-800/60 border-stone-700 text-white placeholder-stone-500 focus:border-amber-500" 
              : "bg-white border-stone-200 text-stone-800 placeholder-stone-400 focus:border-amber-500"
          )}
          autoFocus
        />
        {name.length > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={cn(
              "absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center",
              name.trim().length >= 2 ? "bg-green-500" : "bg-stone-500"
            )}
          >
            <Check size={14} className="text-white" />
          </motion.div>
        )}
      </div>
      <p className={cn("text-sm text-center", styles.statsCard.text.secondary)}>
        Минимум 2 символа
      </p>
    </div>
  );

  // Рендер шага "Возраст"
  const renderAgeStep = () => (
    <div className="space-y-3">
      {AGE_OPTIONS.map((option, index) => (
        <motion.button
          key={option.value}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => {
            hapticFeedback('selection');
            setAgeRange(option.value);
          }}
          className={cn(
            "w-full px-5 py-4 rounded-2xl border-2 text-left transition-all duration-200",
            ageRange === option.value
              ? isDark 
                ? "bg-amber-500/20 border-amber-500 text-white" 
                : "bg-amber-50 border-amber-500 text-stone-800"
              : isDark
                ? "bg-stone-800/60 border-stone-700 text-stone-300 hover:border-stone-600"
                : "bg-white border-stone-200 text-stone-600 hover:border-stone-300"
          )}
        >
          <span className="font-medium">{option.label}</span>
        </motion.button>
      ))}
    </div>
  );

  // Рендер шага "Уровень"
  const renderLevelStep = () => (
    <div className="space-y-3">
      {LEVEL_OPTIONS.map((option, index) => (
        <motion.button
          key={option.value}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => {
            hapticFeedback('selection');
            setBuriatLevel(option.value);
          }}
          className={cn(
            "w-full px-5 py-4 rounded-2xl border-2 text-left transition-all duration-200",
            buriatLevel === option.value
              ? isDark 
                ? "bg-amber-500/20 border-amber-500" 
                : "bg-amber-50 border-amber-500"
              : isDark
                ? "bg-stone-800/60 border-stone-700 hover:border-stone-600"
                : "bg-white border-stone-200 hover:border-stone-300"
          )}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{option.emoji}</span>
            <div>
              <div className={cn("font-medium", isDark ? "text-white" : "text-stone-800")}>
                {option.label}
              </div>
              {option.description && (
                <div className={cn("text-sm", isDark ? "text-stone-400" : "text-stone-500")}>
                  {option.description}
                </div>
              )}
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );

  // Рендер шага "Напоминания"
  const renderRemindersStep = () => (
    <div className="space-y-6">
      {/* План напоминаний */}
      <div className="space-y-3">
        <h4 className={cn("text-sm font-medium mb-2", styles.statsCard.text.secondary)}>
          Как часто заниматься?
        </h4>
        {REMINDER_PLAN_OPTIONS.map((option, index) => (
          <motion.button
            key={option.value}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => {
              hapticFeedback('selection');
              setReminderPlan(option.value);
              if (option.value === 'off') {
                setReminderTime(null);
              }
            }}
            className={cn(
              "w-full px-5 py-3 rounded-xl border-2 text-left transition-all duration-200",
              reminderPlan === option.value
                ? isDark 
                  ? "bg-amber-500/20 border-amber-500" 
                  : "bg-amber-50 border-amber-500"
                : isDark
                  ? "bg-stone-800/60 border-stone-700 hover:border-stone-600"
                  : "bg-white border-stone-200 hover:border-stone-300"
            )}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{option.emoji}</span>
              <div className="flex-1">
                <div className={cn("font-medium", isDark ? "text-white" : "text-stone-800")}>
                  {option.label}
                </div>
                {option.description && (
                  <div className={cn("text-xs", isDark ? "text-stone-400" : "text-stone-500")}>
                    {option.description}
                  </div>
                )}
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Время напоминаний (если не "off") */}
      <AnimatePresence>
        {reminderPlan && reminderPlan !== 'off' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <h4 className={cn("text-sm font-medium", styles.statsCard.text.secondary)}>
              В какое время?
            </h4>
            <div className="grid grid-cols-3 gap-3">
              {REMINDER_TIME_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <motion.button
                    key={option.value}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      hapticFeedback('selection');
                      setReminderTime(option.value);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
                      reminderTime === option.value
                        ? isDark 
                          ? "bg-amber-500/20 border-amber-500" 
                          : "bg-amber-50 border-amber-500"
                        : isDark
                          ? "bg-stone-800/60 border-stone-700 hover:border-stone-600"
                          : "bg-white border-stone-200 hover:border-stone-300"
                    )}
                  >
                    <Icon 
                      size={24} 
                      className={cn(
                        reminderTime === option.value
                          ? "text-amber-500"
                          : isDark ? "text-stone-400" : "text-stone-500"
                      )} 
                    />
                    <span className={cn(
                      "text-sm font-medium",
                      isDark ? "text-white" : "text-stone-800"
                    )}>
                      {option.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // Рендер контента шага
  const renderStepContent = () => {
    switch (currentStep) {
      case 'name':
        return renderNameStep();
      case 'age':
        return renderAgeStep();
      case 'level':
        return renderLevelStep();
      case 'reminders':
        return renderRemindersStep();
      default:
        return null;
    }
  };

  return (
    <div className={cn("min-h-[100dvh] flex flex-col relative overflow-hidden", styles.pageGradient)}>
      {/* Декоративный фон */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={cn("absolute top-1/4 -left-32 w-64 h-64 rounded-full blur-3xl", styles.decorativeOrbs.primary)} />
        <div className={cn("absolute bottom-1/4 -right-32 w-80 h-80 rounded-full blur-3xl", styles.decorativeOrbs.secondary)} />
      </div>

      {/* Header с индикатором прогресса */}
      <header className="relative z-10 px-5 pt-8 pb-4">
        {/* Прогресс */}
        <div className="flex items-center gap-2 mb-6">
          {STEPS.map((step, index) => (
            <div
              key={step}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all duration-300",
                index <= currentStepIndex
                  ? "bg-gradient-to-r from-amber-500 to-orange-500"
                  : isDark ? "bg-stone-700" : "bg-stone-200"
              )}
            />
          ))}
        </div>

        {/* Заголовок шага */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className={cn(
              "w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center",
              isDark ? "bg-gradient-to-br from-amber-500/20 to-orange-500/20" : "bg-gradient-to-br from-amber-100 to-orange-100"
            )}
          >
            <span className="text-4xl">{stepConfig.emoji}</span>
          </motion.div>
          
          <h2 className={cn("text-2xl font-bold mb-2", styles.statsCard.text.primary)}>
            {stepConfig.title}
          </h2>
          <p className={cn("text-sm", styles.statsCard.text.secondary)}>
            {stepConfig.subtitle}
          </p>
        </motion.div>
      </header>

      {/* Контент */}
      <main className="flex-1 px-5 py-6 relative z-10 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>

        {/* Ошибка */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className={cn(
                "mt-4 p-4 rounded-xl text-center text-sm",
                isDark ? "bg-red-500/20 text-red-400" : "bg-red-50 text-red-600"
              )}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer с кнопками */}
      <footer className="relative z-10 px-5 pb-8 pt-4">
        <div className="flex gap-3">
          {/* Кнопка "Назад" */}
          {!isFirstStep && (
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              whileTap={{ scale: 0.95 }}
              onClick={goPrev}
              className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all",
                isDark 
                  ? "bg-stone-800/60 border-stone-700 text-stone-300" 
                  : "bg-white border-stone-200 text-stone-600"
              )}
            >
              <ChevronLeft size={24} />
            </motion.button>
          )}

          {/* Кнопка "Продолжить" / "Готово" */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={isLastStep ? handleComplete : goNext}
            disabled={!canContinue() || isSubmitting}
            className={cn(
              "flex-1 h-14 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2",
              canContinue() && !isSubmitting
                ? "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-lg shadow-amber-500/25"
                : isDark 
                  ? "bg-stone-800 text-stone-500 cursor-not-allowed" 
                  : "bg-stone-200 text-stone-400 cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Sparkles size={20} />
              </motion.div>
            ) : isLastStep ? (
              <>
                <span>Начать!</span>
                <Sparkles size={20} />
              </>
            ) : (
              <>
                <span>Продолжить</span>
                <ChevronRight size={20} />
              </>
            )}
          </motion.button>
        </div>

        {/* Пропустить (на шагах 2-4) */}
        {!isFirstStep && !isLastStep && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            onClick={goNext}
            className={cn(
              "w-full mt-4 py-2 text-sm transition-colors",
              isDark ? "text-stone-500 hover:text-stone-400" : "text-stone-400 hover:text-stone-500"
            )}
          >
            Пропустить
          </motion.button>
        )}
      </footer>
    </div>
  );
};

export default OnboardingScreen;

