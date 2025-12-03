// src/store/contributionStore.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { 
  ContributedWord, 
  Contributor, 
  ContributionState,
  ContributionStats 
} from '../types';

const STORAGE_KEY = 'buryat_word_contributions';
const CONTRIBUTOR_KEY = 'buryat_contributor';

// Генерация уникального ID
const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Дефолтное состояние
const defaultState: ContributionState = {
  words: [],
  contributors: [],
  currentContributor: null,
};

// Загрузка состояния из localStorage
const loadState = (): ContributionState => {
  try {
    const savedWords = localStorage.getItem(STORAGE_KEY);
    const savedContributor = localStorage.getItem(CONTRIBUTOR_KEY);
    
    const state: ContributionState = { ...defaultState };
    
    if (savedWords) {
      const parsed = JSON.parse(savedWords);
      state.words = parsed.words || [];
      state.contributors = parsed.contributors || [];
    }
    
    if (savedContributor) {
      state.currentContributor = JSON.parse(savedContributor);
    }
    
    return state;
  } catch (e) {
    console.error('Failed to load contribution state:', e);
    return defaultState;
  }
};

// Сохранение состояния
const saveState = (state: ContributionState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      words: state.words,
      contributors: state.contributors,
    }));
    
    if (state.currentContributor) {
      localStorage.setItem(CONTRIBUTOR_KEY, JSON.stringify(state.currentContributor));
    }
  } catch (e) {
    console.error('Failed to save contribution state:', e);
  }
};

// Минимум подтверждений для верификации слова
const MIN_VERIFICATIONS = 3;

