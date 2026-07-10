// Общие классы полей форм экрана входа (отдельный файл — требование react-refresh)
import { useTheme } from '../../theme/ThemeContext';
import { cn } from '../../components/ui';

export function useAuthFieldClasses() {
  const { theme } = useTheme();
  return {
    input: cn(
      'w-full rounded-xl px-3 py-2.5 text-sm border outline-none transition',
      theme.backgrounds.card,
      theme.borders.subtle,
      theme.text.primary,
      'focus:ring-2 focus:ring-amber-400/50',
    ),
    label: cn('block text-xs mb-1', theme.text.muted),
  };
}
