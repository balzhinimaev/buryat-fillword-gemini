import { describe, it, expect, beforeEach } from 'vitest';
import { chooseCourse } from '../courses/progress';
import { getGameLang, setGameLang, hintOf } from './gameLang';

describe('gameLang / hintOf', () => {
  beforeEach(() => {
    localStorage.clear(); chooseCourse('bua-ru');
    setGameLang('ru');
  });

  it('по умолчанию русский', () => {
    expect(getGameLang()).toBe('ru');
    expect(hintOf({ ru: 'Книга', translations: { en: 'Book' } })).toBe('Книга');
  });

  it('en: берёт перевод из translations', () => {
    setGameLang('en');
    expect(getGameLang()).toBe('en');
    expect(hintOf({ ru: 'Книга', translations: { en: 'Book' } })).toBe('Book');
  });

  it('en без перевода: fallback на ru', () => {
    setGameLang('en');
    expect(hintOf({ ru: 'Книга' })).toBe('Книга');
    expect(hintOf({ ru: 'Книга', translations: {} })).toBe('Книга');
  });

  it('keeps starter-course explanations Russian without erasing the original Buryat hint preference', () => {
    setGameLang('en'); chooseCourse('en-ru');
    expect(getGameLang()).toBe('ru');
    expect(hintOf({ ru: 'Книга', translations: { en: 'Book' } })).toBe('Книга');
    chooseCourse('bua-ru'); expect(getGameLang()).toBe('en');
  });

  it('мусор в хранилище не влияет на текущее значение', () => {
    setGameLang('ru');
    localStorage.setItem('burlive_game_lang', 'xx');
    // язык живёт в памяти модуля; сторонняя запись в storage его не меняет
    expect(getGameLang()).toBe('ru');
    expect(hintOf({ ru: 'Книга', translations: { en: 'Book' } })).toBe('Книга');
  });
});
