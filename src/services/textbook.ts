// Учебник бурятского: контент из вшитого textbook.json + прогресс в localStorage.
// Юнит «пройден», когда теория отмечена изученной И хотя бы один урок практики
// сыгран на ≥1★ (звёзды берём из прогресса кампаний).
import bundled from '../data/textbook.json';
import { getCampaignOverview, completeTextbookLesson } from './api';

export interface TextbookWord {
  bur: string;
  ru: string;
  en?: string | null;
}

export interface TextbookPhrase {
  bur: string;
  ru: string;
}

export interface TextbookLetter {
  letter: string;
  sound: string;
  example: string;
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
  /** культурно-исторические секции (глава «О Бурятии») */
  sections?: Array<{ title: string; text: string }>;
  /** таблица букв/явлений произношения (урок алфавита) */
  letters?: TextbookLetter[];
}

export interface TextbookData {
  version: number;
  title: string;
  units: TextbookUnit[];
}

const PROGRESS_KEY = 'burlive_textbook_progress';

/** доля правильных ответов, с которой квиз считается пройденным */
export const QUIZ_PASS_RATIO = 0.75;

interface UnitProgress {
  theoryReadAt?: string;
  /** лучший результат квиза, например "7/8" числами */
  quizBest?: { correct: number; total: number };
  quizPassedAt?: string;
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
    map[slug] = { ...map[slug], theoryReadAt: undefined };
  }
  saveProgress(map);
}

export function getQuizBest(slug: string): { correct: number; total: number } | null {
  return loadProgress()[slug]?.quizBest ?? null;
}

/** сохраняет результат квиза; лучший результат не ухудшается */
export function saveQuizResult(slug: string, correct: number, total: number): void {
  const map = loadProgress();
  const prev = map[slug]?.quizBest;
  const better = !prev || correct / total > prev.correct / prev.total;
  const passedNow =
    !map[slug]?.quizPassedAt && correct / total >= QUIZ_PASS_RATIO;
  map[slug] = {
    ...map[slug],
    quizBest: better ? { correct, total } : prev,
    quizPassedAt:
      map[slug]?.quizPassedAt ??
      (correct / total >= QUIZ_PASS_RATIO ? new Date().toISOString() : undefined),
  };
  saveProgress(map);

  // Первая сдача — фиксируем веху на сервере (XP за квиз/экзамен).
  // Fire-and-forget: офлайн/гость не ломают сохранение локального прогресса;
  // сервер идемпотентен — повторная отправка XP не задвоит.
  if (passedNow) {
    void completeTextbookLesson(slug, 'quiz')?.catch?.(() => {});
  }
}

// ---------- работа над ошибками ----------

const MISTAKES_KEY = 'burlive_textbook_mistakes';

interface MistakeEntry {
  misses: number;
  /** верных ответов подряд после последней ошибки */
  streak: number;
  lastMissAt: string;
}

type MistakesMap = Record<string, MistakeEntry>;

