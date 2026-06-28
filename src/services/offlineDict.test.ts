import { beforeEach, describe, expect, it } from 'vitest';
import {
  getAllWords,
  offlineGetWords,
  offlineGetWordDetail,
  offlineGetCategories,
  offlineWordsStats,
} from './offlineDict';

beforeEach(() => {
  localStorage.clear();
});

describe('getAllWords', () => {
  it('содержит вшитый словарь (>=500 слов) без дублей по bur+ru', () => {
    const all = getAllWords();
    expect(all.length).toBeGreaterThanOrEqual(500);
    const keys = new Set(all.map((w) => `${w.bur.toUpperCase()}|${w.ru.toLowerCase()}`));
    expect(keys.size).toBe(all.length); // нет дублей
    all.forEach((w) => {
      expect(w.bur.length).toBeGreaterThan(0);
      expect(w.ru.length).toBeGreaterThan(0);
    });
  });
});

describe('offlineGetWords (пагинация)', () => {
  it('первая страница отдаёт ВЕСЬ словарь, total корректен', () => {
    const all = getAllWords();
    const res = offlineGetWords({ offset: 0, limit: 20 });
    expect(res.total).toBe(all.length);
    expect(res.words.length).toBe(all.length); // офлайн отдаёт всё сразу (для поиска по всем)
    expect(res.words[0]._id).toBeTruthy();
    expect(res.words[0].status).toBe('verified');
  });

  it('последующие страницы (offset>0) пустые', () => {
    const res = offlineGetWords({ offset: 100 });
    expect(res.words.length).toBe(0);
    expect(res.total).toBe(getAllWords().length);
  });
});

describe('offlineGetWordDetail', () => {
  it('возвращает слово по _id из списка', () => {
    const first = offlineGetWords({ offset: 0 }).words[0];
    const detail = offlineGetWordDetail(first._id);
    expect(detail.word._id).toBe(first._id);
    expect(detail.word.bur).toBe(first.bur);
  });
});

describe('offlineGetCategories / offlineWordsStats', () => {
  it('категорий офлайн нет (общий список)', () => {
    expect(offlineGetCategories()).toEqual([]);
  });
  it('статистика: всё verified и активно', () => {
    const total = getAllWords().length;
    const s = offlineWordsStats();
    expect(s.total).toBe(total);
    expect(s.verified).toBe(total);
    expect(s.activeInGame).toBe(total);
    expect(s.pending).toBe(0);
  });
});
