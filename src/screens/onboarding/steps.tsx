// Шаги онбординга: имя → возраст → уровень бурятского → напоминания
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';
import { getMenuStyles } from '../../theme/menuStyles';
import { cn } from '../../components/ui';
import { useTelegram } from '../../hooks/useTelegram';
import type { AgeRange, BuriatLevel, ReminderPlan, ReminderTime } from '../../services/api';
import { OptionCard } from './OptionCard';
import { AGE_OPTIONS, LEVEL_OPTIONS, REMINDER_PLAN_OPTIONS, REMINDER_TIME_OPTIONS } from './options';

export const NameStep: React.FC<{ name: string; onChange: (name: string) => void }> = ({ name, onChange }) => {
  const { themeId, isDark } = useTheme();
  const styles = getMenuStyles(themeId);

  return (
    <div className="space-y-6">
      <div className="relative">
        <input
          type="text"
          value={name}
          onChange={(e) => onChange(e.target.value)}
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
};

export const AgeStep: React.FC<{ value: AgeRange | null; onChange: (value: AgeRange) => void }> = ({ value, onChange }) => {
  const { isDark } = useTheme();
  const { hapticFeedback } = useTelegram();

  return (
    <div className="space-y-3">
      {AGE_OPTIONS.map((option, index) => (
        <OptionCard
          key={option.value}
          index={index}
          selected={value === option.value}
          onSelect={() => {
            hapticFeedback('selection');
            onChange(option.value);
          }}
          className={
            value === option.value
              ? isDark ? "text-white" : "text-stone-800"
              : isDark ? "text-stone-300" : "text-stone-600"
          }
        >
          <span className="font-medium">{option.label}</span>
        </OptionCard>
      ))}
    </div>
  );
};

export const LevelStep: React.FC<{ value: BuriatLevel | null; onChange: (value: BuriatLevel) => void }> = ({ value, onChange }) => {
  const { isDark } = useTheme();
  const { hapticFeedback } = useTelegram();

  return (
    <div className="space-y-3">
      {LEVEL_OPTIONS.map((option, index) => (
        <OptionCard
          key={option.value}
          index={index}
          selected={value === option.value}
          onSelect={() => {
            hapticFeedback('selection');
            onChange(option.value);
          }}
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
        </OptionCard>
      ))}
    </div>
  );
};

export const RemindersStep: React.FC<{
  plan: ReminderPlan | null;
  time: ReminderTime | null;
  onPlanChange: (plan: ReminderPlan) => void;
  onTimeChange: (time: ReminderTime | null) => void;
}> = ({ plan, time, onPlanChange, onTimeChange }) => {
  const { themeId, isDark } = useTheme();
  const styles = getMenuStyles(themeId);
  const { hapticFeedback } = useTelegram();

  return (
    <div className="space-y-6">
      {/* План напоминаний */}
      <div className="space-y-3">
        <h4 className={cn("text-sm font-medium mb-2", styles.statsCard.text.secondary)}>
          Как часто заниматься?
        </h4>
        {REMINDER_PLAN_OPTIONS.map((option, index) => (
          <OptionCard
            key={option.value}
            index={index}
            compact
            selected={plan === option.value}
            onSelect={() => {
              hapticFeedback('selection');
              onPlanChange(option.value);
              if (option.value === 'off') {
                onTimeChange(null);
              }
            }}
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
          </OptionCard>
        ))}
      </div>

      {/* Время напоминаний (если не "off") */}
      <AnimatePresence>
        {plan && plan !== 'off' && (
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
                      onTimeChange(option.value);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
                      time === option.value
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
                        time === option.value
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
};
