import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, RotateCcw } from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';
import { cn } from '../utils/cn';
import { extendTrialPath, matchTrialWord, TRIAL_LETTERS, TRIAL_WORDS } from './trialLesson';

interface Props {
  onExit(): void;
  onContinue(): void;
  continueLabel?: string;
  guest?: boolean;
}

export default function TrialLesson({ onExit, onContinue, continueLabel = 'Выбрать занятие', guest = false }: Props) {
  const { theme, isDark } = useTheme();
  const [path, setPath] = useState<number[]>([]);
  const [drag, setDrag] = useState<number[]>([]);
  const [found, setFound] = useState<number[]>([]);
  const [message, setMessage] = useState('Начни с Н в левом верхнем углу и проведи вправо: НАРАН.');
  const [answer, setAnswer] = useState<number | null>(null);
  const pointer = useRef<number | null>(null);
  const dragPath = useRef<number[]>([]);
  const foundAll = found.length === TRIAL_WORDS.length;
  const selected = drag.length ? drag : path;
  const button = 'min-h-12 rounded-2xl px-4 py-3 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-500';
  const cancel = () => {
    pointer.current = null;
    dragPath.current = [];
    setDrag([]);
    setPath([]);
  };
  useEffect(() => {
    const onVisibility = () => { if (document.hidden) cancel(); };
    window.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', cancel);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
  const check = (selection: number[]) => {
    const index = matchTrialWord(selection);
    if (index < 0) setMessage('Пока не получилось. Соедини соседние буквы одного слова — без пропусков.');
    else if (found.includes(index)) setMessage('Это слово уже найдено. Попробуй следующее.');
    else {
      setFound(previous => previous.includes(index) ? previous : [...previous, index]);
      setMessage(`${TRIAL_WORDS[index].bur} — ${TRIAL_WORDS[index].ru.toLowerCase()}. Найдено!`);
    }
    setPath([]);
  };
  return (
    <div className={cn('min-h-[100dvh] px-4 py-6', theme.backgrounds.primaryGradient)} style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
      <div className="max-w-md mx-auto space-y-5">
        <header className="flex items-center justify-between gap-3">
          <button type="button" onClick={onExit} className={cn(button, 'inline-flex items-center gap-2', theme.text.muted)}><ArrowLeft size={18} /> Назад</button>
          <span className={cn('text-sm', theme.text.muted)}>Пробное занятие · без таймера</span>
        </header>
        <div>
          <p className={cn('text-xs uppercase tracking-widest mb-2', theme.text.muted)}>Бурятский в трёх словах</p>
          <h1 className={cn('text-3xl font-bold tracking-tight', theme.text.primary)}>{foundAll ? 'А теперь вспомним' : 'Найди своё первое слово'}</h1>
          <p className={cn('mt-3 text-sm leading-relaxed', theme.text.muted)}>{foundAll ? 'Найти буквы — первый шаг. Попробуй вспомнить значение.' : 'Веди по соседним буквам вверх, вниз, влево или вправо. Можно и нажимать на них по очереди.'}</p>
        </div>
        <section className={cn('rounded-3xl border p-5', theme.backgrounds.card, theme.borders.subtle)} aria-label="Пробное занятие">
          {!foundAll ? <>
            <div className="flex justify-between gap-3 mb-4"><span className={cn('font-semibold', theme.text.primary)}>Три слова</span><span className={theme.text.muted}>{found.length} / 3 найдено</span></div>
            <div className="grid grid-cols-5 gap-1.5 touch-none select-none" role="group" aria-label="Буквы филлворда"
              onPointerDown={event => {
                if (event.button !== 0 || pointer.current !== null) return;
                const cell = (event.target as HTMLElement).closest<HTMLElement>('[data-trial-cell]');
                if (!cell) return;
                pointer.current = event.pointerId;
                dragPath.current = [Number(cell.dataset.trialCell)];
                setDrag(dragPath.current);
                event.currentTarget.setPointerCapture?.(event.pointerId);
              }}
              onPointerMove={event => {
                if (pointer.current !== event.pointerId) return;
                const cell = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-trial-cell]');
                if (!cell || !event.currentTarget.contains(cell)) return;
                dragPath.current = extendTrialPath(dragPath.current, Number(cell.dataset.trialCell));
                setDrag(dragPath.current);
              }}
              onPointerUp={event => {
                if (pointer.current !== event.pointerId) return;
                const selection = dragPath.current;
                pointer.current = null;
                dragPath.current = [];
                setDrag([]);
                if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                if (selection.length > 1) check(selection);
                else if (selection.length === 1) setPath(previous => extendTrialPath(previous, selection[0]));
              }}
              onPointerCancel={cancel} onLostPointerCapture={() => { if (pointer.current !== null) cancel(); }}>
              {TRIAL_LETTERS.map((letter, index) => {
                const isFound = found.some(word => TRIAL_WORDS[word].path.includes(index));
                return <button key={index} type="button" data-trial-cell={index} aria-label={`${letter}, строка ${Math.floor(index / 5) + 1}, столбец ${index % 5 + 1}`} aria-pressed={selected.includes(index)}
                  onClick={event => { if (event.detail === 0) setPath(previous => extendTrialPath(previous, index)); }}
                  className={cn('aspect-square min-h-10 rounded-xl text-xl font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500', selected.includes(index) ? 'bg-amber-500 text-stone-950' : isFound ? (isDark ? 'bg-emerald-900 text-emerald-200' : 'bg-emerald-100 text-emerald-900') : cn(isDark ? 'bg-stone-800' : 'bg-stone-100', theme.text.primary))}>{letter}</button>;
              })}
            </div>
            <div className="flex gap-2 mt-3">
              <button type="button" disabled={!path.length} onClick={() => check(path)} className={cn(button, 'flex-1 bg-amber-500 text-stone-950 disabled:opacity-40')}>Проверить слово</button>
              <button type="button" onClick={cancel} aria-label="Сбросить выделение" className={cn(button, theme.text.muted)}><RotateCcw size={20} /></button>
            </div>
            <p role="status" className={cn('text-sm leading-relaxed mt-4 min-h-10', theme.text.muted)}>{message}</p>
            <ul className="mt-3 space-y-2">{TRIAL_WORDS.map((word, index) => <li key={word.bur} className={cn('flex gap-2 items-center text-sm', theme.text.primary)}>
              {found.includes(index) ? <Check size={16} className="text-emerald-500" /> : <span className="w-4" />}
              <span className={cn('font-semibold', found.includes(index) && 'line-through')}>{word.bur}</span><span className={theme.text.muted}>— {word.ru.toLowerCase()}</span>
            </li>)}</ul>
          </> : <>
            <h2 className={cn('text-xl font-bold mb-4', theme.text.primary)}>Что значит «УҺАН»?</h2>
            <div className="space-y-2">{TRIAL_WORDS.map((word, index) => <button key={word.bur} type="button" disabled={answer !== null} onClick={() => setAnswer(index)} className={cn(button, 'w-full text-left border', theme.borders.subtle, answer !== null && index === 1 ? (isDark ? 'bg-emerald-900 text-emerald-100' : 'bg-emerald-100 text-emerald-900') : theme.text.primary)}>{word.ru}</button>)}</div>
            {answer !== null && <div className="mt-5">
              <p role="status" className={cn('font-semibold', theme.text.primary)}>{answer === 1 ? 'Верно! Уһан — вода.' : 'Уһан — вода. Теперь будет легче вспомнить.'}</p>
              <p className={cn('text-sm mt-2 leading-relaxed', theme.text.muted)}>{guest ? 'Пробное занятие завершено. Войди, чтобы продолжить курс и сохранять свой прогресс.' : 'Отличное начало. Дальше — новые слова и небольшие занятия в своём темпе.'}</p>
              <button type="button" onClick={onContinue} className={cn(button, 'w-full mt-5 bg-amber-500 text-stone-950 inline-flex items-center justify-center gap-2')}>{continueLabel}<ArrowRight size={18} /></button>
            </div>}
          </>}
        </section>
        <p className={cn('text-xs text-center', theme.text.muted)}>Это тренировка: без звёзд, рейтинга и регистрации.</p>
      </div>
    </div>
  );
}
