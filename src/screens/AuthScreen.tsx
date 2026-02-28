import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../store/authStore';
import { useTelegram } from '../hooks/useTelegram';
import { useTheme } from '../theme/ThemeContext';
import { cn } from '../components/ui';

type AuthStep = 'email' | 'otp';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthScreen() {
  const { state, login, requestEmailOtp, verifyEmailOtp, clearError } = useAuth();
  const { isTelegram, initData } = useTelegram();
  const { theme, isDark } = useTheme();

  const [step, setStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [expiresAtMs, setExpiresAtMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [debugCode, setDebugCode] = useState<string | null>(null);

  const emailValid = useMemo(() => EMAIL_RE.test(email.trim()), [email]);

  useEffect(() => {
    if (!expiresAtMs) return;

    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(id);
  }, [expiresAtMs]);

  const secondsLeft = useMemo(() => {
    if (!expiresAtMs) return 0;
    return Math.max(0, Math.floor((expiresAtMs - nowMs) / 1000));
  }, [expiresAtMs, nowMs]);

  const canResend = secondsLeft === 0;

  const onRequestOtp = async () => {
    if (!emailValid) return;
    clearError();

    try {
      const response = await requestEmailOtp(email.trim());
      setStep('otp');
      setOtp('');
      setNowMs(Date.now());
      setExpiresAtMs(Date.now() + response.expiresInSeconds * 1000);
      setDebugCode(response.debugCode ?? null);
    } catch {
      // error already handled in auth store
    }
  };

  const onVerifyOtp = async () => {
    if (otp.trim().length !== 6) return;
    clearError();

    try {
      await verifyEmailOtp(email.trim(), otp.trim());
    } catch {
      // error already handled in auth store
    }
  };

  const onTelegramLogin = async () => {
    clearError();
    await login();
  };

  return (
    <div className={cn('min-h-[100dvh] flex flex-col px-5 py-8', theme.backgrounds.primaryGradient)}>
      <div className="flex-1 flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn('rounded-3xl border p-5', theme.backgrounds.card, theme.borders.subtle)}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', isDark ? 'bg-cyan-500/20' : 'bg-cyan-100')}>
              {step === 'email' ? <Mail size={20} className="text-cyan-500" /> : <KeyRound size={20} className="text-cyan-500" />}
            </div>
            <div>
              <h1 className={cn('text-lg font-semibold', theme.text.primary)}>
                {step === 'email' ? 'Вход по email' : 'Введите код из письма'}
              </h1>
              <p className={cn('text-xs', theme.text.muted)}>
                {step === 'email'
                  ? 'Без Telegram Mini App — через одноразовый код'
                  : `Код отправлен на ${email || 'ваш email'}`}
              </p>
            </div>
          </div>

          {step === 'email' ? (
            <div className="space-y-3">
              <label className={cn('text-xs', theme.text.muted)}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={cn(
                  'w-full rounded-xl px-3 py-2.5 text-sm border outline-none',
                  theme.backgrounds.card,
                  theme.borders.subtle,
                  theme.text.primary,
                  'focus:ring-2 focus:ring-cyan-400/50'
                )}
                autoComplete="email"
              />

              <button
                type="button"
                onClick={onRequestOtp}
                disabled={!emailValid || state.isLoading}
                className={cn(
                  'w-full rounded-xl py-2.5 text-sm font-semibold transition-opacity',
                  'bg-cyan-500 text-white',
                  (!emailValid || state.isLoading) && 'opacity-60 cursor-not-allowed'
                )}
              >
                {state.isLoading ? 'Отправляем…' : 'Получить код'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <label className={cn('text-xs', theme.text.muted)}>Код из письма</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
                className={cn(
                  'w-full rounded-xl px-3 py-2.5 text-sm tracking-[0.3em] border outline-none text-center',
                  theme.backgrounds.card,
                  theme.borders.subtle,
                  theme.text.primary,
                  'focus:ring-2 focus:ring-cyan-400/50'
                )}
              />

              <button
                type="button"
                onClick={onVerifyOtp}
                disabled={otp.length !== 6 || state.isLoading}
                className={cn(
                  'w-full rounded-xl py-2.5 text-sm font-semibold transition-opacity',
                  'bg-cyan-500 text-white',
                  (otp.length !== 6 || state.isLoading) && 'opacity-60 cursor-not-allowed'
                )}
              >
                {state.isLoading ? 'Проверяем…' : 'Войти'}
              </button>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setOtp('');
                    clearError();
                  }}
                  className={cn('text-xs inline-flex items-center gap-1', theme.text.muted)}
                >
                  <ArrowLeft size={12} /> Изменить email
                </button>

                <button
                  type="button"
                  onClick={onRequestOtp}
                  disabled={!canResend || state.isLoading}
                  className={cn(
                    'text-xs',
                    canResend ? 'text-cyan-400' : theme.text.dimmed,
                    (!canResend || state.isLoading) && 'cursor-not-allowed'
                  )}
                >
                  {canResend ? 'Отправить код снова' : `Повторно через ${secondsLeft}с`}
                </button>
              </div>

              {debugCode && (
                <div className={cn('text-xs rounded-xl px-3 py-2 border', theme.borders.subtle, theme.text.muted)}>
                  Debug OTP: <span className={theme.text.primary}>{debugCode}</span>
                </div>
              )}
            </div>
          )}

          {state.error && (
            <div className={cn('mt-3 text-xs rounded-xl px-3 py-2 border', 'border-rose-400/30 text-rose-300 bg-rose-500/10')}>
              {state.error}
            </div>
          )}

          {isTelegram && initData && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={onTelegramLogin}
                className={cn('w-full rounded-xl py-2.5 text-sm font-semibold', isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-black')}
              >
                Войти через Telegram
              </button>
            </div>
          )}
        </motion.div>

        <div className={cn('mt-4 text-[11px] flex items-center justify-center gap-1', theme.text.dimmed)}>
          <ShieldCheck size={12} />
          Сессия защищена. Можно выйти со всех устройств в настройках аккаунта.
        </div>
      </div>
    </div>
  );
}
