// Кликабельная карточка-вариант ответа онбординга (возраст/уровень/план напоминаний)
import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../theme/ThemeContext';
import { cn } from '../../components/ui';

interface OptionCardProps {
  selected: boolean;
  onSelect: () => void;
  /** Порядковый номер в списке — для каскадной анимации появления */
  index: number;
  /** Уменьшенные отступы (список планов напоминаний) */
  compact?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const OptionCard: React.FC<OptionCardProps> = ({
  selected,
  onSelect,
  index,
  compact = false,
  className,
  children,
}) => {
  const { isDark } = useTheme();

  return (
    <motion.button
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onSelect}
      className={cn(
        'w-full px-5 text-left border-2 transition-all duration-200',
        compact ? 'py-3 rounded-xl' : 'py-4 rounded-2xl',
        selected
          ? isDark
            ? 'bg-amber-500/20 border-amber-500'
            : 'bg-amber-50 border-amber-500'
          : isDark
            ? 'bg-stone-800/60 border-stone-700 hover:border-stone-600'
            : 'bg-white border-stone-200 hover:border-stone-300',
        className,
      )}
    >
      {children}
    </motion.button>
  );
};