// Хук для управления контрибуциями
export const useContributionStore = () => {
  const [state, setState] = useState<ContributionState>(loadState);

  // Сохраняем при каждом изменении
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Регистрация/обновление контрибьютора
  const setContributor = useCallback((name: string, telegram?: string) => {
    setState(prev => {
      const existingContributor = prev.contributors.find(
        c => c.name.toLowerCase() === name.toLowerCase()
      );
      
      const now = new Date().toISOString();
      
      if (existingContributor) {
        // Обновляем существующего
        const updated: Contributor = {
          ...existingContributor,
          telegram: telegram || existingContributor.telegram,
          lastActiveAt: now,
        };
        
        return {
          ...prev,
          currentContributor: updated,
          contributors: prev.contributors.map(c => 
            c.id === existingContributor.id ? updated : c
          ),
        };
      } else {
        // Создаём нового
        const newContributor: Contributor = {
          id: generateId(),
          name,
          telegram,
          wordsAdded: 0,
          wordsVerified: 0,
          wordsApproved: 0,
          joinedAt: now,
          lastActiveAt: now,
        };
        
        return {
          ...prev,
          currentContributor: newContributor,
          contributors: [...prev.contributors, newContributor],
        };
      }
    });
  }, []);

  // Выход из аккаунта контрибьютора
  const logoutContributor = useCallback(() => {
    setState(prev => ({ ...prev, currentContributor: null }));
    localStorage.removeItem(CONTRIBUTOR_KEY);
  }, []);

  // Добавление нового слова
  const addWord = useCallback((
    bur: string,
    ru: string,
    categoryId: string,
    example?: string
  ) => {
    if (!state.currentContributor) return null;

    const newWord: ContributedWord = {
      id: generateId(),
      bur: bur.toUpperCase().trim(),
      ru: ru.trim(),
      categoryId,
      example: example?.trim(),
      contributor: {
        name: state.currentContributor.name,
        telegram: state.currentContributor.telegram,
      },
      createdAt: new Date().toISOString(),
      status: 'pending',
      verifications: [],
      flags: [],
    };

    setState(prev => {
      // Обновляем счётчик контрибьютора
      const updatedContributors = prev.contributors.map(c => 
        c.id === prev.currentContributor?.id 
          ? { ...c, wordsAdded: c.wordsAdded + 1, lastActiveAt: new Date().toISOString() }
          : c
      );
      
      const updatedCurrentContributor = prev.currentContributor 
        ? { ...prev.currentContributor, wordsAdded: prev.currentContributor.wordsAdded + 1 }
        : null;

      return {
        ...prev,
        words: [...prev.words, newWord],
        contributors: updatedContributors,
        currentContributor: updatedCurrentContributor,
      };
    });

    return newWord;
  }, [state.currentContributor]);

  // Верификация слова (подтверждение)
  const verifyWord = useCallback((wordId: string) => {
    if (!state.currentContributor) return;

    setState(prev => {
      const word = prev.words.find(w => w.id === wordId);
      if (!word || word.verifications.includes(prev.currentContributor!.id)) {
        return prev; // Уже верифицировал или слово не найдено
      }

      const newVerifications = [...word.verifications, prev.currentContributor!.id];
      const isNowVerified = newVerifications.length >= MIN_VERIFICATIONS;

      const updatedWord: ContributedWord = {
        ...word,
        verifications: newVerifications,
        status: isNowVerified ? 'verified' : word.status,
      };

      // Обновляем статистику контрибьютора
      const updatedContributors = prev.contributors.map(c => {
        if (c.id === prev.currentContributor?.id) {
          return { ...c, wordsVerified: c.wordsVerified + 1 };
        }
        // Если слово стало верифицированным, обновляем автора
        if (isNowVerified && c.name === word.contributor.name) {
          return { ...c, wordsApproved: c.wordsApproved + 1 };
        }
        return c;
      });

      return {
        ...prev,
        words: prev.words.map(w => w.id === wordId ? updatedWord : w),
        contributors: updatedContributors,
      };
    });
  }, [state.currentContributor]);

  // Флаг слова (отметка как неправильное)
  const flagWord = useCallback((wordId: string) => {
    if (!state.currentContributor) return;

    setState(prev => {
      const word = prev.words.find(w => w.id === wordId);
      if (!word || word.flags.includes(prev.currentContributor!.id)) {
        return prev; // Уже флагнул или слово не найдено
      }

      const newFlags = [...word.flags, prev.currentContributor!.id];
      // Если 3+ флагов - отклоняем слово
      const isNowRejected = newFlags.length >= 3;

      const updatedWord: ContributedWord = {
        ...word,
        flags: newFlags,
        status: isNowRejected ? 'rejected' : word.status,
      };

      return {
        ...prev,
        words: prev.words.map(w => w.id === wordId ? updatedWord : w),
      };
    });
  }, [state.currentContributor]);

  // Экспорт верифицированных слов в формате для игры
  const exportVerifiedWords = useCallback(() => {
    const verifiedWords = state.words.filter(w => w.status === 'verified');
    
    // Группируем по категориям
    const byCategory: Record<string, { bur: string; ru: string }[]> = {};
    
    verifiedWords.forEach(word => {
      if (!byCategory[word.categoryId]) {
        byCategory[word.categoryId] = [];
      }
      byCategory[word.categoryId].push({
        bur: word.bur,
        ru: word.ru,
      });
    });

    return {
      exportedAt: new Date().toISOString(),
      totalWords: verifiedWords.length,
      byCategory,
      raw: verifiedWords,
    };
  }, [state.words]);

  // Экспорт всех данных (для бэкапа)
  const exportAllData = useCallback(() => {
    return {
      exportedAt: new Date().toISOString(),
      words: state.words,
      contributors: state.contributors,
    };
  }, [state.words, state.contributors]);

  // Импорт данных
  const importData = useCallback((data: { words?: ContributedWord[]; contributors?: Contributor[] }) => {
    setState(prev => ({
      ...prev,
      words: data.words ? [...prev.words, ...data.words] : prev.words,
      contributors: data.contributors ? [...prev.contributors, ...data.contributors] : prev.contributors,
    }));
  }, []);

  // Статистика
  const stats = useMemo((): ContributionStats => {
    const totalWords = state.words.length;
    const pendingWords = state.words.filter(w => w.status === 'pending').length;
    const verifiedWords = state.words.filter(w => w.status === 'verified').length;
    const rejectedWords = state.words.filter(w => w.status === 'rejected').length;

    // Топ контрибьюторов по добавленным словам
    const topContributors = [...state.contributors]
      .sort((a, b) => b.wordsAdded - a.wordsAdded)
      .slice(0, 10)
      .map(c => ({ name: c.name, count: c.wordsAdded }));

    return {
      totalWords,
      pendingWords,
      verifiedWords,
      rejectedWords,
      topContributors,
    };
  }, [state.words, state.contributors]);

  // Получение слов для верификации (исключая свои)
  const getWordsForVerification = useMemo(() => {
    if (!state.currentContributor) return [];
    
    return state.words.filter(w => 
      w.status === 'pending' && 
      w.contributor.name !== state.currentContributor?.name &&
      !w.verifications.includes(state.currentContributor?.id || '') &&
      !w.flags.includes(state.currentContributor?.id || '')
    );
  }, [state.words, state.currentContributor]);

  // Проверка дубликата
  const isDuplicate = useCallback((bur: string) => {
    const normalized = bur.toUpperCase().trim();
    return state.words.some(w => w.bur === normalized);
  }, [state.words]);

  return {
    state,
    currentContributor: state.currentContributor,
    setContributor,
    logoutContributor,
    addWord,
    verifyWord,
    flagWord,
    exportVerifiedWords,
    exportAllData,
    importData,
    stats,
    getWordsForVerification,
    isDuplicate,
  };
};

export type ContributionStore = ReturnType<typeof useContributionStore>;

