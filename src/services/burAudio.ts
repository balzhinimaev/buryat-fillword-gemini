// Озвучка бурятских слов (урок алфавита): вшитые mp3, сгенерированные нейро-TTS.
// Приближённое произношение, не носитель — в UI есть пометка.
import manifest from '../data/burAudio.json';

const AUDIO: Record<string, string> = manifest as Record<string, string>;

let current: HTMLAudioElement | null = null;

export function hasBurAudio(bur: string): boolean {
  return !!AUDIO[bur.toUpperCase()];
}

export function burAudioUrl(bur: string): string | null {
  const path = AUDIO[bur.toUpperCase()];
  return path ? import.meta.env.BASE_URL + path : null;
}

export function playBurAudio(bur: string): void {
  const path = AUDIO[bur.toUpperCase()];
  if (!path) return;
  try {
    current?.pause();
    current = new Audio(import.meta.env.BASE_URL + path);
    void current.play().catch(() => {});
  } catch {
    /* без аудио-устройства */
  }
}
