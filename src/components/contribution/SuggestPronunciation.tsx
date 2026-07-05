// «Предложить свою озвучку» на странице слова — для обычных пользователей.
// Запись уходит на модерацию (audio-suggestions), слово меняется только после одобрения.
import React, { useState } from 'react';
import { Loader2, Mic, Send } from 'lucide-react';
import { cn } from '../ui';
import { useTheme } from '../../theme/ThemeContext';
import { AudioRecorderField, releaseAudioDraft, type AudioDraft } from './AudioRecorderField';
import { submitAudioSuggestion } from '../../services/api';

interface Props {
  wordId: string;
  target?: 'word' | 'example';
}

export const SuggestPronunciation: React.FC<Props> = ({ wordId, target = 'word' }) => {
  const { theme, isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AudioDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<'sent' | 'error' | ''>('');

  const send = async () => {
    if (!draft || busy) return;
    setBusy(true);
    try {
      await submitAudioSuggestion(wordId, draft.blob, target, { fileName: draft.fileName });
      releaseAudioDraft(draft);
      setDraft(null);
      setNote('sent');
      setOpen(false);
    } catch {
      setNote('error');
    } finally {
      setBusy(false);
    }
  };

  if (note === 'sent') {
    return (
      <p className={cn('text-xs mt-2', isDark ? 'text-emerald-400' : 'text-emerald-600')}>
        Озвучка отправлена на проверку — спасибо! Она появится после одобрения модератором.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 border transition active:scale-95',
          isDark ? 'border-white/15 text-stone-300' : 'border-stone-300 text-stone-600',
        )}
      >
        <Mic size={13} /> Предложить свою озвучку
      </button>
    );
  }

  return (
    <div className={cn(
      'mt-2 p-3 rounded-xl border text-left inline-block',
      isDark ? 'bg-stone-800/60 border-stone-700/60' : 'bg-stone-50 border-stone-200',
    )}>
      <AudioRecorderField value={draft} onChange={setDraft} disabled={busy} />
      <div className="flex items-center gap-2 mt-2">
        <button
          type="button"
          disabled={!draft || busy}
          onClick={() => void send()}
          className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-40 active:scale-95 transition"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          Отправить на проверку
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            releaseAudioDraft(draft);
            setDraft(null);
            setOpen(false);
            setNote('');
          }}
          className={cn('text-xs', theme.text.muted)}
        >
          Отмена
        </button>
      </div>
      {note === 'error' && (
        <p className="text-[11px] text-red-400 mt-1.5">Не удалось отправить — попробуйте ещё раз</p>
      )}
    </div>
  );
};
