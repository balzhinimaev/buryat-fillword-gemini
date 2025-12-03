// src/components/ui.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChevronLeft, Star, Lock } from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeConfig } from '../theme';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Кнопка "Назад"
export const BackButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
  >
    <ChevronLeft size={24} />
  </motion.button>
);

// Звёзды рейтинга
interface StarsDisplayProps {
  stars: number;
  max?: number;
  size?: number;
  theme?: ThemeConfig;
}

export const StarsDisplay: React.FC<StarsDisplayProps> = ({ 
  stars, 
  max = 3, 
  size = 16,
  theme: propTheme,
}) => {
  const { theme: contextTheme } = useTheme();
  const theme = propTheme || contextTheme;
  
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: i * 0.1, type: 'spring', stiffness: 200 }}
        >
          <Star
            size={size}
            className={cn(
              'transition-colors drop-shadow-sm',
              i < stars ? theme.stars.filled : theme.stars.empty
            )}
          />
        </motion.div>
      ))}
    </div>
  );
};

// Карточка категории
interface CategoryCardProps {
  emoji: string;
  name: string;
  description: string;
  stars: number;
  isLocked: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  onClick: () => void;
}

const difficultyColors = {
  easy: 'from-meadow-500 to-meadow-600',
  medium: 'from-amber-500 to-orange-500',
  hard: 'from-terra-500 to-red-600',
};

const difficultyLabels = {
  easy: 'Легко',
  medium: 'Средне',
  hard: 'Сложно',
};

export const CategoryCard: React.FC<CategoryCardProps> = ({
  emoji,
  name,
  description,
  stars,
  isLocked,
  difficulty,
  onClick,
}) => {
  const { theme, isDark } = useTheme();

  return (
    <motion.button
      whileHover={!isLocked ? { scale: 1.02, y: -2 } : {}}
      whileTap={!isLocked ? { scale: 0.98 } : {}}
      onClick={!isLocked ? onClick : undefined}
      disabled={isLocked}
      className={cn(
        'relative w-full p-4 rounded-2xl text-left transition-all overflow-hidden',
        'border-2 shadow-lg',
        isLocked
          ? cn(theme.categoryCard.bgLocked, theme.categoryCard.borderLocked, 'opacity-60 cursor-not-allowed')
          : cn(theme.categoryCard.bg, theme.categoryCard.border, theme.categoryCard.borderHover, 'hover:shadow-xl cursor-pointer')
      )}
    >
      {/* Gradient overlay for unlocked cards */}
      {!isLocked && (
        <div className={cn(
          'absolute top-0 right-0 w-24 h-24 rounded-bl-full',
          isDark ? 'opacity-20' : 'opacity-10',
          `bg-gradient-to-br ${difficultyColors[difficulty]}`
        )} />
      )}
      
      <div className="flex items-start gap-3 relative z-10">
        <div className={cn(
          'w-14 h-14 rounded-xl flex items-center justify-center text-2xl',
          isLocked ? theme.categoryCard.iconBgLocked : theme.categoryCard.iconBg
        )}>
          {isLocked ? <Lock size={24} className={theme.text.muted} /> : emoji}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className={cn(
              'font-bold truncate',
              isLocked ? theme.states.locked.text : theme.text.primary
            )}>
              {name}
            </h3>
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full font-medium',
              isLocked 
                ? cn(theme.states.locked.bg, theme.states.locked.text)
                : cn(theme.difficultyBadge[difficulty].bg, theme.difficultyBadge[difficulty].text)
            )}>
              {difficultyLabels[difficulty]}
            </span>
          </div>
          
          <p className={cn(
            'text-sm mb-2 truncate',
            isLocked ? theme.text.dimmed : theme.text.secondary
          )}>
            {description}
          </p>
          
          <StarsDisplay stars={stars} theme={theme} />
        </div>
      </div>
    </motion.button>
  );
};

// Прогресс-бар XP
interface XPBarProps {
  level: number;
  progress: number;
  xpToNext: number;
}

export const XPBar: React.FC<XPBarProps> = ({ level, progress, xpToNext }) => (
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-steppe-500 to-steppe-700 flex items-center justify-center text-white font-bold shadow-lg">
      {level}
    </div>
    <div className="flex-1">
      <div className="flex justify-between text-xs mb-1">
        <span className="font-medium text-stone-600">Уровень {level}</span>
        <span className="text-stone-400">{xpToNext} XP до след.</span>
      </div>
      <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-steppe-400 via-amber-500 to-steppe-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ type: 'spring', stiffness: 50 }}
        />
      </div>
    </div>
  </div>
);

// Статистическая карточка
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  color?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  icon, 
  label, 
  value, 
  subValue,
  color = 'bg-stone-100' 
}) => (
  <div className={cn('p-4 rounded-2xl', color)}>
    <div className="flex items-center gap-2 mb-2 text-stone-500">
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </div>
    <div className="text-2xl font-bold text-stone-800">{value}</div>
    {subValue && <div className="text-xs text-stone-400 mt-1">{subValue}</div>}
  </div>
);

// Кнопка меню
interface MenuButtonProps {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
}

export const MenuButton: React.FC<MenuButtonProps> = ({
  icon,
  label,
  sublabel,
  onClick,
  variant = 'secondary',
}) => {
  const variants = {
    primary: 'bg-gradient-to-r from-amber-500 to-terra-500 text-white shadow-lg hover:shadow-xl',
    secondary: 'bg-white text-stone-700 shadow-md hover:shadow-lg border border-stone-100',
    outline: 'bg-transparent text-stone-600 border-2 border-stone-200 hover:border-stone-300',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'w-full p-4 rounded-2xl flex items-center gap-4 transition-all',
        variants[variant]
      )}
    >
      <div className={cn(
        'w-12 h-12 rounded-xl flex items-center justify-center',
        variant === 'primary' ? 'bg-white/20' : 'bg-stone-100'
      )}>
        {icon}
      </div>
      <div className="text-left flex-1">
        <div className="font-bold text-lg">{label}</div>
        {sublabel && (
          <div className={cn(
            'text-sm',
            variant === 'primary' ? 'text-white/70' : 'text-stone-400'
          )}>
            {sublabel}
          </div>
        )}
      </div>
    </motion.button>
  );
};

// Переключатель настроек
interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label: string;
  description?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  enabled,
  onChange,
  label,
  description,
}) => (
  <button
    onClick={() => onChange(!enabled)}
    className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-stone-100"
  >
    <div className="text-left">
      <div className="font-medium text-stone-700">{label}</div>
      {description && (
        <div className="text-sm text-stone-400">{description}</div>
      )}
    </div>
    <div
      className={cn(
        'w-14 h-8 rounded-full p-1 transition-colors',
        enabled ? 'bg-amber-500' : 'bg-stone-200'
      )}
    >
      <motion.div
        className="w-6 h-6 bg-white rounded-full shadow"
        animate={{ x: enabled ? 24 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </div>
  </button>
);

// Modal Wrapper
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
      >
        {children}
      </motion.div>
    </motion.div>
  );
};
