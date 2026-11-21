import { ArrowLeft, ArrowRight, Grid3X3, ListChecks } from 'lucide-react';
import type { GameStore } from '../store/gameStore';
import { useBackButton } from '../hooks/useTelegram';
import { useTheme } from '../theme/ThemeContext';
import { getMenuStyles } from '../theme/menuStyles';
import { cn } from '../utils/cn';

export default function GameCatalogScreen({ store }: { store: GameStore }) {
  const { themeId } = useTheme();
  const styles = getMenuStyles(themeId);
  useBackButton(() => store.goBack());
  const games = [
    { title: 'Филлворд', icon: Grid3X3, description: 'Находи слова на поле, соединяя соседние буквы.', detail: 'Главы, задание дня и наборы уровней', action: 'Выбрать режим', screen: 'gameMode' as const },
    { title: 'Викторина по урокам', icon: ListChecks, description: 'Выбирай правильные ответы и проверяй знание слов.', detail: 'Проверка знаний внутри выбранного урока', action: 'Выбрать урок', screen: 'textbook' as const },
  ];
  return <div className={cn('min-h-[100dvh] max-w-2xl mx-auto px-5 pb-10', styles.pageBackground)} style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))' }}>
    <button type="button" onClick={() => store.goBack()} aria-label="Назад" className="ui-secondary min-h-11 min-w-11 rounded-xl flex items-center justify-center"><ArrowLeft size={22} /></button>
    <header className="pt-6 pb-6">
      <h1 className={cn('text-3xl font-semibold tracking-tight', styles.buttons.text.primary)}>Выбрать игру</h1>
      <p className={cn('mt-2 text-sm', styles.buttons.text.secondary)}>Найди слова на поле или проверь себя в викторине.</p>
    </header>
    <div className="space-y-4">
      {games.map(game => <button key={game.screen} type="button" onClick={() => store.navigate(game.screen)} className="ui-card ui-card-hover border rounded-2xl p-5 w-full text-left focus-visible:outline-offset-4">
        <span className="ui-soft ui-accent-text w-12 h-12 rounded-xl flex items-center justify-center"><game.icon size={25} aria-hidden /></span>
        <h2 className="ui-text mt-4 text-xl font-semibold">{game.title}</h2>
        <p className="ui-dimmed mt-2 text-sm leading-relaxed">{game.description}</p>
        <p className="ui-dimmed mt-3 text-xs leading-relaxed">{game.detail}</p>
        <span className="ui-accent-text mt-5 flex items-center justify-between gap-3 text-sm font-semibold">{game.action}<ArrowRight size={20} aria-hidden /></span>
      </button>)}
    </div>
  </div>;
}
