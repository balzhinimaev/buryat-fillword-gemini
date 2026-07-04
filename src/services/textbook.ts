// Учебник бурятского: контент из вшитого textbook.json + прогресс в localStorage.
// Юнит «пройден», когда теория отмечена изученной И хотя бы один урок практики
// сыгран на ≥1★ (звёзды берём из прогресса кампаний).
import bundled from '../data/textbook.json';
import { getCampaignOverview } from './api';

export interface TextbookWord {
  bur: string;
  ru: string;
  en?: string | null;
}

export interface TextbookPhrase {
  bur: string;
  ru: string;
}

export interface TextbookUnit {
  slug: string;
  title: string;
  goal: string;
  intro: string;
  vocab: TextbookWord[];
  phrases: TextbookPhrase[];
  grammar: { title: string; text: string } | null;
  tip: string;
  practiceSlugs: string[];
}

export interface TextbookData {
  version: number;
  title: string;
  units: TextbookUnit[];
}

const PROGRESS_KEY = 'burlive_textbook_progress';

interface UnitProgress {
  theoryReadAt?: string;
}

type ProgressMap = Record<string, UnitProgress>;

export function getTextbook(): TextbookData {
  return bundled as TextbookData;
}

function loadProgress(): ProgressMap {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    const parsed = raw ? (JSON.parse(raw) as ProgressMap) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveProgress(map: ProgressMap): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(map));
  } catch {
    /* приватный режим */
  }
}

export function isTheoryRead(slug: string): boolean {
  return !!loadProgress()[slug]?.theoryReadAt;
}

export function markTheoryRead(slug: string, read = true): void {
  const map = loadProgress();
  if (read) {
    map[slug] = { ...map[slug], theoryReadAt: new Date().toISOString() };
  } else {
    delete map[slug];
  }
  saveProgress(map);
}

export interface UnitStatus {
  unit: TextbookUnit;
  theoryRead: boolean;
  /** максимум звёзд среди уроков практики юнита */
  practiceStars: number;
  practiceDone: boolean;
  completed: boolean;
}

/**
 * Статусы юнитов. starsBySlug — звёзды уроков кампаний (slug → stars),
 * собирает вызывающая сторона из overview (онлайн и офлайн формы одинаковы).
 */
export function getUnitStatuses(starsBySlug: Record<string, number>): UnitStatus[] {
  return getTextbook().units.map((unit) => {
    const theoryRead = isTheoryRead(unit.slug);
    const practiceStars = unit.practiceSlugs.length
      ? Math.max(0, ...unit.practiceSlugs.map((s) => starsBySlug[s] ?? 0))
      : 0;
    const practiceDone = unit.practiceSlugs.length === 0 || practiceStars > 0;
    return { unit, theoryRead, practiceStars, practiceDone, completed: theoryRead && practiceDone };
  });
}

export function courseProgress(statuses: UnitStatus[]): { done: number; total: number } {
  return { done: statuses.filter((s) => s.completed).length, total: statuses.length };
}

export interface PracticeLessonInfo {
  stars: number;
  name?: string;
}

/**
 * Звёзды и названия уроков практики из overview кампаний
 * (запрос перехватывается офлайн-движком, форма одинаковая).
 */
export async function fetchPracticeLessons(): Promise<Record<string, PracticeLessonInfo>> {
  const out: Record<string, PracticeLessonInfo> = {};
  try {
    const overview = await getCampaignOverview();
    const modules = overview.modules ?? [];
    for (const m of modules) {
      for (const lvl of m.levels ?? []) {
        out[lvl.slug] = { stars: lvl.earnedStars ?? 0, name: lvl.name };
      }
    }
    for (const cat of overview.categories ?? []) {
      for (const lvl of (cat as { levels?: Array<{ slug: string; earnedStars?: number; name?: string }> }).levels ?? []) {
        out[lvl.slug] = { stars: lvl.earnedStars ?? 0, name: lvl.name };
      }
    }
  } catch {
    /* без сети и кэша покажем нули */
  }
  return out;
}
