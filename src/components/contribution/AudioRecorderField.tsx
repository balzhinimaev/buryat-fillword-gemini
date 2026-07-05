// Локальная запись озвучки: блоб живёт в состоянии родителя и загружается
// позже (например, после createWord). Для мгновенной загрузки на существующее
// слово есть PronunciationControl.
import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, Upload, X } from 'lucide-react';
import { cn } from '../ui';
import { WaveAudioButton } from '../WaveAudioButton';
import { useTheme } from '../../theme/ThemeContext';

export interface AudioDraft {
  blob: Blob;
  url: string;
  fileName: string;
}

interface Props {
  value: AudioDraft | null;
  onChange(draft: AudioDraft | null): void;
  disabled?: boolean;
}

function pickMime(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  for (const m of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return '';
}

export function releaseAudioDraft(draft: AudioDraft | null): void {
  if (draft) URL.revokeObjectURL(draft.url);
}

export const AudioRecorderField: React.FC<Props> = ({ value, onChange, disabled }) => {
  const { isDark } = useTheme();
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState('');
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    recRef.current?.stream.getTracks().forEach((t) => t.stop());
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
          const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
          releaseAudioDraft(value);
          onChange({ blob, url: URL.createObjectURL(blob), fileName: `rec.${ext}` });
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

  const btnCls = cn(
    'px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 transition active:scale-95',
    isDark ? 'border-white/15 text-white' : 'border-stone-300 text-stone-700',
  );

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        {value && !recording && (
          <>
            <WaveAudioButton src={value.url} />
            <button
              type="button"
              className={btnCls}
              disabled={disabled}
              onClick={() => {
                releaseAudioDraft(value);
                onChange(null);
              }}
            >
              <X size={13} /> Убрать
            </button>
          </>
        )}

        {!recording && (
          <>
            <button type="button" className={btnCls} disabled={disabled} onClick={() => void startRecording()}>
              <Mic size={13} /> {value ? 'Перезаписать' : 'Записать'}
            </button>
            <button type="button" className={btnCls} disabled={disabled} onClick={() => fileRef.current?.click()}>
              <Upload size={13} /> Файл
            </button>
          </>
        )}

        {recording && (
          <button
            type="button"
            className={cn(btnCls, 'bg-red-500 border-red-500 text-white animate-pulse')}
            onClick={stopRecording}
          >
            <Square size={13} /> Стоп — идёт запись…
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) {
              releaseAudioDraft(value);
              onChange({ blob: f, url: URL.createObjectURL(f), fileName: f.name });
            }
          }}
        />
      </div>
      {error && <span className="text-[11px] text-red-500">{error}</span>}
    </div>
  );
};
