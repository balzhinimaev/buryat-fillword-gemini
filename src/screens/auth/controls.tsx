// Переиспользуемые поля и кнопки форм экрана входа
import React from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';
import { cn } from '../../components/ui';
import { useAuthFieldClasses } from './fieldClasses';

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Отправка формы по Enter */
  onEnter?: () => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  inputMode?: 'numeric';
  inputClassName?: string;
}

export const TextField: React.FC<TextFieldProps> = ({
  label, value, onChange, onEnter, type = 'text',
  placeholder, autoComplete, autoFocus, inputMode, inputClassName,
}) => {
  const cls = useAuthFieldClasses();
  return (
    <div>
      <label className={cls.label}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onEnter ? (e) => { if (e.key === 'Enter') { e.preventDefault(); onEnter(); } } : undefined}
        placeholder={placeholder}
        className={cn(cls.input, inputClassName)}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        inputMode={inputMode}
      />
    </div>
  );
};

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  autoComplete: string;
  show: boolean;
  onToggleShow: () => void;
}

export const PasswordField: React.FC<PasswordFieldProps> = ({
  label, value, onChange, onEnter, autoComplete, show, onToggleShow,
}) => {
  const cls = useAuthFieldClasses();
  const { theme } = useTheme();
  return (
    <div>
      <label className={cls.label}>{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onEnter ? (e) => { if (e.key === 'Enter') { e.preventDefault(); onEnter(); } } : undefined}
          placeholder="минимум 6 символов"
          className={cn(cls.input, 'pr-10')}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          onClick={onToggleShow}
          aria-label={show ? 'Скрыть пароль' : 'Показать пароль'}
          className={cn('absolute right-2.5 top-1/2 -translate-y-1/2', theme.text.dimmed)}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
};

interface SubmitButtonProps {
  label: string;
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
  /** Содержимое на время загрузки (по умолчанию — спиннер) */
  busyContent?: React.ReactNode;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({
  label, disabled, loading, onClick, busyContent,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled || loading}
    className={cn(
      'w-full rounded-xl py-3 text-sm font-semibold text-white transition',
      'bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg shadow-amber-500/20',
      (disabled || loading) && 'opacity-60 cursor-not-allowed',
    )}
  >
    {loading ? (busyContent ?? <Loader2 size={16} className="animate-spin mx-auto" />) : label}
  </button>
);
