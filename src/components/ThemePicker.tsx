import { useEffect, useId, useRef, useState } from 'react';
import { Check, Palette } from 'lucide-react';
import { themeList } from '../theme';
import type { ThemeId } from '../types';

export function ThemePicker({ value, onChange }: { value: ThemeId; onChange: (theme: ThemeId) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLInputElement>('input:checked')?.focus();
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  return <div ref={root} className="relative shrink-0" onBlur={event => {
    if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <button ref={trigger} type="button" aria-label="Сменить тему" aria-expanded={open} aria-controls={id}
      onClick={() => setOpen(prev => !prev)}
      className="w-11 h-11 rounded-xl flex items-center justify-center ui-card border ui-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
      <Palette size={22} />
    </button>
    {open && <fieldset id={id} className="absolute right-0 top-full mt-2 z-50 w-52 max-w-[calc(100vw-2rem)] rounded-2xl border ui-card ui-text p-2 shadow-xl">
      <legend className="sr-only">Тема оформления</legend>
      <p aria-hidden="true" className="px-3 pt-2 pb-1 text-xs font-semibold ui-dimmed">Тема оформления</p>
      {themeList.map(theme => <label key={theme.id} className="relative flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/5">
        <input type="radio" name={id} value={theme.id} checked={value === theme.id} className="peer sr-only"
          onChange={() => { onChange(theme.id); setOpen(false); trigger.current?.focus(); }} />
        <span aria-hidden="true" className="absolute inset-0 rounded-xl pointer-events-none peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500" />
        <span className="flex-1 text-sm font-medium">{theme.name}</span>
        {value === theme.id && <Check size={18} className="ui-accent-text" aria-hidden="true" />}
      </label>)}
    </fieldset>}
  </div>;
}
