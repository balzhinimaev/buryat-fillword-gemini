// src/screens/SupportScreen.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Heart,
  ArrowLeft,
  Copy,
  Check,
  Smartphone,
  CreditCard,
  Sparkles,
  Coffee,
  Star,
  Gift,
  MessageCircleHeart
} from 'lucide-react';
import { cn } from '../components/ui';
import { StickyHeader } from '../components/StickyHeader';
import { useTheme } from '../theme/ThemeContext';
import { useBackButton } from '../hooks/useTelegram';
import type { GameStore } from '../store/gameStore';

interface SupportScreenProps {
  store: GameStore;
}

export const SupportScreen: React.FC<SupportScreenProps> = ({ store }) => {
  const { goBack } = store;
  const { theme, isDark } = useTheme();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useBackButton(() => goBack());

  const PHONE = '+79025311366';

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const containerItem = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className={cn("min-h-[100dvh] flex flex-col", theme.backgrounds.primaryGradient)}>
      <StickyHeader title="Поддержать проект" onBack={() => goBack()} />

      {/* Header */}
      <header className="relative px-5 pt-4 pb-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => goBack()}
          className={cn(
            "p-2.5 rounded-xl mb-4 transition-colors",
            isDark ? "bg-white/10 hover:bg-white/20" : "bg-black/5 hover:bg-black/10"
          )}
        >
          <ArrowLeft size={22} className={theme.text.primary} />
        </motion.button>

        <div className="text-center mb-2">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
            className="inline-block mb-3"
          >
            <div className={cn(
              "w-20 h-20 rounded-2xl flex items-center justify-center mx-auto",
              isDark ? "bg-rose-500/20" : "bg-rose-100"
            )}>
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Heart size={40} className={isDark ? "text-rose-400 fill-rose-400/50" : "text-rose-500 fill-rose-500/50"} />
              </motion.div>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={cn("text-2xl font-bold mb-1", theme.text.primary)}
          >
            Поддержать проект
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className={cn("text-sm", theme.text.muted)}
          >
            Помогите развитию бурятского филлворда
          </motion.p>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-5 pb-8 space-y-4">
        {/* Описание */}
        <motion.div
          variants={containerItem}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.35 }}
          className={cn(
            "p-4 rounded-2xl border",
            isDark ? "bg-white/5 border-white/10" : "bg-white/80 border-stone-200/50"
          )}
        >
          <div className="flex items-start gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
              isDark ? "bg-amber-500/20" : "bg-amber-100"
            )}>
              <Sparkles size={20} className={isDark ? "text-amber-400" : "text-amber-600"} />
            </div>
            <div>
              <p className={cn("text-sm leading-relaxed", theme.text.secondary)}>
                Этот проект создан для сохранения и популяризации бурятского языка. 
                Ваша поддержка помогает развивать приложение, добавлять новые слова и улучшать игровой опыт.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Способы оплаты */}
        <motion.div
          variants={containerItem}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.4 }}
        >
          <h3 className={cn("text-sm font-semibold mb-3 ml-1", theme.text.muted)}>
            Реквизиты для перевода
          </h3>

          {/* Сбер */}
          <div className={cn(
            "p-4 rounded-2xl border mb-3",
            isDark ? "bg-white/5 border-white/10" : "bg-white/80 border-stone-200/50"
          )}>
            <div className="flex items-center gap-3 mb-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                "bg-green-500/20"
              )}>
                <CreditCard size={20} className="text-green-500" />
              </div>
              <div className="flex-1">
                <div className={cn("font-semibold", theme.text.primary)}>Сбербанк</div>
                <div className={cn("text-xs", theme.text.muted)}>По номеру телефона</div>
              </div>
            </div>
            <button
              onClick={() => handleCopy(PHONE, 'sber')}
              className={cn(
                "w-full flex items-center justify-between p-3 rounded-xl transition-all",
                isDark 
                  ? "bg-white/5 hover:bg-white/10 active:bg-white/15" 
                  : "bg-stone-100 hover:bg-stone-200 active:bg-stone-300"
              )}
            >
              <div className="flex items-center gap-2">
                <Smartphone size={16} className={theme.text.muted} />
                <span className={cn("font-mono text-base font-medium", theme.text.primary)}>
                  {PHONE}
                </span>
              </div>
              <motion.div
                key={copiedField === 'sber' ? 'check' : 'copy'}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={cn(
                  "p-1.5 rounded-lg",
                  copiedField === 'sber'
                    ? (isDark ? "bg-green-500/20" : "bg-green-100")
                    : (isDark ? "bg-white/10" : "bg-stone-200")
                )}
              >
                {copiedField === 'sber' ? (
                  <Check size={16} className="text-green-500" />
                ) : (
                  <Copy size={16} className={theme.text.muted} />
                )}
              </motion.div>
            </button>
          </div>

          {/* ЮMoney */}
          <div className={cn(
            "p-4 rounded-2xl border",
            isDark ? "bg-white/5 border-white/10" : "bg-white/80 border-stone-200/50"
          )}>
            <div className="flex items-center gap-3 mb-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                "bg-violet-500/20"
              )}>
                <CreditCard size={20} className="text-violet-500" />
              </div>
              <div className="flex-1">
                <div className={cn("font-semibold", theme.text.primary)}>ЮMoney (Юмани)</div>
                <div className={cn("text-xs", theme.text.muted)}>По номеру телефона</div>
              </div>
            </div>
            <button
              onClick={() => handleCopy(PHONE, 'yumoney')}
              className={cn(
                "w-full flex items-center justify-between p-3 rounded-xl transition-all",
                isDark 
                  ? "bg-white/5 hover:bg-white/10 active:bg-white/15" 
                  : "bg-stone-100 hover:bg-stone-200 active:bg-stone-300"
              )}
            >
              <div className="flex items-center gap-2">
                <Smartphone size={16} className={theme.text.muted} />
                <span className={cn("font-mono text-base font-medium", theme.text.primary)}>
                  {PHONE}
                </span>
              </div>
              <motion.div
                key={copiedField === 'yumoney' ? 'check' : 'copy'}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={cn(
                  "p-1.5 rounded-lg",
                  copiedField === 'yumoney'
                    ? (isDark ? "bg-green-500/20" : "bg-green-100")
                    : (isDark ? "bg-white/10" : "bg-stone-200")
                )}
              >
                {copiedField === 'yumoney' ? (
                  <Check size={16} className="text-green-500" />
                ) : (
                  <Copy size={16} className={theme.text.muted} />
                )}
              </motion.div>
            </button>
          </div>
        </motion.div>

        {/* На что пойдут средства */}
        <motion.div
          variants={containerItem}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.5 }}
        >
          <h3 className={cn("text-sm font-semibold mb-3 ml-1", theme.text.muted)}>
            На что пойдут средства
          </h3>

          <div className={cn(
            "p-4 rounded-2xl border space-y-3",
            isDark ? "bg-white/5 border-white/10" : "bg-white/80 border-stone-200/50"
          )}>
            {[
              { icon: Coffee, text: 'Поддержка сервера и хостинга', color: isDark ? 'text-amber-400' : 'text-amber-600', bg: isDark ? 'bg-amber-500/15' : 'bg-amber-100' },
              { icon: Star, text: 'Новые слова и уровни', color: isDark ? 'text-blue-400' : 'text-blue-600', bg: isDark ? 'bg-blue-500/15' : 'bg-blue-100' },
              { icon: Gift, text: 'Улучшение игрового процесса', color: isDark ? 'text-emerald-400' : 'text-emerald-600', bg: isDark ? 'bg-emerald-500/15' : 'bg-emerald-100' },
              { icon: MessageCircleHeart, text: 'Развитие бурятского словаря', color: isDark ? 'text-rose-400' : 'text-rose-600', bg: isDark ? 'bg-rose-500/15' : 'bg-rose-100' },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55 + index * 0.05 }}
                className="flex items-center gap-3"
              >
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", item.bg)}>
                  <item.icon size={16} className={item.color} />
                </div>
                <span className={cn("text-sm", theme.text.secondary)}>{item.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Благодарность */}
        <motion.div
          variants={containerItem}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.65 }}
          className={cn(
            "p-5 rounded-2xl text-center",
            isDark 
              ? "bg-gradient-to-br from-rose-500/10 via-pink-500/10 to-amber-500/10 border border-rose-500/20" 
              : "bg-gradient-to-br from-rose-50 via-pink-50 to-amber-50 border border-rose-200/50"
          )}
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="text-3xl mb-2"
          >
            🙏
          </motion.div>
          <p className={cn("text-sm font-medium", theme.text.primary)}>
            Благодарим за любую поддержку!
          </p>
          <p className={cn("text-xs mt-1", theme.text.muted)}>
            Каждый вклад помогает сохранить бурятский язык
          </p>
        </motion.div>
      </main>
    </div>
  );
};

export default SupportScreen;
