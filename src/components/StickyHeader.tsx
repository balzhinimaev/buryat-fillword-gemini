// src/components/StickyHeader.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { cn } from './ui';
import { useTheme } from '../theme/ThemeContext';

interface StickyHeaderProps {
  title: string;
  onBack: () => void;
  rightElement?: React.ReactNode;
  className?: string;
}

/**
 * Sticky header that appears when scrolling up
 * Similar to native iOS/Android behavior
 */
export const StickyHeader: React.FC<StickyHeaderProps> = ({
  title,
  onBack,
  rightElement,
  className,
}) => {
  const { theme, isDark, themeId } = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const lastScrollY = useRef(0);
  const scrollThreshold = 80; // Минимальный скролл перед показом sticky header
  const scrollUpThreshold = 8; // Минимальный скролл вверх для появления

  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    const scrollDiff = lastScrollY.current - currentScrollY;
    
    // Проверяем, прокрутили ли мы достаточно далеко
    if (currentScrollY > scrollThreshold) {
      setHasScrolled(true);
      
      // Скролл вверх - показываем header
      if (scrollDiff > scrollUpThreshold) {
        setIsVisible(true);
      }
      // Скролл вниз - скрываем header
      else if (scrollDiff < -scrollUpThreshold) {
        setIsVisible(false);
      }
    } else {
      // Вернулись к началу - скрываем sticky header
      setIsVisible(false);
      setHasScrolled(false);
    }
    
    lastScrollY.current = currentScrollY;
  }, [scrollThreshold, scrollUpThreshold]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  // Определяем фон в зависимости от темы
  const getBackgroundStyle = () => {
    if (themeId === 'light') {
      return 'bg-gradient-to-b from-white/98 via-white/95 to-white/90 border-b border-stone-200/50';
    }
    if (themeId === 'dark') {
      return 'bg-gradient-to-b from-slate-900/98 via-slate-900/95 to-slate-900/90 border-b border-slate-700/50';
    }
    // steppe (default)
    return 'bg-gradient-to-b from-stone-900/98 via-stone-900/95 to-stone-900/90 border-b border-stone-700/50';
  };

  return (
    <AnimatePresence>
      {isVisible && hasScrolled && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ 
            type: 'spring', 
            stiffness: 300, 
            damping: 30,
            mass: 0.8
          }}
          className={cn(
            "fixed top-0 left-0 right-0 z-50",
            className
          )}
        >
          <div 
            className={cn(
              "flex items-center gap-3 px-4 py-3",
              "backdrop-blur-xl",
              "shadow-lg",
              isDark ? "shadow-black/20" : "shadow-black/5",
              getBackgroundStyle()
            )}
            style={{
              // Safe area для устройств с вырезом
              paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
            }}
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onBack}
              className={cn(
                "p-2 rounded-xl transition-colors",
                isDark 
                  ? "bg-white/10 hover:bg-white/20" 
                  : "bg-black/5 hover:bg-black/10"
              )}
            >
              <ArrowLeft size={22} className={theme.text.primary} />
            </motion.button>
            
            <h2 className={cn("flex-1 text-lg font-semibold truncate", theme.text.primary)}>
              {title}
            </h2>
            
            {rightElement}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StickyHeader;

