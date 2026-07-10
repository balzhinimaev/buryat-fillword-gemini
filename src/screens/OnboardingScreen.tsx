// Онбординг нового игрока: мастер из 4 шагов (имя → возраст → уровень → напоминания).
// Конфигурация шагов и логика формы — в ./onboarding/options.ts, шаги — в ./onboarding/steps.tsx.
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';
import { getMenuStyles } from '../theme/menuStyles';
import { cn } from '../components/ui';
import { useTelegram } from '../hooks/useTelegram';
import { useAuth } from '../store/authStore';
import { updateOnboarding } from '../services/api';
import type { GameStore } from '../store/gameStore';
import {
  STEPS,
  STEP_CONFIG,
  type OnboardingForm,
  isStepComplete,
  buildOnboardingRequest,
} from './onboarding/options';
import { NameStep, AgeStep, LevelStep, RemindersStep } from './onboarding/steps';

interface OnboardingScreenProps {
  store: GameStore;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ store }) => {
  const { themeId, isDark } = useTheme();
  const styles = getMenuStyles(themeId);
  const { hapticFeedback } = useTelegram();
  const { state: authState, setOnboardingCompleted } = useAuth();
  const { updateSettings } = store;

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [form, setForm] = useState<OnboardingForm>({
    name: authState.user?.name || '',
    ageRange: null,
    buriatLevel: null,
    reminderPlan: null,
    reminderTime: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = useCallback(<K extends keyof OnboardingForm>(field: K, value: OnboardingForm[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const currentStep = STEPS[currentStepIndex];
  const stepConfig = STEP_CONFIG[currentStep];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEPS.length - 1;
  const canContinue = isStepComplete(currentStep, form);

  const goNext = useCallback(() => {
    if (!isStepComplete(STEPS[currentStepIndex], form)) return;
    hapticFeedback('light');
    setCurrentStepIndex(prev => Math.min(prev + 1, STEPS.length - 1));
  }, [currentStepIndex, form, hapticFeedback]);

  const goPrev = useCallback(() => {
    hapticFeedback('light');
    setCurrentStepIndex(prev => Math.max(prev - 1, 0));
  }, [hapticFeedback]);

  // Завершение онбординга: сохраняем ответы на сервере и обновляем локальные сторы
  const handleComplete = useCallback(async () => {
    if (!isStepComplete(currentStep, form) || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    hapticFeedback('medium');

    try {
      const requestData = buildOnboardingRequest(form);

      await updateOnboarding(requestData);

      // Обновляем имя в настройках игры
      updateSettings({ playerName: requestData.name });

      // Обновляем состояние авторизации
      if (authState.user) {
        setOnboardingCompleted({
          ...authState.user,
          name: requestData.name,
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
      const apiError = err as { statusCode?: number; message?: string | string[] };
      const messageRaw = apiError?.message;
      const message = Array.isArray(messageRaw) ? messageRaw[0] : messageRaw;

      if (apiError?.statusCode === 401) {
        setError('Сессия истекла. Войдите снова и повторите.');
      } else if (typeof message === 'string' && message.trim()) {
        setError(message);
      } else {
        setError('Не удалось сохранить данные. Попробуйте ещё раз.');
      }

      hapticFeedback('error');
    } finally {
      setIsSubmitting(false);
    }
  }, [currentStep, form, isSubmitting, hapticFeedback, updateSettings, authState.user, setOnboardingCompleted, store]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 'name':
        return <NameStep name={form.name} onChange={(v) => setField('name', v)} />;
      case 'age':
        return <AgeStep value={form.ageRange} onChange={(v) => setField('ageRange', v)} />;
      case 'level':
        return <LevelStep value={form.buriatLevel} onChange={(v) => setField('buriatLevel', v)} />;
      case 'reminders':
        return (
          <RemindersStep
            plan={form.reminderPlan}
            time={form.reminderTime}
            onPlanChange={(v) => setField('reminderPlan', v)}
            onTimeChange={(v) => setField('reminderTime', v)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={cn("h-[100dvh] flex flex-col relative overflow-hidden", styles.pageGradient)}>
      {/* Декоративный фон */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={cn("absolute top-1/4 -left-32 w-64 h-64 rounded-full blur-3xl", styles.decorativeOrbs.primary)} />
        <div className={cn("absolute bottom-1/4 -right-32 w-80 h-80 rounded-full blur-3xl", styles.decorativeOrbs.secondary)} />
      </div>

      {/* Header с индикатором прогресса */}
      <header className="relative z-10 px-5 pb-3 flex-shrink-0" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)' }}>
        {/* Прогресс */}
        <div className="flex items-center gap-2 mb-4">
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
              "w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center",
              isDark ? "bg-gradient-to-br from-amber-500/20 to-orange-500/20" : "bg-gradient-to-br from-amber-100 to-orange-100"
            )}
          >
            <span className="text-3xl">{stepConfig.emoji}</span>
          </motion.div>

          <h2 className={cn("text-xl font-bold mb-1.5", styles.statsCard.text.primary)}>
            {stepConfig.title}
          </h2>
          <p className={cn("text-sm", styles.statsCard.text.secondary)}>
            {stepConfig.subtitle}
          </p>
        </motion.div>
      </header>

      {/* Контент */}
      <main className="flex-1 min-h-0 px-5 py-4 relative z-10 overflow-y-auto">
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
      <footer className="relative z-10 px-5 pt-3 flex-shrink-0" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}>
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
            disabled={!canContinue || isSubmitting}
            className={cn(
              "flex-1 h-14 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2",
              canContinue && !isSubmitting
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
