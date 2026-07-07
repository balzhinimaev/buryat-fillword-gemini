import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildExamQuiz,
  buildQuiz,
  buildReviewQuiz,
  EXAM_SLUG,
  getExamBest,
  isExamPassed,
  courseProgress,
  getMistakeWords,
  getQuizBest,
  getTextbook,
  getUnitStatuses,
  isTheoryRead,
  markTheoryRead,
  recordQuizAnswer,
  saveQuizResult,
  weeklyPrompt,
} from './textbook';

describe('weeklyPrompt', () => {
  it('returns null for empty or missing prompts', () => {
    expect(weeklyPrompt(undefined)).toBeNull();
    expect(weeklyPrompt([])).toBeNull();
  });
  it('returns a prompt from the list and is stable within a call', () => {
    const prompts = ['a', 'b', 'c'];
    const p = weeklyPrompt(prompts);
    expect(prompts).toContain(p);
    expect(weeklyPrompt(prompts)).toBe(p);
  });
  it('every textbook unit with prompts yields a non-null weekly prompt', () => {
    for (const u of getTextbook().units) {
      if (u.prompts && u.prompts.length > 0) {
        expect(weeklyPrompt(u.prompts)).not.toBeNull();
      }
    }
  });
});

describe('textbook', () => {
  beforeEach(() => localStorage.clear());

  it('контент: 15 юнитов, у каждого есть лексика и цель', () => {
    const book = getTextbook();
    expect(book.units.length).toBe(15);
    for (const u of book.units) {
      expect(u.slug).toBeTruthy();
      expect(u.goal).toBeTruthy();
      expect(u.vocab.length).toBeGreaterThan(0);
    }
  });

  it('practiceSlugs юнитов ссылаются на известные уроки кампаний', () => {
    const re = /^(chapter2-square-\d+x\d+|nature-\d+|home-\d+|colors-\d+|time-\d+|verbs-\d+|food-\d+|clothing-\d+|body-\d+|weather-\d+)$/;
    for (const u of getTextbook().units) {
      for (const s of u.practiceSlugs) expect(s).toMatch(re);
    }
  });

  it('теория: отметка читается и снимается', () => {
    expect(isTheoryRead('family')).toBe(false);
    markTheoryRead('family');
    expect(isTheoryRead('family')).toBe(true);
    markTheoryRead('family', false);
    expect(isTheoryRead('family')).toBe(false);
  });

  it('юнит пройден = теория + ≥1★ практики + квиз', () => {
    const unit = getTextbook().units.find((u) => u.practiceSlugs.length > 0)!;
    const find = (m: Record<string, number>) =>
      getUnitStatuses(m).find((s) => s.unit.slug === unit.slug)!;
    expect(find({}).completed).toBe(false);

    markTheoryRead(unit.slug);
    expect(find({ [unit.practiceSlugs[0]]: 2 }).completed).toBe(false); // квиза нет

    saveQuizResult(unit.slug, 8, 8);
    const st = find({ [unit.practiceSlugs[0]]: 2 });
    expect(st.practiceStars).toBe(2);
    expect(st.quizPassed).toBe(true);
    expect(st.completed).toBe(true);
  });

  it('юнит без практики: теория + квиз', () => {
    const theoryOnly = getTextbook().units.find((u) => u.practiceSlugs.length === 0);
    expect(theoryOnly).toBeTruthy();
    markTheoryRead(theoryOnly!.slug);
    saveQuizResult(theoryOnly!.slug, 6, 8);
    const st = getUnitStatuses({}).find((s) => s.unit.slug === theoryOnly!.slug)!;
    expect(st.completed).toBe(true); // 6/8 = 75%
  });

  it('квиз: провал не засчитывается, лучший результат не ухудшается', () => {
    saveQuizResult('family', 3, 8);
    let st = getUnitStatuses({}).find((s) => s.unit.slug === 'family')!;
    expect(st.quizPassed).toBe(false);
    expect(getQuizBest('family')).toEqual({ correct: 3, total: 8 });

    saveQuizResult('family', 7, 8);
    st = getUnitStatuses({}).find((s) => s.unit.slug === 'family')!;
    expect(st.quizPassed).toBe(true);

    saveQuizResult('family', 2, 8); // хуже — best остаётся
    expect(getQuizBest('family')).toEqual({ correct: 7, total: 8 });
    expect(getUnitStatuses({}).find((s) => s.unit.slug === 'family')!.quizPassed).toBe(true);
  });

  it('buildQuiz: 4 уникальных варианта, правильный на месте, направления чередуются', () => {
    const unit = getTextbook().units.find((u) => u.vocab.length >= 8)!;
    const quiz = buildQuiz(unit);
    expect(quiz.length).toBe(8);
    for (const q of quiz) {
      expect(q.options.length).toBe(4);
      expect(new Set(q.options.map((o) => o.bur)).size).toBe(4);
      expect(new Set(q.options.map((o) => o.ru)).size).toBe(4);
      expect(q.options[q.correctIndex].bur).toBe(q.word.bur);
    }
    expect(quiz[0].type).toBe('bur2tr');
    expect(quiz[1].type).toBe('tr2bur');
  });

  it('ошибки: копятся, закрываются двумя верными подряд', () => {
    recordQuizAnswer('НОМ', false);
    recordQuizAnswer('ГАР', false);
    expect(getMistakeWords().map((w) => w.bur)).toContain('НОМ');
    expect(getMistakeWords().length).toBe(2);

    recordQuizAnswer('НОМ', true);
    expect(getMistakeWords().map((w) => w.bur)).toContain('НОМ'); // 1 верный — мало
    recordQuizAnswer('НОМ', true);
    expect(getMistakeWords().map((w) => w.bur)).not.toContain('НОМ'); // 2 подряд — закрыто

    // ошибка сбрасывает серию
    recordQuizAnswer('ГАР', true);
    recordQuizAnswer('ГАР', false);
    recordQuizAnswer('ГАР', true);
    expect(getMistakeWords().map((w) => w.bur)).toContain('ГАР');
  });

  it('верный ответ по слову без ошибок ничего не создаёт', () => {
    recordQuizAnswer('САЙ', true);
    expect(getMistakeWords().length).toBe(0);
  });

  it('buildQuiz ставит слова с ошибками в приоритет', () => {
    const unit = getTextbook().units.find((u) => u.vocab.length > 8)!;
    const target = unit.vocab[unit.vocab.length - 1]; // слово, которое иначе может не попасть
    recordQuizAnswer(target.bur, false);
    for (let t = 0; t < 5; t++) {
      const quiz = buildQuiz(unit);
      expect(quiz.map((q) => q.word.bur)).toContain(target.bur);
    }
  });

  it('buildReviewQuiz строится из слов с ошибками', () => {
    expect(buildReviewQuiz().length).toBe(0);
    recordQuizAnswer('НОМ', false);
    recordQuizAnswer('ГАР', false);
    recordQuizAnswer('УҺАН', false);
    const quiz = buildReviewQuiz();
    expect(quiz.length).toBe(3);
    expect(new Set(quiz.map((q) => q.word.bur))).toEqual(new Set(['НОМ', 'ГАР', 'УҺАН']));
    for (const q of quiz) expect(q.options.length).toBe(4);
  });

  it('урок алфавита содержит таблицу букв с ү/ө/һ', () => {
    const alpha = getTextbook().units.find((u) => u.slug === 'alphabet')!;
    expect(alpha.letters?.length).toBeGreaterThanOrEqual(3);
    const letters = alpha.letters!.map((l) => l.letter).join(' ');
    for (const ch of ['Ү', 'Ө', 'Һ']) expect(letters).toContain(ch);
  });

  it('экзамен: 16 вопросов, покрывает лексику курса, результат сохраняется', () => {
    const exam = buildExamQuiz();
    expect(exam.length).toBe(16);
    expect(new Set(exam.map((q) => q.word.bur)).size).toBe(16);
    for (const q of exam) expect(q.options.length).toBe(4);

    expect(isExamPassed()).toBe(false);
    saveQuizResult(EXAM_SLUG, 10, 16); // 62% — не сдан
    expect(isExamPassed()).toBe(false);
    saveQuizResult(EXAM_SLUG, 13, 16); // 81% — сдан
    expect(isExamPassed()).toBe(true);
    expect(getExamBest()).toEqual({ correct: 13, total: 16 });
  });

  it('экзамен не влияет на статусы юнитов', () => {
    saveQuizResult(EXAM_SLUG, 16, 16);
    const statuses = getUnitStatuses({});
    expect(statuses.length).toBe(15);
    expect(statuses.every((s) => !s.completed)).toBe(true);
  });

  it('озвучка покрывает всю лексику урока алфавита и примеры букв', async () => {
    const manifest = (await import('../data/burAudio.json')).default as Record<string, string>;
    const alpha = getTextbook().units.find((u) => u.slug === 'alphabet')!;
    for (const w of alpha.vocab) expect(manifest[w.bur], w.bur).toBeTruthy();
    for (const l of alpha.letters!) {
      const exBur = l.example.split(' — ')[0].trim();
      expect(manifest[exBur], exBur).toBeTruthy();
    }
  });

  it('прогресс курса считается', () => {
    const statuses = getUnitStatuses({});
    expect(courseProgress(statuses)).toEqual({ done: 0, total: 15 });
  });
});
