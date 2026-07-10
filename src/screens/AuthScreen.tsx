// Экран входа: классические вход/регистрация по email+паролю (логин = email),
// сброс пароля по коду из письма, вход по одноразовому коду как альтернатива,
// плюс соц-входы (ВКонтакте, Telegram внутри Mini App) — см. ./auth/.
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, KeyRound, Mail, ShieldCheck, UserPlus } from 'lucide-react';
import { useAuth } from '../store/authStore';
import { useTelegram } from '../hooks/useTelegram';
import { useTheme } from '../theme/ThemeContext';
import { cn } from '../components/ui';
import { TextField, PasswordField, SubmitButton } from './auth/controls';
import { SocialLoginButtons } from './auth/SocialLoginButtons';
import { useResendCountdown } from './auth/useResendCountdown';

type AuthMode = 'login' | 'register' | 'otp' | 'reset';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TITLES: Record<AuthMode, { title: string; subtitle: (email: string, codeSent: boolean) => string }> = {
  login: { title: 'Вход', subtitle: () => 'Email и пароль от вашего аккаунта' },
  register: { title: 'Регистрация', subtitle: () => 'Создайте аккаунт — прогресс сохранится на всех устройствах' },
  otp: { title: 'Вход по коду', subtitle: (email, codeSent) => codeSent ? `Код отправлен на ${email}` : 'Пришлём одноразовый код на email' },
  reset: { title: 'Сброс пароля', subtitle: (email, codeSent) => codeSent ? `Код отправлен на ${email}` : 'Пришлём код для смены пароля' },
};

export default function AuthScreen() {
  const {
    state, requestEmailOtp, verifyEmailOtp,
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
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const resend = useResendCountdown();

  const emailValid = useMemo(() => EMAIL_RE.test(email.trim()), [email]);
  const passwordValid = password.length >= 6;
  const registerValid = emailValid && passwordValid && password === password2 && name.trim().length >= 2;

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
      resend.start(response.resendAfterSeconds ?? 60);
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

  const emailField = (onEnter?: () => void) => (
    <TextField
      label="Email" type="email" value={email} onChange={setEmail} onEnter={onEnter}
      placeholder="you@example.com" autoComplete="email"
    />
  );

  const loginForm = (
    <>
      {emailField()}
      <PasswordField
        label="Пароль" value={password} onChange={setPassword} onEnter={() => void submit()}
        autoComplete="current-password" show={showPassword} onToggleShow={() => setShowPassword(v => !v)}
      />
      <SubmitButton label="Войти" disabled={!emailValid || !passwordValid} loading={state.isLoading} onClick={() => void submit()} />
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => switchMode('reset')} className={cn('text-xs', theme.text.muted)}>
          Забыли пароль?
        </button>
        <button type="button" onClick={() => switchMode('otp')} className="text-xs text-amber-500 font-medium">
          Войти по коду из письма
        </button>
      </div>
    </>
  );

  const registerForm = (
    <>
      <TextField
        label="Имя" value={name} onChange={setName}
        placeholder="Как вас называть в игре" autoComplete="nickname"
      />
      {emailField()}
      <PasswordField
        label="Пароль" value={password} onChange={setPassword} onEnter={() => void submit()}
        autoComplete="new-password" show={showPassword} onToggleShow={() => setShowPassword(v => !v)}
      />
      <div>
        <TextField
          label="Повторите пароль" type={showPassword ? 'text' : 'password'}
          value={password2} onChange={setPassword2} onEnter={() => void submit()}
          placeholder="ещё раз" autoComplete="new-password"
        />
        {password2.length > 0 && password !== password2 && (
          <p className="text-[11px] text-red-400 mt-1">Пароли не совпадают</p>
        )}
      </div>
      <SubmitButton label="Создать аккаунт" disabled={!registerValid} loading={state.isLoading} onClick={() => void submit()} />
    </>
  );

  // Общая форма для входа по коду и сброса пароля: email → код (+ новый пароль при сбросе)
  const codeForm = (
    <>
      {!codeSent ? (
        <>
          {emailField(() => void sendCode())}
          <SubmitButton
            label="Получить код" disabled={!emailValid} loading={state.isLoading}
            onClick={() => void sendCode()} busyContent="Отправляем…"
          />
        </>
      ) : (
        <>
          <TextField
            label="Код из письма" value={otp}
            onChange={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
            onEnter={() => void submit()}
            placeholder="000000" inputMode="numeric" autoFocus
            inputClassName="tracking-[0.3em] text-center"
          />
          {mode === 'reset' && (
            <PasswordField
              label="Новый пароль" value={password} onChange={setPassword} onEnter={() => void submit()}
              autoComplete="new-password" show={showPassword} onToggleShow={() => setShowPassword(v => !v)}
            />
          )}
          <SubmitButton
            label={mode === 'reset' ? 'Сменить пароль и войти' : 'Войти'}
            disabled={otp.length !== 6 || (mode === 'reset' && !passwordValid)}
            loading={state.isLoading}
            onClick={() => void submit()}
          />
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
              disabled={!resend.canResend || state.isLoading}
              className={cn('text-xs', resend.canResend ? 'text-amber-500' : theme.text.dimmed)}
            >
              {resend.canResend ? 'Отправить код снова' : `Повторно через ${resend.secondsLeft} c`}
            </button>
          </div>
          {import.meta.env.DEV && debugCode && (
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
              <h1 className={cn('text-lg font-semibold', theme.text.primary)}>{TITLES[mode].title}</h1>
              <p className={cn('text-xs truncate', theme.text.muted)}>{TITLES[mode].subtitle(email.trim(), codeSent)}</p>
            </div>
          </div>

          {/* Соц-входы */}
          {(mode === 'login' || mode === 'register') && <SocialLoginButtons />}

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
              {mode === 'login' && loginForm}
              {mode === 'register' && registerForm}
              {(mode === 'otp' || mode === 'reset') && codeForm}
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
