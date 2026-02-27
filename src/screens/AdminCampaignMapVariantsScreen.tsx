import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Loader2, Plus, RotateCcw, Save, Sparkles, Trash2 } from 'lucide-react';
import { cn } from '../components/ui';
import { StickyHeader } from '../components/StickyHeader';
import { useTheme } from '../theme/ThemeContext';
import { useBackButton } from '../hooks/useTelegram';
import type { GameStore } from '../store/gameStore';
import {
  api,
  type ApiError,
  type CampaignAdminLevel,
  type CampaignMapVariantAdmin,
} from '../services/api';

interface AdminCampaignMapVariantsScreenProps {
  store: GameStore;
}

type Coord = { r: number; c: number };

interface LessonWord {
  bur: string;
  ru: string;
}

const WORD_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f59e0b', '#ef4444', '#6366f1'];
const NOISE_ALPHABET = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯӨҮҺ';

const toErrorMessage = (error: unknown): string => {
  const apiError = error as Partial<ApiError>;
  if (Array.isArray(apiError.message)) return apiError.message.join(', ');
  if (typeof apiError.message === 'string' && apiError.message.length > 0) return apiError.message;
  if (error instanceof Error && error.message) return error.message;
  return 'Произошла ошибка';
};

const createEmptyGrid = (size: number): string[][] =>
  Array.from({ length: size }, () => Array(size).fill(''));

const toKey = (v: string) => String(v || '').trim().toUpperCase();