function loadMistakes(): MistakesMap {
  try {
    const raw = localStorage.getItem(MISTAKES_KEY);
    const parsed = raw ? (JSON.parse(raw) as MistakesMap) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveMistakes(map: MistakesMap): void {
  try {
    localStorage.setItem(MISTAKES_KEY, JSON.stringify(map));
  } catch {
    /* приватный режим */
  }
}

/** два верных ответа подряд «закрывают» слово — оно уходит из повторения */
export const MISTAKE_CLEAR_STREAK = 2;

export function recordQuizAnswer(bur: string, correct: boolean): void {
  const map = loadMistakes();
  const e = map[bur];
  if (correct) {
    if (!e) return;
    e.streak += 1;
    if (e.streak >= MISTAKE_CLEAR_STREAK) delete map[bur];
  } else {
    map[bur] = {
      misses: (e?.misses ?? 0) + 1,
      streak: 0,
      lastMissAt: new Date().toISOString(),
    };
  }
  saveMistakes(map);
}

/** слова курса, ожидающие повторения (были ошибки, ещё не закрыты) */
export function getMistakeWords(): TextbookWord[] {
  const map = loadMistakes();
  const out: TextbookWord[] = [];
  const seen = new Set<string>();
  for (const u of getTextbook().units) {
    for (const w of u.vocab) {
      if (map[w.bur] && !seen.has(w.bur)) {
        seen.add(w.bur);
        out.push(w);
      }
    }
  }
  // самые «проблемные» — первыми
  return out.sort((a, b) => (map[b.bur]?.misses ?? 0) - (map[a.bur]?.misses ?? 0));
}

// ---------- квиз: генерируется из лексики, без ИИ ----------

export interface QuizQuestion {
  /** 'bur2tr' — показываем бурятское слово, варианты-переводы; 'tr2bur' — наоборот */
  type: 'bur2tr' | 'tr2bur';
  word: TextbookWord;
  /** варианты: слова целиком, показ стороны зависит от type */
  options: TextbookWord[];
  correctIndex: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function allCourseWords(): TextbookWord[] {
  const pool: TextbookWord[] = [];
  const seenBur = new Set<string>();
  for (const u of getTextbook().units) {
    for (const w of u.vocab) {
      if (!seenBur.has(w.bur)) {
        seenBur.add(w.bur);
        pool.push(w);
      }
    }
  }
  return pool;
}

function makeQuestions(words: TextbookWord[], pool: TextbookWord[]): QuizQuestion[] {
  return words.map((word, qi) => {
    const distractors = shuffle(
      pool.filter((w) => w.bur !== word.bur && w.ru !== word.ru),
    ).slice(0, 3);
    const options = shuffle([word, ...distractors]);
    return {
      type: qi % 2 === 0 ? 'bur2tr' : 'tr2bur',
      word,
      options,
      correctIndex: options.findIndex((w) => w.bur === word.bur),
    } as QuizQuestion;
  });
}

/**
 * Квиз урока: до questionCount вопросов по лексике юнита, направления чередуются.
 * Слова с прошлыми ошибками попадают в квиз в первую очередь.
 * Дистракторы — из лексики всего курса (уникальные и по bur, и по ru).
 */
export function buildQuiz(unit: TextbookUnit, questionCount = 8): QuizQuestion[] {
  const mistakes = loadMistakes();
  const withMistakes = shuffle(unit.vocab.filter((w) => mistakes[w.bur]));
  const rest = shuffle(unit.vocab.filter((w) => !mistakes[w.bur]));
  const questions = [...withMistakes, ...rest].slice(0, questionCount);
  return makeQuestions(shuffle(questions), allCourseWords());
}

/** квиз «работа над ошибками»: слова с ошибками со всего курса */
export function buildReviewQuiz(questionCount = 8): QuizQuestion[] {
  const words = getMistakeWords().slice(0, questionCount);
  return makeQuestions(shuffle(words), allCourseWords());
}

// ---------- экзамен курса ----------

/** служебный slug для результата экзамена в том же progress-хранилище */
export const EXAM_SLUG = '__exam';

/** финальный экзамен: вопросы по лексике всего курса, по слову из каждого юнита + добор */
export function buildExamQuiz(questionCount = 16): QuizQuestion[] {
  const units = getTextbook().units;
  const picked: TextbookWord[] = [];
  const seen = new Set<string>();
  // по одному случайному слову из каждого урока — покрытие всего курса
  for (const u of units) {
    const w = shuffle(u.vocab)[0];
    if (w && !seen.has(w.bur)) {
      seen.add(w.bur);
      picked.push(w);
    }
  }
  // добор до questionCount из общего пула
  for (const w of shuffle(allCourseWords())) {
    if (picked.length >= questionCount) break;
    if (!seen.has(w.bur)) {
      seen.add(w.bur);
      picked.push(w);
    }
  }
  return makeQuestions(shuffle(picked).slice(0, questionCount), allCourseWords());
}

export function getExamBest(): { correct: number; total: number } | null {
  return getQuizBest(EXAM_SLUG);
}

export function isExamPassed(): boolean {
  return !!loadProgress()[EXAM_SLUG]?.quizPassedAt;
}

export interface UnitStatus {
  unit: TextbookUnit;
  theoryRead: boolean;
  /** максимум звёзд среди уроков практики юнита */
  practiceStars: number;
  practiceDone: boolean;
  quizBest: { correct: number; total: number } | null;
  quizPassed: boolean;
  completed: boolean;
}

/**
 * Статусы юнитов. starsBySlug — звёзды уроков кампаний (slug → stars),
 * собирает вызывающая сторона из overview (онлайн и офлайн формы одинаковы).
 */
export function getUnitStatuses(starsBySlug: Record<string, number>): UnitStatus[] {
  const progress = loadProgress();
  return getTextbook().units.map((unit) => {
    const p = progress[unit.slug];
    const theoryRead = !!p?.theoryReadAt;
    const practiceStars = unit.practiceSlugs.length
      ? Math.max(0, ...unit.practiceSlugs.map((s) => starsBySlug[s] ?? 0))
      : 0;
    const practiceDone = unit.practiceSlugs.length === 0 || practiceStars > 0;
    const quizBest = p?.quizBest ?? null;
    const quizPassed = !!p?.quizPassedAt;
    return {
      unit,
      theoryRead,
      practiceStars,
      practiceDone,
      quizBest,
      quizPassed,
      completed: theoryRead && practiceDone && quizPassed,
    };
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
