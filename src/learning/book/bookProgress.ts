import { useCallback, useEffect, useState } from 'react';
import { progressOwner, readProgress, writeProgress, PROGRESS_OWNER_EVENT } from '../../services/progressStorage';
import { BOOK_PASS_RATIO } from './model';

// Explicit course scope: no dependency on a stale active-course closure, no legacy migration.
const KEY = 'course:en-ru:self-study-book:v1';
const EVENT = 'english-book:progress';
export interface PracticeResult { best?: number; latest?: number; wrong?: string[] }
export interface ChapterProgress {
  practice?: Record<string, PracticeResult>;
  read?: boolean;
  bookmark?: boolean;
  section?: string;
  best?: number;
  latest?: number;
  wrong?: string[];
}
export interface BookProgress {
  chapters: Record<string, ChapterProgress>;
  last?: string;
  font: number;
}
const memory = new Map<string, BookProgress>();
const volatileOwners = new Set<string>();
const empty = (): BookProgress => ({ chapters: {}, font: 18 });
export function readBookProgress(owner = progressOwner()): BookProgress {
  if (volatileOwners.has(owner)) return memory.get(owner) || empty();
  try {
    const raw = readProgress(KEY, owner);
    if (!raw) return empty();
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return empty();
    const data = value as Partial<BookProgress>;
    const chapters: Record<string, ChapterProgress> = {};
    if (data.chapters && typeof data.chapters === 'object') {
      for (const [id, entry] of Object.entries(data.chapters)) {
        if (!/^en-\d{2}$/.test(id) || !entry || typeof entry !== 'object') continue;
        const ratio = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1 ? n : undefined;
        const practice: Record<string, PracticeResult> = {};
        if (entry.practice && typeof entry.practice === 'object') {
          for (const [setId, result] of Object.entries(entry.practice)) {
            if (![`${id}-practice`, `${id}-mixed`].includes(setId) || !result || typeof result !== 'object') continue;
            practice[setId] = { best: ratio(result.best), latest: ratio(result.latest),
              wrong: Array.isArray(result.wrong) ? result.wrong.filter((q): q is string => typeof q === 'string' && q.startsWith(`${setId}-q`)).slice(0, 100) : [] };
          }
        }
        chapters[id] = {
          ...(Object.keys(practice).length ? { practice } : {}),
          read: entry.read === true, bookmark: entry.bookmark === true,
          section: typeof entry.section === 'string' && /^en-\d{2}-(?:s\d+|usage)$/.test(entry.section) ? entry.section : undefined,
          best: ratio(entry.best), latest: ratio(entry.latest),
          wrong: Array.isArray(entry.wrong) ? entry.wrong.filter((x): x is string => typeof x === 'string').slice(0, 100) : [],
        };
      }
    }
    return { chapters, last: typeof data.last === 'string' ? data.last : undefined,
      font: typeof data.font === 'number' && [16, 18, 20, 22].includes(data.font) ? data.font : 18 };
  } catch { return memory.get(owner) || empty(); }
}
export function saveBookProgress(update: (current: BookProgress) => BookProgress, owner = progressOwner()): boolean {
  const value = update(readBookProgress(owner));
  let saved = true;
  try { writeProgress(KEY, JSON.stringify(value), owner); volatileOwners.delete(owner); memory.delete(owner); } catch { saved = false; volatileOwners.add(owner); memory.set(owner, value); }
  window.dispatchEvent(new Event(EVENT));
  return saved;
}
export function recordBookResult(id: string, correct: number, total: number, wrong: string[], owner = progressOwner()): boolean {
  if (!total || correct < 0 || correct > total) return false;
  return saveBookProgress(current => ({ ...current, chapters: { ...current.chapters,
    [id]: { ...current.chapters[id], best: Math.max(current.chapters[id]?.best || 0, correct / total),
      latest: correct / total, wrong } } }), owner);
}
export function recordPracticeResult(id: string, setId: string, correct: number, total: number, wrong: string[], owner = progressOwner()): boolean {
  if (!/^en-(0[1-9]|1[0-9]|2[0-4])$/.test(id) || ![`${id}-practice`, `${id}-mixed`].includes(setId)
    || !Number.isInteger(total) || !Number.isInteger(correct) || total <= 0 || correct < 0 || correct > total) return false;
  return saveBookProgress(current => {
    const chapter = current.chapters[id] || {};
    const previous = chapter.practice?.[setId];
    return { ...current, chapters: { ...current.chapters, [id]: { ...chapter, practice: { ...chapter.practice,
      [setId]: { best: Math.max(previous?.best || 0, correct / total), latest: correct / total,
        wrong: wrong.filter(q => q.startsWith(`${setId}-q`)).slice(0, 100) } } } } };
  }, owner);
}
export const chapterMistakes = (chapter?: ChapterProgress) => (chapter?.wrong?.length || 0)
  + Object.values(chapter?.practice || {}).reduce((sum, result) => sum + (result.wrong?.length || 0), 0);
export const chapterPassed = (value?: ChapterProgress) => (value?.best || 0) >= BOOK_PASS_RATIO;
export function useBookProgress() {
  const [owner, setOwner] = useState(progressOwner);
  const [progress, setProgress] = useState(() => readBookProgress(owner));
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    const refresh = () => { const next = progressOwner(); setOwner(next); setProgress(readBookProgress(next)); };
    window.addEventListener(EVENT, refresh);
    window.addEventListener(PROGRESS_OWNER_EVENT, refresh);
    window.addEventListener('storage', refresh);
    refresh();
    return () => { window.removeEventListener(EVENT, refresh); window.removeEventListener(PROGRESS_OWNER_EVENT, refresh); window.removeEventListener('storage', refresh); };
  }, []);
  const update = useCallback((fn: (current: BookProgress) => BookProgress) => {
    const saved = saveBookProgress(fn, owner); setStorageError(!saved); return saved;
  }, [owner]);
  return { owner, progress, update, storageError, setStorageError };
}