export const AdminCampaignMapVariantsScreen: React.FC<AdminCampaignMapVariantsScreenProps> = ({ store }) => {
  const { goBack, state } = store;
  const lessonSlug = state.adminCampaignMapLessonSlug;
  const { isDark, theme } = useTheme();

  useBackButton(() => goBack());

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lesson, setLesson] = useState<CampaignAdminLevel | null>(null);
  const [lessonWords, setLessonWords] = useState<LessonWord[]>([]);
  const [variants, setVariants] = useState<CampaignMapVariantAdmin[]>([]);

  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [difficultyLevel, setDifficultyLevel] = useState<1 | 2 | 3>(2);
  const [gridSize, setGridSize] = useState(6);
  const [isActive, setIsActive] = useState(true);
  const [editorGrid, setEditorGrid] = useState<string[][]>(createEmptyGrid(6));

  const [placements, setPlacements] = useState<Map<string, Coord[]>>(new Map());
  const [drawingWord, setDrawingWord] = useState<string | null>(null);
  const [drawingPath, setDrawingPath] = useState<Coord[]>([]);

  const mapFromPlacementsArray = useCallback((variant: CampaignMapVariantAdmin): Map<string, Coord[]> => {
    const next = new Map<string, Coord[]>();
    (variant.wordPlacements || []).forEach(item => {
      next.set(toKey(item.word), (item.path || []).map(p => ({ r: p.r, c: p.c })));
    });
    return next;
  }, []);

  const resetToNewVariant = useCallback((words: LessonWord[]) => {
    const totalLetters = words.reduce((sum, w) => sum + w.bur.length, 0);
    const suggestedSize = Math.min(10, Math.max(4, Math.ceil(Math.sqrt(Math.max(16, totalLetters)))));

    setEditingVariantId(null);
    setTitle('');
    setDifficultyLevel(2);
    setGridSize(suggestedSize);
    setIsActive(true);
    setEditorGrid(createEmptyGrid(suggestedSize));
    setPlacements(new Map());
    setDrawingWord(null);
    setDrawingPath([]);
  }, []);

  const loadData = useCallback(async () => {
    if (!lessonSlug) return;

    try {
      setLoading(true);
      setError(null);

      const [level, variantsResponse] = await Promise.all([
        api.getCampaignAdminLevel(lessonSlug),
        api.getCampaignAdminMapVariants(lessonSlug),
      ]);

      const wordsRaw = (level.words || [])
        .map(w => ({ bur: toKey(w.bur), ru: String(w.ru || '').trim() }))
        .filter(w => w.bur.length > 0);

      const uniqueWords = Array.from(new Map(wordsRaw.map(w => [w.bur, w])).values());

      setLesson(level);
      setLessonWords(uniqueWords);
      setVariants(variantsResponse.mapVariants || []);

      if ((variantsResponse.mapVariants || []).length > 0) {
        const first = variantsResponse.mapVariants[0];
        setEditingVariantId(first.variantId ?? null);
        setTitle(first.title ?? '');
        setDifficultyLevel((Number(first.difficultyLevel) || 2) as 1 | 2 | 3);
        setGridSize(first.gridSize || 6);
        setIsActive(first.isActive !== false);
        setEditorGrid(first.grid && first.grid.length > 0 ? first.grid : createEmptyGrid(first.gridSize || 6));
        setPlacements(mapFromPlacementsArray(first));
        setDrawingWord(null);
        setDrawingPath([]);
      } else {
        resetToNewVariant(uniqueWords);
      }
    } catch (e) {
      setError(toErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [lessonSlug, mapFromPlacementsArray, resetToNewVariant]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const getWordColor = useCallback((word: string) => {
    const idx = lessonWords.findIndex(w => w.bur === word);
    return WORD_COLORS[(idx >= 0 ? idx : 0) % WORD_COLORS.length];
  }, [lessonWords]);

  const getCellOwner = useCallback((r: number, c: number): string | null => {
    for (const [word, path] of placements.entries()) {
      if (path.some(p => p.r === r && p.c === c)) return word;
    }
    if (drawingPath.some(p => p.r === r && p.c === c)) return drawingWord;
    return null;
  }, [placements, drawingPath, drawingWord]);

  const cancelDrawing = useCallback(() => {
    if (!drawingWord) return;
    setEditorGrid(prev => {
      const next = prev.map(row => [...row]);
      drawingPath.forEach(cell => {
        next[cell.r][cell.c] = '';
      });
      return next;
    });
    setDrawingWord(null);
    setDrawingPath([]);
  }, [drawingWord, drawingPath]);

  const selectWord = useCallback((word: string) => {
    if (drawingWord === word) {
      cancelDrawing();
      return;
    }

    if (drawingWord) {
      cancelDrawing();
    }

    if (placements.has(word)) {
      const prevPath = placements.get(word) || [];
      setEditorGrid(prev => {
        const next = prev.map(row => [...row]);
        prevPath.forEach(cell => {
          next[cell.r][cell.c] = '';
        });
        return next;
      });
      setPlacements(prev => {
        const next = new Map(prev);
        next.delete(word);
        return next;
      });
    }

    setDrawingWord(word);
    setDrawingPath([]);
  }, [drawingWord, cancelDrawing, placements]);

  const onCellClick = useCallback((r: number, c: number) => {
    if (!drawingWord) return;

    const word = lessonWords.find(w => w.bur === drawingWord);
    if (!word) return;

    if (drawingPath.length > 0) {
      const last = drawingPath[drawingPath.length - 1];
      if (last.r === r && last.c === c) {
        setDrawingPath(prev => prev.slice(0, -1));
        setEditorGrid(prev => {
          const next = prev.map(row => [...row]);
          next[r][c] = '';
          return next;
        });
        return;
      }
    }

    const owner = getCellOwner(r, c);
    if (owner && owner !== drawingWord) return;

    if (drawingPath.length > 0) {
      const last = drawingPath[drawingPath.length - 1];
      const distance = Math.abs(last.r - r) + Math.abs(last.c - c);
      if (distance !== 1) return;
    }

    if (drawingPath.some(p => p.r === r && p.c === c)) return;
    if (drawingPath.length >= word.bur.length) return;

    const nextPath = [...drawingPath, { r, c }];
    setDrawingPath(nextPath);

    setEditorGrid(prev => {
      const next = prev.map(row => [...row]);
      next[r][c] = word.bur[nextPath.length - 1];
      return next;
    });

    if (nextPath.length === word.bur.length) {
      setPlacements(prev => {
        const next = new Map(prev);
        next.set(drawingWord, nextPath);
        return next;
      });
      setDrawingWord(null);
      setDrawingPath([]);
    }
  }, [drawingWord, drawingPath, lessonWords, getCellOwner]);

  const fillNoise = useCallback(() => {
    setEditorGrid(prev => {
      const next = prev.map(row => [...row]);
      for (let r = 0; r < next.length; r++) {
        for (let c = 0; c < next[r].length; c++) {
          if (!next[r][c]) {
            next[r][c] = NOISE_ALPHABET[Math.floor(Math.random() * NOISE_ALPHABET.length)];
          }
        }
      }
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setEditorGrid(createEmptyGrid(gridSize));
    setPlacements(new Map());
    setDrawingWord(null);
    setDrawingPath([]);
  }, [gridSize]);

  const stats = useMemo(() => {
    const totalLetters = lessonWords.reduce((sum, w) => sum + w.bur.length, 0);
    const uniqueLetters = new Set(lessonWords.flatMap(w => w.bur.split(''))).size;
    const capacity = gridSize * gridSize;
    const filledCells = editorGrid.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
    const freeCells = capacity - filledCells;
    const fillPercent = capacity > 0 ? Math.round((filledCells / capacity) * 100) : 0;
    const placedWords = lessonWords.filter(w => placements.has(w.bur)).length;
    const allWordsPlaced = lessonWords.length > 0 && placedWords === lessonWords.length;
    const gridFull = editorGrid.length > 0 && editorGrid.every(row => row.every(cell => !!cell));

    return {
      totalLetters,
      uniqueLetters,
      capacity,
      filledCells,
      freeCells,
      fillPercent,
      placedWords,
      allWordsPlaced,
      gridFull,
    };
  }, [lessonWords, gridSize, editorGrid, placements]);

  const onSelectVariant = (variant: CampaignMapVariantAdmin) => {
    setEditingVariantId(variant.variantId ?? null);
    setTitle(variant.title ?? '');
    setDifficultyLevel((Number(variant.difficultyLevel) || 2) as 1 | 2 | 3);
    setGridSize(variant.gridSize || 6);
    setIsActive(variant.isActive !== false);
    setEditorGrid(variant.grid && variant.grid.length > 0 ? variant.grid : createEmptyGrid(variant.gridSize || 6));
    setPlacements(mapFromPlacementsArray(variant));
    setDrawingWord(null);
    setDrawingPath([]);
  };

  const onGridSizeChange = (next: number) => {
    const safe = Math.max(4, Math.min(10, next));
    setGridSize(safe);
    setEditorGrid(createEmptyGrid(safe));
    setPlacements(new Map());
    setDrawingWord(null);
    setDrawingPath([]);
  };

  const saveVariant = async () => {
    if (!lessonSlug) return;

    if (!stats.allWordsPlaced) {
      setError('Разместите все слова урока на сетке');
      return;
    }

    if (!stats.gridFull) {
      setError('Заполните все клетки (кнопка «Шум» поможет)');
      return;
    }

    const payload: CampaignMapVariantAdmin = {
      variantId: editingVariantId || undefined,
      title: title.trim() || undefined,
      difficultyLevel,
      gridSize,
      grid: editorGrid,
      wordPlacements: lessonWords.map(w => ({
        word: w.bur,
        path: placements.get(w.bur) || [],
      })),
      isActive,
    };

    try {
      setSaving(true);
      setError(null);

      const response = editingVariantId
        ? await api.updateCampaignAdminMapVariant(lessonSlug, editingVariantId, payload)
        : await api.createCampaignAdminMapVariant(lessonSlug, payload);

      setVariants(response.mapVariants || []);

      if (!editingVariantId) {
        const created = (response.mapVariants || []).find(v =>
          v.gridSize === gridSize && Number(v.difficultyLevel) === Number(difficultyLevel)
        );
        if (created?.variantId) {
          setEditingVariantId(created.variantId);
        }
      }
    } catch (e) {
      setError(toErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const deleteVariant = async () => {
    if (!lessonSlug || !editingVariantId) return;
    if (!window.confirm('Удалить текущий вариант карты?')) return;

    try {
      setSaving(true);
      setError(null);
      const response = await api.deleteCampaignAdminMapVariant(lessonSlug, editingVariantId);
      const nextVariants = response.mapVariants || [];
      setVariants(nextVariants);

      if (nextVariants.length > 0) {
        onSelectVariant(nextVariants[0]);
      } else {
        resetToNewVariant(lessonWords);
      }
    } catch (e) {
      setError(toErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (!lessonSlug) {
    return (
      <div className={cn('min-h-[100dvh] p-6', isDark ? 'bg-stone-950 text-white' : 'bg-stone-50 text-stone-900')}>
        <p className="text-sm">Не выбран урок для редактирования карт.</p>
        <button onClick={goBack} className="mt-4 text-sm underline">Назад</button>
      </div>
    );
  }

  return (
    <div className={cn('min-h-[100dvh] flex flex-col', theme.backgrounds.primaryGradient)}>
      <StickyHeader title="Карты урока" onBack={goBack} />

      <header className="px-5 pt-14 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            className={cn('p-2 rounded-xl', isDark ? 'bg-white/10' : 'bg-black/5')}
          >
            <ArrowLeft size={20} className={theme.text.primary} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className={cn('text-lg font-bold truncate', theme.text.primary)}>{lesson?.name || lessonSlug}</h1>
            <p className={cn('text-xs', isDark ? 'text-white/40' : 'text-stone-500')}>slug: {lessonSlug}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 px-5 pb-8 space-y-4">
        {error && (
          <div className={cn('p-3 rounded-xl text-sm border', isDark ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-red-50 border-red-200 text-red-700')}>
            {error}
          </div>
        )}

        <section className={cn('rounded-2xl border p-3', isDark ? 'bg-white/5 border-white/10' : 'bg-white border-stone-200')}>
          <div className="flex items-center justify-between mb-2">
            <h2 className={cn('font-semibold text-sm', theme.text.primary)}>Варианты карты</h2>
            <button
              onClick={() => resetToNewVariant(lessonWords)}
              className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs', isDark ? 'bg-violet-500/20 text-violet-200' : 'bg-violet-50 text-violet-700')}
            >
              <Plus size={12} /> New
            </button>
          </div>

          {loading ? (
            <div className="py-4 flex justify-center"><Loader2 size={18} className={cn('animate-spin', theme.text.primary)} /></div>
          ) : variants.length === 0 ? (
            <p className={cn('text-xs', isDark ? 'text-white/50' : 'text-stone-500')}>Пока нет вариантов</p>
          ) : (
            <div className="space-y-1.5">
              {variants.map(variant => (
                <button
                  key={variant.variantId}
                  onClick={() => onSelectVariant(variant)}
                  className={cn(
                    'w-full text-left rounded-xl border p-2.5 text-xs',
                    editingVariantId === variant.variantId
                      ? isDark ? 'bg-violet-500/20 border-violet-500/30 text-violet-100' : 'bg-violet-50 border-violet-200 text-violet-700'
                      : isDark ? 'bg-white/5 border-white/10 text-white/80' : 'bg-stone-50 border-stone-200 text-stone-700'
                  )}
                >
                  <div className="font-semibold">{variant.title || variant.variantId || 'Вариант'}</div>
                  <div className="opacity-70 mt-0.5">d{variant.difficultyLevel} · {variant.gridSize}×{variant.gridSize} · {variant.isActive === false ? 'off' : 'on'}</div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className={cn('rounded-2xl border p-3', isDark ? 'bg-white/5 border-white/10' : 'bg-white border-stone-200')}>
          <h2 className={cn('font-semibold text-sm mb-3', theme.text.primary)}>
            {editingVariantId ? 'Редактирование варианта' : 'Новый вариант'}
          </h2>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Название (опц)"
              className={cn('px-3 py-2 rounded-xl border text-xs col-span-2', isDark ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-stone-200 text-stone-900')}
            />
            <select
              value={difficultyLevel}
              onChange={(e) => setDifficultyLevel(Number(e.target.value) as 1 | 2 | 3)}
              className={cn('px-3 py-2 rounded-xl border text-xs', isDark ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-stone-200 text-stone-900')}
            >
              <option value={1}>Сложность 1</option>
              <option value={2}>Сложность 2</option>
              <option value={3}>Сложность 3</option>
            </select>
            <input
              type="number"
              min={4}
              max={10}
              value={gridSize}
              onChange={(e) => onGridSizeChange(Number(e.target.value || 6))}
              className={cn('px-3 py-2 rounded-xl border text-xs', isDark ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-stone-200 text-stone-900')}
            />
          </div>

          <label className={cn('flex items-center gap-2 text-xs mb-3', isDark ? 'text-white/70' : 'text-stone-600')}>
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Вариант активен
          </label>

          <div className={cn('rounded-xl border p-2 mb-3 text-xs', isDark ? 'border-white/10 bg-white/5 text-white/70' : 'border-stone-200 bg-stone-50 text-stone-700')}>
            <div>Символов в словах: <b>{stats.totalLetters}</b> · Уникальных букв: <b>{stats.uniqueLetters}</b></div>
            <div>Вместимость: <b>{stats.capacity}</b> · Занято: <b>{stats.filledCells}</b> · Свободно: <b>{stats.freeCells}</b> · Заполнение: <b>{stats.fillPercent}%</b></div>
            <div>Слова: <b>{stats.placedWords}/{lessonWords.length}</b> {stats.allWordsPlaced ? '✓' : ''}</div>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {lessonWords.map(word => {
              const color = getWordColor(word.bur);
              const placed = placements.has(word.bur);
              const selected = drawingWord === word.bur;

              return (
                <button
                  key={word.bur}
                  onClick={() => selectWord(word.bur)}
                  className={cn('px-2.5 py-1.5 rounded-lg border text-xs font-semibold', selected ? 'scale-105' : '')}
                  style={{
                    borderColor: color,
                    backgroundColor: selected ? `${color}44` : placed ? `${color}22` : `${color}14`,
                    color: isDark ? '#f5f5f5' : '#1f2937',
                  }}
                >
                  {word.bur} <span className="opacity-70">({word.bur.length})</span>{placed && ' ✓'}
                </button>
              );
            })}
          </div>

          <div
            className="grid gap-0.5 mx-auto"
            style={{
              gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
              maxWidth: `${Math.min(gridSize * 52, 380)}px`,
            }}
          >
            {editorGrid.map((row, r) =>
              row.map((cell, c) => {
                const owner = getCellOwner(r, c);
                const color = owner ? getWordColor(owner) : null;
                return (
                  <button
                    key={`${r}-${c}`}
                    onClick={() => onCellClick(r, c)}
                    className={cn('aspect-square rounded-md border text-xs font-bold', isDark ? 'border-white/10' : 'border-stone-200')}
                    style={{
                      backgroundColor: color ? `${color}35` : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                      color: isDark ? '#e5e7eb' : '#111827',
                    }}
                  >
                    {cell}
                  </button>
                );
              })
            )}
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={fillNoise}
              className={cn('flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs', isDark ? 'bg-amber-500/20 text-amber-200' : 'bg-amber-50 text-amber-700 border border-amber-200')}
            >
              <Sparkles size={12} /> Шум
            </button>
            <button
              onClick={clearAll}
              className={cn('flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs', isDark ? 'bg-red-500/20 text-red-200' : 'bg-red-50 text-red-700 border border-red-200')}
            >
              <RotateCcw size={12} /> Сброс
            </button>
          </div>

          <div className="flex gap-2 mt-3">
            {editingVariantId && (
              <button
                onClick={() => void deleteVariant()}
                disabled={saving}
                className={cn('inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs', isDark ? 'bg-red-500/20 text-red-200' : 'bg-red-50 text-red-700 border border-red-200')}
              >
                <Trash2 size={12} /> Удалить
              </button>
            )}
            <button
              onClick={() => void saveVariant()}
              disabled={saving || !stats.allWordsPlaced || !stats.gridFull}
              className={cn(
                'flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold',
                saving || !stats.allWordsPlaced || !stats.gridFull
                  ? isDark ? 'bg-white/10 text-white/40' : 'bg-stone-100 text-stone-400'
                  : isDark ? 'bg-violet-500/30 text-violet-100' : 'bg-violet-600 text-white'
              )}
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              {editingVariantId ? 'Сохранить' : 'Создать'}
            </button>
          </div>

          {!stats.allWordsPlaced && (
            <p className={cn('text-xs mt-2', isDark ? 'text-amber-300' : 'text-amber-700')}>
              Разместите все слова урока на сетке.
            </p>
          )}
          {stats.allWordsPlaced && !stats.gridFull && (
            <p className={cn('text-xs mt-2', isDark ? 'text-amber-300' : 'text-amber-700')}>
              Заполните оставшиеся клетки шумом.
            </p>
          )}
          {stats.allWordsPlaced && stats.gridFull && (
            <p className={cn('text-xs mt-2 inline-flex items-center gap-1', isDark ? 'text-emerald-300' : 'text-emerald-700')}>
              <CheckCircle2 size={12} /> Карта валидна для сохранения.
            </p>
          )}
        </section>
      </main>
    </div>
  );
};

export default AdminCampaignMapVariantsScreen;
