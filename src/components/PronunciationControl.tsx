// Произношение слова/примера: кнопка прослушивания для всех; для админа/модератора —
// запись с микрофона (MediaRecorder) с предпрослушкой, загрузка файла и удаление.
import React, { useEffect, useRef, useState } from 'react';
import { Check, Mic, Square, Trash2, Upload, X } from 'lucide-react';
import { cn } from './ui';
import { WaveAudioButton } from './WaveAudioButton';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  /** подпись, например «Слово» или «Пример» */
  label: string;
  url?: string | null;
  canEdit: boolean;
  onSave(file: Blob, fileName: string): Promise<void>;
  onDelete(): Promise<void>;
}

function pickMime(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  for (const m of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return '';
}

export const PronunciationControl: React.FC<Props> = ({ label, url, canEdit, onSave, onDelete }) => {
  const { theme, isDark } = useTheme();
  const [recording, setRecording] = useState(false);
  const [preview, setPreview] = useState<{ blob: Blob; url: string; mime: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    recRef.current?.stream.getTracks().forEach((t) => t.stop());
    if (preview) URL.revokeObjectURL(preview.url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = rec.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        if (blob.size > 200) {
          setPreview({ blob, url: URL.createObjectURL(blob), mime: type });
        }
        setRecording(false);
      };
      recRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setError('Нет доступа к микрофону — разрешите его или загрузите файл');
    }
  };

  const stopRecording = () => recRef.current?.state === 'recording' && recRef.current.stop();

  const savePreview = async () => {
    if (!preview) return;
    setBusy(true);
    setError('');
    try {
      const ext = preview.mime.includes('mp4') ? 'm4a' : preview.mime.includes('ogg') ? 'ogg' : 'webm';
      await onSave(preview.blob, `rec.${ext}`);
      URL.revokeObjectURL(preview.url);
      setPreview(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (f: File) => {
    setBusy(true);
    setError('');
    try {
      await onSave(f, f.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить');
    } finally {
      setBusy(false);
    }
  };

  if (!canEdit && !url) return null;

  const btnCls = cn(
    'px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40',
    isDark ? 'border-white/15 text-white' : 'border-stone-300 text-stone-700',
  );

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn('text-[11px] font-semibold uppercase tracking-wider min-w-[52px]', theme.text.dimmed)}>
          {label}
        </span>

        {url && !preview && <WaveAudioButton src={url} />}

        {canEdit && !recording && !preview && (
          <>
            <button className={btnCls} disabled={busy} onClick={() => void startRecording()}>
              <Mic size={13} /> {url ? 'Перезаписать' : 'Записать'}
            </button>
            <button className={btnCls} disabled={busy} onClick={() => fileRef.current?.click()}>
              <Upload size={13} /> Файл
            </button>
            {url && (
              <button
                className={cn(btnCls, 'text-red-500 border-red-500/40')}
                disabled={busy}
                onClick={() => void onDelete().catch(() => setError('Не удалось удалить'))}
              >
                <Trash2 size={13} />
              </button>
            )}
          </>
        )}

        {recording && (
          <button className={cn(btnCls, 'bg-red-500 border-red-500 text-white animate-pulse')} onClick={stopRecording}>
            <Square size={13} /> Стоп — идёт запись…
          </button>
        )}

        {preview && (
          <>
            <WaveAudioButton src={preview.url} />
            <button
              className={cn(btnCls, 'bg-emerald-500 border-emerald-500 text-white')}
              disabled={busy}
              onClick={() => void savePreview()}
            >
              <Check size={13} /> Сохранить
            </button>
            <button
              className={btnCls}
              disabled={busy}
              onClick={() => {
                URL.revokeObjectURL(preview.url);
                setPreview(null);
              }}
            >
              <X size={13} />
            </button>
          </>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void onFile(f);
          }}
        />
      </div>
      {error && <span className="text-[11px] text-red-500">{error}</span>}
    </div>
  );
};
