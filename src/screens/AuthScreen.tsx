// Экран входа: классические вход/регистрация по email+паролю (логин = email),
// сброс пароля по коду из письма, вход по одноразовому коду как альтернатива,
// плюс соц-входы (ВКонтакте, Telegram внутри Mini App).
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, Mail, ShieldCheck, UserPlus } from 'lucide-react';
import { useAuth } from '../store/authStore';
import { startVkLogin, VK_CONFIGURED } from '../services/vkAuth';
import { useTelegram } from '../hooks/useTelegram';
import { useTheme } from '../theme/ThemeContext';
import { cn } from '../components/ui';

type AuthMode = 'login' | 'register' | 'otp' | 'reset';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthScreen() {
  const {
    state, login, requestEmailOtp, verifyEmailOtp,
    passwordLogin, passwordRegister, passwordReset, clearError,
  } = useAuth();
  const { isTelegram, initData } = useTelegram();
  const { theme, isDark } = useTheme();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [resendAvailableAtMs, setResendAvailableAtMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [debugCode, setDebugCode] = useState<string | null>(null);

  const emailValid = useMemo(() => EMAIL_RE.test(email.trim()), [email]);
  const passwordValid = password.length >= 6;
  const registerValid = emailValid && passwordValid && password === password2 && name.trim().length >= 2;

  useEffect(() => {
    if (!resendAvailableAtMs) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [resendAvailableAtMs]);

  const secondsLeft = useMemo(() => {
    if (!resendAvailableAtMs) return 0;
    return Math.max(0, Math.ceil((resendAvailableAtMs - nowMs) / 1000));
  }, [resendAvailableAtMs, nowMs]);
  const canResend = secondsLeft === 0;

  const switchMode = (next: AuthMode) => {
    clearError();
    setMode(next);
    setOtp('');
    setCodeSent(false);
    setDebugCode(null);
  };

  const sendCode = async () => {
    if (!emailValid) return;
    clearError();
    try {
      const response = await requestEmailOtp(email.trim());
      setCodeSent(true);
      setOtp('');
      const now = Date.now();
      setNowMs(now);
      setResendAvailableAtMs(now + (response.resendAfterSeconds ?? 60) * 1000);
      setDebugCode(response.debugCode ?? null);
    } catch { /* ошибка уже в сторе */ }
  };

  const submit = async () => {
    clearError();
    try {
      if (mode === 'login') {
        if (!emailValid || !passwordValid) return;
        await passwordLogin(email.trim(), password);
      } else if (mode === 'register') {
        if (!registerValid) return;
        await passwordRegister(email.trim(), name.trim(), password);
      } else if (mode === 'otp') {
        if (otp.trim().length !== 6) return;
        await verifyEmailOtp(email.trim(), otp.trim());
      } else if (mode === 'reset') {
        if (otp.trim().length !== 6 || !passwordValid) return;
        await passwordReset(email.trim(), otp.trim(), password);
      }
    } catch { /* ошибка уже в сторе */ }
  };

  const inputCls = cn(
    'w-full rounded-xl px-3 py-2.5 text-sm border outline-none transition',
    theme.backgrounds.card,
    theme.borders.subtle,
    theme.text.primary,
    'focus:ring-2 focus:ring-amber-400/50',
  );
  const labelCls = cn('block text-xs mb-1', theme.text.muted);

  const titles: Record<AuthMode, { title: string; subtitle: string }> = {
    login: { title: 'Вход', subtitle: 'Email и пароль от вашего аккаунта' },
    register: { title: 'Регистрация', subtitle: 'Создайте аккаунт — прогресс сохранится на всех устройствах' },
    otp: { title: 'Вход по коду', subtitle: codeSent ? `Код отправлен на ${email.trim()}` : 'Пришлём одноразовый код на email' },
    reset: { title: 'Сброс пароля', subtitle: codeSent ? `Код отправлен на ${email.trim()}` : 'Пришлём код для смены пароля' },
  };

  const passwordField = (label: string, autoComplete: string) => (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void submit(); } }}
          placeholder="минимум 6 символов"
          className={cn(inputCls, 'pr-10')}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
          className={cn('absolute right-2.5 top-1/2 -translate-y-1/2', theme.text.dimmed)}
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );

  const primaryBtn = (label: string, disabled: boolean) => (
    <button
      type="button"
      onClick={() => void submit()}
      disabled={disabled || state.isLoading}
      className={cn(
        'w-full rounded-xl py-3 text-sm font-semibold text-white transition',
        'bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg shadow-amber-500/20',
        (disabled || state.isLoading) && 'opacity-60 cursor-not-allowed',
      )}
    >
      {state.isLoading ? <Loader2 size={16} className="animate-spin mx-auto" /> : label}
    </button>
  );

  return (
    <div className={cn('min-h-[100dvh] flex flex-col px-5 py-8', theme.backgrounds.primaryGradient)}>
      <div className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn('rounded-3xl border p-5', theme.backgrounds.card, theme.borders.subtle)}
        >
          {/* Заголовок */}
          <div className="flex items-center gap-3 mb-4">
            <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', isDark ? 'bg-amber-500/15' : 'bg-amber-100')}>
              {mode === 'register' ? <UserPlus size={20} className="text-amber-500" />
                : mode === 'otp' || mode === 'reset' ? <KeyRound size={20} className="text-amber-500" />
                : <Mail size={20} className="text-amber-500" />}
            </div>
            <div className="min-w-0">
              <h1 className={cn('text-lg font-semibold', theme.text.primary)}>{titles[mode].title}</h1>
              <p className={cn('text-xs truncate', theme.text.muted)}>{titles[mode].subtitle}</p>
            </div>
          </div>

          {/* Соц-входы */}
          {(VK_CONFIGURED || (isTelegram && initData)) && (mode === 'login' || mode === 'register') && (
            <div className="mb-4 space-y-2">
              {isTelegram && initData && (
                <button
                  type="button"
                  onClick={() => { clearError(); void login(); }}
                  className="w-full rounded-xl py-2.5 text-sm font-semibold text-white"
                  style={{ backgroundColor: '#2AABEE' }}
                >
                  Войти через Telegram
                </button>
              )}
              {VK_CONFIGURED && (
                <button
                  type="button"
                  onClick={() => { void startVkLogin(); }}
                  className="w-full rounded-xl py-2.5 text-sm font-semibold text-white"
                  style={{ backgroundColor: '#0077FF' }}
                >
                  Войти через ВКонтакте
                </button>
              )}
              <div className="flex items-center gap-3 pt-1">
                <span className={cn('flex-1 h-px', isDark ? 'bg-white/10' : 'bg-stone-200')} />
                <span className={cn('text-xs', theme.text.dimmed)}>или по email</span>
                <span className={cn('flex-1 h-px', isDark ? 'bg-white/10' : 'bg-stone-200')} />
              </div>
            </div>
          )}

          {/* Табы Вход / Регистрация */}
          {(mode === 'login' || mode === 'register') && (
            <div className={cn('flex gap-1 mb-4 p-1 rounded-xl', isDark ? 'bg-white/5' : 'bg-stone-100')}>
              {([['login', 'Вход'], ['register', 'Регистрация']] as const).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-sm font-semibold transition',
                    mode === m
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow'
                      : theme.text.muted,
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={mode + (codeSent ? '-sent' : '')}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="space-y-3"
            >
              {/* ВХОД */}
              {mode === 'login' && (
                <>
                  <div>
                    <label className={labelCls}>Email</label>
                    <input
                      type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com" className={inputCls} autoComplete="email"
                    />
                  </div>
                  {passwordField('Пароль', 'current-password')}
                  {primaryBtn('Войти', !emailValid || !passwordValid)}
                  <div className="flex items-center justify-between">
                    <button type="button" onClick={() => switchMode('reset')} className={cn('text-xs', theme.text.muted)}>
                      Забыли пароль?
                    </button>
                    <button type="button" onClick={() => switchMode('otp')} className="text-xs text-amber-500 font-medium">
                      Войти по коду из письма
                    </button>
                  </div>
                </>
              )}

              {/* РЕГИСТРАЦИЯ */}
              {mode === 'register' && (
                <>
                  <div>
                    <label className={labelCls}>Имя</label>
                    <input
                      type="text" value={name} onChange={(e) => setName(e.target.value)}
                      placeholder="Как вас называть в игре" className={inputCls} autoComplete="nickname"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Email</label>
                    <input
                      type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com" className={inputCls} autoComplete="email"
                    />
                  </div>
                  {passwordField('Пароль', 'new-password')}
                  <div>
                    <label className={labelCls}>Повторите пароль</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password2} onChange={(e) => setPassword2(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void submit(); } }}
                      placeholder="ещё раз" className={inputCls} autoComplete="new-password"
                    />
                    {password2.length > 0 && password !== password2 && (
                      <p className="text-[11px] text-red-400 mt-1">Пароли не совпадают</p>
                    )}
                  </div>
                  {primaryBtn('Создать аккаунт', !registerValid)}
                </>
              )}

              {/* ВХОД ПО КОДУ / СБРОС ПАРОЛЯ */}
              {(mode === 'otp' || mode === 'reset') && (
                <>
                  {!codeSent ? (
                    <>
                      <div>
                        <label className={labelCls}>Email</label>
                        <input
                          type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void sendCode(); } }}
                          placeholder="you@example.com" className={inputCls} autoComplete="email"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => void sendCode()}
                        disabled={!emailValid || state.isLoading}
                        className={cn(
                          'w-full rounded-xl py-3 text-sm font-semibold text-white transition',
                          'bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg shadow-amber-500/20',
                          (!emailValid || state.isLoading) && 'opacity-60 cursor-not-allowed',
                        )}
                      >
                        {state.isLoading ? 'Отправляем…' : 'Получить код'}
                      </button>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className={labelCls}>Код из письма</label>
                        <input
                          type="text" value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void submit(); } }}
                          placeholder="000000" inputMode="numeric" autoFocus
                          className={cn(inputCls, 'tracking-[0.3em] text-center')}
                        />
                      </div>
                      {mode === 'reset' && passwordField('Новый пароль', 'new-password')}
                      {primaryBtn(
                        mode === 'reset' ? 'Сменить пароль и войти' : 'Войти',
                        otp.length !== 6 || (mode === 'reset' && !passwordValid),
                      )}
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => { setCodeSent(false); setOtp(''); clearError(); }}
                          className={cn('text-xs inline-flex items-center gap-1', theme.text.muted)}
                        >
                          <ArrowLeft size={12} /> Изменить email
                        </button>
                        <button
                          type="button"
                          onClick={() => void sendCode()}
                          disabled={!canResend || state.isLoading}
                          className={cn('text-xs', canResend ? 'text-amber-500' : theme.text.dimmed)}
                        >
                          {canResend ? 'Отправить код снова' : `Повторно через ${secondsLeft} c`}
                        </button>
                      </div>
                      {debugCode && (
                        <div className={cn('text-xs rounded-xl px-3 py-2 border', theme.borders.subtle, theme.text.muted)}>
                          Debug OTP: <span className={theme.text.primary}>{debugCode}</span>
                        </div>
                      )}
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className={cn('text-xs inline-flex items-center gap-1', theme.text.muted)}
                  >
                    <ArrowLeft size={12} /> Назад ко входу с паролем
                  </button>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {state.error && (
            <div className={cn(
              'mt-3 text-xs rounded-xl px-3 py-2 border',
              isDark ? 'border-rose-400/30 text-rose-300 bg-rose-500/10' : 'border-rose-200 text-rose-600 bg-rose-50',
            )}>
              {state.error}
            </div>
          )}

          {!initData && isTelegram === false && mode === 'login' && (
            <p className={cn('mt-4 text-[11px] text-center', theme.text.dimmed)}>
              Играете в Telegram? Откройте мини-приложение через бота{' '}
              <span className="font-semibold">@buryat_fillword_bot</span> — вход будет автоматическим.
            </p>
          )}
        </motion.div>

        <div className={cn('mt-4 text-[11px] flex items-center justify-center gap-1', theme.text.dimmed)}>
          <ShieldCheck size={12} />
          Сессия защищена. Выйти со всех устройств можно в настройках.
        </div>
      </div>
    </div>
  );
}
