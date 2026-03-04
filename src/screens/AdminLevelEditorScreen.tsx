// src/screens/AdminLevelEditorScreen.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Save,
  Trash2,
  Plus,
  Search,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Settings2,
  Hash,
  Grid3X3,
  Clock,
  BookOpen,
  Gauge,
  ToggleLeft,
  ToggleRight,
  ListOrdered,
  Wand2,
  ChevronDown,
  ChevronUp,
  GripVertical,
} from 'lucide-react';
import { cn } from '../components/ui';
import { StickyHeader } from '../components/StickyHeader';
import { useTheme } from '../theme/ThemeContext';
import { useBackButton } from '../hooks/useTelegram';
import type { GameStore } from '../store/gameStore';
import {
  api,
  type AdminLevel,
  type AdminLevelCreateRequest,
  type AdminLevelUpdateRequest,
  type ApiWord,
  type ApiWordsResponse,
} from '../services/api';

interface AdminLevelEditorScreenProps {
  store: GameStore;
}

type WordMode = 'auto' | 'manual';

interface SelectedWord {
  _id: string;
  bur: string;
  ru: string;
}

// ─── Toast component ──────────────────────────────────────────────
const Toast: React.FC<{
  message: string;
  type: 'success' | 'error';
  isDark: boolean;
  onDismiss: () => void;
}> = ({ message, type, isDark, onDismiss }) => (
  <motion.div
    initial={{ opacity: 0, y: 50, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 20, scale: 0.9 }}
    className={cn(
      'fixed bottom-6 left-4 right-4 mx-auto max-w-sm z-50',
      'rounded-2xl px-4 py-3 shadow-xl flex items-center gap-3',
      type === 'success'
        ? isDark
          ? 'bg-emerald-900/90 border border-emerald-700/50'
          : 'bg-emerald-50 border border-emerald-200'
        : isDark
          ? 'bg-red-900/90 border border-red-700/50'
          : 'bg-red-50 border border-red-200'
    )}
    onClick={onDismiss}
  >
    {type === 'success' ? (
      <CheckCircle2 size={20} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
    ) : (
      <AlertTriangle size={20} className={isDark ? 'text-red-400' : 'text-red-600'} />
    )}
    <p
      className={cn(
        'text-sm font-medium flex-1',
        type === 'success'
          ? isDark
            ? 'text-emerald-200'
            : 'text-emerald-800'
          : isDark
            ? 'text-red-200'
            : 'text-red-800'
      )}
    >
      {message}
    </p>
  </motion.div>
);

// ─── Number Input ─────────────────────────────────────────────────
const NumberInput: React.FC<{
  label: string;
  icon: React.ReactNode;
  value: number | '';
  onChange: (v: number | '') => void;
  min?: number;
  max?: number;
  placeholder?: string;
  isDark: boolean;
  hint?: string;
}> = ({ label, icon, value, onChange, min, max, placeholder, isDark, hint }) => (
  <div>
    <label className={cn('flex items-center gap-2 text-sm font-medium mb-1.5', isDark ? 'text-white/70' : 'text-stone-600')}>
      {icon}
      {label}
    </label>
    <input
      type="number"
      value={value}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === '') {
          onChange('');
          return;
        }
        const n = parseInt(raw, 10);
        if (!isNaN(n)) onChange(n);
      }}
      min={min}
      max={max}
      placeholder={placeholder}
      className={cn(
        'w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors outline-none',
        isDark
          ? 'bg-white/10 border border-white/10 text-white placeholder:text-white/30 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30'
          : 'bg-white border border-stone-200 text-stone-900 placeholder:text-stone-400 focus:border-violet-400 focus:ring-1 focus:ring-violet-300'
      )}
    />
    {hint && (
      <p className={cn('text-xs mt-1', isDark ? 'text-white/30' : 'text-stone-400')}>{hint}</p>
    )}
  </div>
);

// ─── Word Search Chip ────────────────────────────────────────────
const WordChip: React.FC<{
  word: SelectedWord;
  isDark: boolean;
  onRemove: () => void;
}> = ({ word, isDark, onRemove }) => (
  <motion.div
    layout
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.8 }}
    className={cn(
      'flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm',
      isDark ? 'bg-violet-500/20 border border-violet-500/30' : 'bg-violet-50 border border-violet-200'
    )}
  >
    <div className="flex items-center gap-1.5 min-w-0">
      <GripVertical size={12} className={isDark ? 'text-white/20' : 'text-stone-300'} />
      <span className={cn('font-bold truncate', isDark ? 'text-violet-300' : 'text-violet-700')}>
        {word.bur}
      </span>
      <span className={cn('text-xs truncate', isDark ? 'text-white/40' : 'text-stone-500')}>
        {word.ru}
      </span>
    </div>
    <button
      onClick={onRemove}
      className={cn(
        'p-0.5 rounded-full transition-colors shrink-0',
        isDark ? 'hover:bg-white/10' : 'hover:bg-stone-200'
      )}
    >
      <X size={12} className={isDark ? 'text-white/40' : 'text-stone-400'} />
    </button>
  </motion.div>
);

// ─── Word Search Result Row ──────────────────────────────────────
const WordSearchRow: React.FC<{
  word: ApiWord;
  isDark: boolean;
  isSelected: boolean;
  onToggle: () => void;
}> = ({ word, isDark, isSelected, onToggle }) => (
  <motion.button
    whileTap={{ scale: 0.98 }}
    onClick={onToggle}
    className={cn(
      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all',
      isSelected
        ? isDark
          ? 'bg-violet-500/20 border border-violet-500/30'
          : 'bg-violet-50 border border-violet-200'
        : isDark
          ? 'bg-white/5 border border-white/5 hover:bg-white/10'
          : 'bg-white border border-stone-100 hover:bg-stone-50'
    )}
  >
    <div
      className={cn(
        'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors',
        isSelected
          ? 'bg-violet-500 border-violet-500'
          : isDark
            ? 'border-white/20'
            : 'border-stone-300'
      )}
    >
      {isSelected && <CheckCircle2 size={12} className="text-white" />}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className={cn('font-bold text-sm', isDark ? 'text-white' : 'text-stone-900')}>
          {word.bur}
        </span>
        {word.difficulty > 0 && (
          <span
            className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
              isDark ? 'bg-white/10 text-white/50' : 'bg-stone-100 text-stone-500'
            )}
          >
            d:{word.difficulty}
          </span>
        )}
      </div>
      <span className={cn('text-xs', isDark ? 'text-white/40' : 'text-stone-500')}>
        {word.ru}
      </span>
    </div>
  </motion.button>
);

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export const AdminLevelEditorScreen: React.FC<AdminLevelEditorScreenProps> = ({ store }) => {
  const { goBack, state } = store;
  const { isDark } = useTheme();

  useBackButton(() => goBack());

  const editLevelNumber = state.adminEditLevelNumber; // null = new level
  const isNewLevel = editLevelNumber === null;

  // ─── Form state ──────────────────────────────────────────────────
  const [levelNumber, setLevelNumber] = useState<number | ''>(editLevelNumber ?? '');
  const [gridSize, setGridSize] = useState<number | ''>(6);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState<number | ''>(120);
  const [wordCount, setWordCount] = useState<number | ''>(6);
  const [maxDifficulty, setMaxDifficulty] = useState<number | ''>(10);
  const [isActive, setIsActive] = useState(true);
  const [wordMode, setWordMode] = useState<WordMode>('auto');
  const [selectedWords, setSelectedWords] = useState<SelectedWord[]>([]);

  // ─── UI state ────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [manualAutoFillLoading, setManualAutoFillLoading] = useState(false);
  const [existingLevel, setExistingLevel] = useState<AdminLevel | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showWordSearch, setShowWordSearch] = useState(false);

  // ─── Word search state ──────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ApiWord[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTotal, setSearchTotal] = useState(0);

  // ─── All manual levels (for listing) ─────────────────────────────
  const [allLevels, setAllLevels] = useState<AdminLevel[]>([]);
  const [allLevelsLoading, setAllLevelsLoading] = useState(false);
  const [showAllLevels, setShowAllLevels] = useState(false);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  }, []);

  // ─── Load existing level ────────────────────────────────────────
  useEffect(() => {
    if (isNewLevel) return;

    let isMounted = true;
    setLoading(true);

    (async () => {
      try {
        const levels = await api.getAdminLevels();
        if (!isMounted) return;

        const found = levels.find((l) => l.levelNumber === editLevelNumber);
        if (found) {
          setExistingLevel(found);
          setLevelNumber(found.levelNumber);
          setGridSize(found.gridSize ?? 6);
          setTimeLimitSeconds(found.timeLimitSeconds ?? 120);
          setWordCount(found.wordCount ?? 6);
          setMaxDifficulty(found.maxDifficulty ?? 10);
          setIsActive(found.isActive ?? true);

          if (found.words && found.words.length > 0) {
            setWordMode('manual');
            // Try to load word details
            if (found.populatedWords && found.populatedWords.length > 0) {
              setSelectedWords(
                found.populatedWords.map((w) => ({ _id: w._id, bur: w.bur, ru: w.ru }))
              );
            } else {
              // Words are IDs only — show them as-is, user can replace
              setSelectedWords(
                found.words.map((id) => ({ _id: id, bur: '...', ru: 'загрузка' }))
              );
              // Load word details in background
              try {
                const wordsResp = await api.getWords({
                  status: 'verified',
                  isActiveInGame: true,
                  limit: 100,
                });
                if (isMounted) {
                  const wordsMap = new Map(wordsResp.words.map((w) => [w._id, w]));
                  setSelectedWords(
                    found.words.map((id) => {
                      const w = wordsMap.get(id);
                      return w ? { _id: w._id, bur: w.bur, ru: w.ru } : { _id: id, bur: id.slice(-6), ru: '?' };
                    })
                  );
                }
              } catch {
                // Ignore — just show IDs
              }
            }
          } else {
            setWordMode('auto');
          }
        }
      } catch (err) {
        if (isMounted) showToast('Не удалось загрузить уровень', 'error');
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [editLevelNumber, isNewLevel, showToast]);

  // ─── Load all levels for listing ─────────────────────────────────
  const loadAllLevels = useCallback(async () => {
    setAllLevelsLoading(true);
    try {
      const levels = await api.getAdminLevels();
      setAllLevels(levels.sort((a, b) => a.levelNumber - b.levelNumber));
    } catch (err) {
      showToast('Не удалось загрузить список уровней', 'error');
      console.error(err);
    } finally {
      setAllLevelsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (showAllLevels && allLevels.length === 0) {
      loadAllLevels();
    }
  }, [showAllLevels, allLevels.length, loadAllLevels]);

  // ─── Word search ────────────────────────────────────────────────
  const searchWords = useCallback(
    async (query: string) => {
      setSearchLoading(true);
      try {
        // Build query params
        const searchParams = new URLSearchParams();
        searchParams.set('status', 'verified');
        searchParams.set('isActiveInGame', 'true');
        searchParams.set('limit', '30');
        if (query.trim()) {
          searchParams.set('search', query.trim());
        }

        const response: ApiWordsResponse = await api.get(`/words?${searchParams.toString()}`);
        setSearchResults(response.words || []);
        setSearchTotal(response.total || 0);
      } catch (err) {
        console.error('Word search failed:', err);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    },
    []
  );

  // Debounced search
  useEffect(() => {
    if (!showWordSearch) return;
    const timer = setTimeout(() => {
      searchWords(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, showWordSearch, searchWords]);

  // Selected word IDs for quick lookup
  const selectedWordIds = useMemo(() => new Set(selectedWords.map((w) => w._id)), [selectedWords]);

  const toggleWord = useCallback(
    (word: ApiWord) => {
      setSelectedWords((prev) => {
        const exists = prev.find((w) => w._id === word._id);
        if (exists) {
          return prev.filter((w) => w._id !== word._id);
        }
        return [...prev, { _id: word._id, bur: word.bur, ru: word.ru }];
      });
    },
    []
  );

  const removeWord = useCallback((id: string) => {
    setSelectedWords((prev) => prev.filter((w) => w._id !== id));
  }, []);

  const handleAutoFillManualWords = useCallback(async () => {
    if (gridSize === '' || gridSize < 4 || gridSize > 10) {
      showToast('Сначала укажите размер сетки 4-10', 'error');
      return;
    }

    setManualAutoFillLoading(true);

    try {
      const gs = gridSize as number;
      const targetLetters = gs * gs;
      const minWords = Math.max(4, Math.floor(targetLetters / 8));
      const fallbackMaxWords = Math.max(minWords, Math.min(20, Math.floor(targetLetters / 2)));
      const maxWords = wordCount !== '' && wordCount >= minWords
        ? Math.min(20, wordCount)
        : fallbackMaxWords;

      const result = await api.generateAdminLevelWords({
        gridSize: gs,
        maxDifficulty: maxDifficulty === '' ? 10 : maxDifficulty,
        minWordLength: 2,
        maxWordLength: Math.min(targetLetters, gs + 4),
        minWords,
        maxWords,
        attempts: 180,
      });

      setSelectedWords(result.words.map((w) => ({
        _id: w._id,
        bur: w.bur,
        ru: w.ru,
      })));

      showToast(`Подобрано ${result.words.length} слов (${result.totalLetters}/${result.targetLetters} букв)`, 'success');
    } catch (err) {
      const msg = (err as { message?: string })?.message || 'Не удалось автоподобрать слова';
      showToast(msg, 'error');
    } finally {
      setManualAutoFillLoading(false);
    }
  }, [gridSize, wordCount, maxDifficulty, showToast]);

  // ─── Save ────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (levelNumber === '' || levelNumber < 1) {
      showToast('Укажите номер уровня (>= 1)', 'error');
      return;
    }

    setSaving(true);
    try {
      if (existingLevel) {
        // Update
        const update: AdminLevelUpdateRequest = {};
        if (wordMode === 'manual' && selectedWords.length > 0) {
          update.words = selectedWords.map((w) => w._id);
        } else if (wordMode === 'auto') {
          update.words = []; // empty → auto-generate
          if (wordCount !== '' && wordCount >= 3) update.wordCount = wordCount;
          if (maxDifficulty !== '' && maxDifficulty >= 1) update.maxDifficulty = maxDifficulty;
        }
        if (gridSize !== '' && gridSize >= 4) update.gridSize = gridSize;
        if (timeLimitSeconds !== '') update.timeLimitSeconds = timeLimitSeconds;
        update.isActive = isActive;

        await api.updateAdminLevel(existingLevel.levelNumber, update);
        showToast(`Уровень ${existingLevel.levelNumber} обновлён`, 'success');
      } else {
        // Create
        const create: AdminLevelCreateRequest = {
          levelNumber: levelNumber as number,
        };
        if (wordMode === 'manual' && selectedWords.length > 0) {
          create.words = selectedWords.map((w) => w._id);
        } else if (wordMode === 'auto') {
          if (wordCount !== '' && wordCount >= 3) create.wordCount = wordCount;
          if (maxDifficulty !== '' && maxDifficulty >= 1) create.maxDifficulty = maxDifficulty;
        }
        if (gridSize !== '' && gridSize >= 4) create.gridSize = gridSize;
        if (timeLimitSeconds !== '') create.timeLimitSeconds = timeLimitSeconds;
        create.isActive = isActive;

        const created = await api.createAdminLevel(create);
        setExistingLevel(created);
        showToast(`Уровень ${levelNumber} создан!`, 'success');
      }
    } catch (err) {
      const msg = (err as { message?: string })?.message || 'Ошибка сохранения';
      showToast(msg, 'error');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }, [levelNumber, gridSize, timeLimitSeconds, wordCount, maxDifficulty, isActive, wordMode, selectedWords, existingLevel, showToast]);

  // ─── Delete ──────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!existingLevel) return;
    setDeleting(true);
    try {
      await api.deleteAdminLevel(existingLevel.levelNumber);
      showToast(`Уровень ${existingLevel.levelNumber} удалён`, 'success');
      setExistingLevel(null);
      // Go back after short delay
      setTimeout(() => goBack(), 500);
    } catch (err) {
      const msg = (err as { message?: string })?.message || 'Ошибка удаления';
      showToast(msg, 'error');
      console.error(err);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [existingLevel, showToast, goBack]);

  // ─── Navigate to edit another level from list ────────────────────
  const editLevel = useCallback(
    (lvl: AdminLevel) => {
      store.navigateToLevelEditor(lvl.levelNumber);
    },
    [store]
  );

  if (loading) {
    return (
      <div className={cn('min-h-[100dvh] flex items-center justify-center', isDark ? 'bg-stone-950' : 'bg-stone-50')}>
        <Loader2 size={32} className={cn('animate-spin', isDark ? 'text-white/40' : 'text-stone-400')} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'min-h-[100dvh] flex flex-col',
        isDark
          ? 'bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950'
          : 'bg-gradient-to-b from-stone-50 via-white to-stone-50'
      )}
    >
      <StickyHeader
        title={isNewLevel ? 'Новый уровень' : `Уровень ${editLevelNumber}`}
        onBack={goBack}
        rightElement={
          existingLevel ? (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowDeleteConfirm(true)}
              className={cn('p-2 rounded-xl transition-colors', 'bg-red-500/20 hover:bg-red-500/30')}
            >
              <Trash2 size={18} className="text-red-500" />
            </motion.button>
          ) : undefined
        }
      />

      {/* Header */}
      <header className="px-5 pt-14 pb-2">
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={goBack}
            className={cn(
              'p-2 rounded-xl transition-colors',
              isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'
            )}
          >
            <ArrowLeft size={22} className={isDark ? 'text-white' : 'text-stone-900'} />
          </motion.button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Settings2 size={20} className={isDark ? 'text-violet-400' : 'text-violet-600'} />
              <h1 className={cn('text-xl font-bold', isDark ? 'text-white' : 'text-stone-900')}>
                {isNewLevel ? 'Новый уровень' : `Редактирование уровня ${editLevelNumber}`}
              </h1>
            </div>
            <p className={cn('text-xs mt-0.5', isDark ? 'text-white/40' : 'text-stone-500')}>
              {existingLevel ? 'Изменяйте параметры и сохраняйте' : 'Настройте параметры уровня'}
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-5 pb-8 space-y-5">
        {/* ═══ All Levels List (collapsible) ═══ */}
        <section>
          <button
            onClick={() => setShowAllLevels(!showAllLevels)}
            className={cn(
              'w-full flex items-center justify-between p-3 rounded-xl border transition-colors',
              isDark
                ? 'bg-white/5 border-white/10 hover:bg-white/10'
                : 'bg-white border-stone-200 hover:bg-stone-50'
            )}
          >
            <div className="flex items-center gap-2">
              <ListOrdered size={16} className={isDark ? 'text-violet-400' : 'text-violet-600'} />
              <span className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-stone-900')}>
                Все ручные уровни
              </span>
              {allLevels.length > 0 && (
                <span
                  className={cn(
                    'text-xs px-1.5 py-0.5 rounded-full font-bold',
                    isDark ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-100 text-violet-700'
                  )}
                >
                  {allLevels.length}
                </span>
              )}
            </div>
            {showAllLevels ? (
              <ChevronUp size={16} className={isDark ? 'text-white/40' : 'text-stone-400'} />
            ) : (
              <ChevronDown size={16} className={isDark ? 'text-white/40' : 'text-stone-400'} />
            )}
          </button>

          <AnimatePresence>
            {showAllLevels && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-2 space-y-1.5">
                  {allLevelsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 size={18} className={cn('animate-spin', isDark ? 'text-white/30' : 'text-stone-400')} />
                    </div>
                  ) : allLevels.length === 0 ? (
                    <div className={cn('text-center py-4 text-sm', isDark ? 'text-white/30' : 'text-stone-400')}>
                      Нет ручных уровней
                    </div>
                  ) : (
                    <>
                      {allLevels.map((lvl) => (
                        <motion.button
                          key={lvl._id}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => editLevel(lvl)}
                          className={cn(
                            'w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left',
                            editLevelNumber === lvl.levelNumber
                              ? isDark
                                ? 'bg-violet-500/20 border-violet-500/30'
                                : 'bg-violet-50 border-violet-200'
                              : isDark
                                ? 'bg-white/5 border-white/5 hover:bg-white/10'
                                : 'bg-white border-stone-100 hover:bg-stone-50'
                          )}
                        >
                          <div
                            className={cn(
                              'w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm',
                              isDark ? 'bg-white/10 text-white' : 'bg-stone-100 text-stone-700'
                            )}
                          >
                            #{lvl.levelNumber}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={cn('font-medium text-sm', isDark ? 'text-white' : 'text-stone-900')}>
                                Уровень {lvl.levelNumber}
                              </span>
                              {lvl.words && lvl.words.length > 0 ? (
                                <span
                                  className={cn(
                                    'text-[10px] px-1.5 py-0.5 rounded-full',
                                    isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                                  )}
                                >
                                  {lvl.words.length} слов
                                </span>
                              ) : (
                                <span
                                  className={cn(
                                    'text-[10px] px-1.5 py-0.5 rounded-full',
                                    isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'
                                  )}
                                >
                                  авто
                                </span>
                              )}
                              {!lvl.isActive && (
                                <span
                                  className={cn(
                                    'text-[10px] px-1.5 py-0.5 rounded-full',
                                    isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'
                                  )}
                                >
                                  выкл
                                </span>
                              )}
                            </div>
                            <span className={cn('text-xs', isDark ? 'text-white/30' : 'text-stone-400')}>
                              {lvl.gridSize ?? 6}x{lvl.gridSize ?? 6} · {lvl.timeLimitSeconds ?? 120}с
                            </span>
                          </div>
                        </motion.button>
                      ))}
                      <button
                        onClick={() => store.navigateToLevelEditor(null)}
                        className={cn(
                          'w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed transition-colors',
                          isDark
                            ? 'border-white/10 text-white/40 hover:border-violet-500/30 hover:text-violet-400'
                            : 'border-stone-200 text-stone-400 hover:border-violet-300 hover:text-violet-600'
                        )}
                      >
                        <Plus size={16} />
                        <span className="text-sm font-medium">Создать новый</span>
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ═══ Level Number ═══ */}
        <NumberInput
          label="Номер уровня"
          icon={<Hash size={14} className={isDark ? 'text-violet-400' : 'text-violet-600'} />}
          value={levelNumber}
          onChange={setLevelNumber}
          min={1}
          placeholder="1"
          isDark={isDark}
          hint={existingLevel ? 'Нельзя менять — удалите и создайте новый' : 'Уникальный номер уровня (>= 1)'}
        />

        {/* ═══ Grid Size ═══ */}
        <NumberInput
          label="Размер сетки"
          icon={<Grid3X3 size={14} className={isDark ? 'text-violet-400' : 'text-violet-600'} />}
          value={gridSize}
          onChange={setGridSize}
          min={4}
          max={10}
          placeholder="6"
          isDark={isDark}
          hint="4-10, по умолчанию 6"
        />

        {/* ═══ Time Limit ═══ */}
        <NumberInput
          label="Лимит времени (сек)"
          icon={<Clock size={14} className={isDark ? 'text-violet-400' : 'text-violet-600'} />}
          value={timeLimitSeconds}
          onChange={setTimeLimitSeconds}
          min={1}
          placeholder="120"
          isDark={isDark}
          hint="Лимит времени для получения 3 звёзд"
        />

        {/* ═══ Active Toggle ═══ */}
        <div className="flex items-center justify-between">
          <label className={cn('flex items-center gap-2 text-sm font-medium', isDark ? 'text-white/70' : 'text-stone-600')}>
            {isActive ? (
              <ToggleRight size={14} className="text-emerald-500" />
            ) : (
              <ToggleLeft size={14} className={isDark ? 'text-white/30' : 'text-stone-400'} />
            )}
            Уровень активен
          </label>
          <button
            onClick={() => setIsActive(!isActive)}
            className={cn(
              'w-12 h-7 rounded-full transition-colors relative',
              isActive
                ? 'bg-emerald-500'
                : isDark
                  ? 'bg-white/10'
                  : 'bg-stone-200'
            )}
          >
            <motion.div
              animate={{ x: isActive ? 22 : 2 }}
              className="absolute top-1 w-5 h-5 bg-white rounded-full shadow"
            />
          </button>
        </div>

        {/* ═══ Word Source Mode ═══ */}
        <div>
          <label
            className={cn(
              'flex items-center gap-2 text-sm font-medium mb-2',
              isDark ? 'text-white/70' : 'text-stone-600'
            )}
          >
            <BookOpen size={14} className={isDark ? 'text-violet-400' : 'text-violet-600'} />
            Источник слов
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setWordMode('auto')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all border',
                wordMode === 'auto'
                  ? isDark
                    ? 'bg-violet-500/20 border-violet-500/30 text-violet-300'
                    : 'bg-violet-50 border-violet-200 text-violet-700'
                  : isDark
                    ? 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10'
                    : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'
              )}
            >
              <Wand2 size={14} />
              Автогенерация
            </button>
            <button
              onClick={() => setWordMode('manual')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all border',
                wordMode === 'manual'
                  ? isDark
                    ? 'bg-violet-500/20 border-violet-500/30 text-violet-300'
                    : 'bg-violet-50 border-violet-200 text-violet-700'
                  : isDark
                    ? 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10'
                    : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'
              )}
            >
              <BookOpen size={14} />
              Ручной выбор
            </button>
          </div>
        </div>

        {/* ═══ Auto-generation settings ═══ */}
        <AnimatePresence mode="wait">
          {wordMode === 'auto' && (
            <motion.div
              key="auto"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 overflow-hidden"
            >
              <div
                className={cn(
                  'p-3 rounded-xl border flex items-start gap-2',
                  isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'
                )}
              >
                <Sparkles size={16} className={isDark ? 'text-amber-400 shrink-0 mt-0.5' : 'text-amber-600 shrink-0 mt-0.5'} />
                <p className={cn('text-xs', isDark ? 'text-amber-300/70' : 'text-amber-700')}>
                  Сервер подберёт случайные слова при каждой загрузке. Каждый раз будут разные слова.
                </p>
              </div>
              <NumberInput
                label="Количество слов"
                icon={<Hash size={14} className={isDark ? 'text-violet-400' : 'text-violet-600'} />}
                value={wordCount}
                onChange={setWordCount}
                min={3}
                max={20}
                placeholder="6"
                isDark={isDark}
                hint="3-20, по умолчанию 6"
              />
              <NumberInput
                label="Макс. сложность слов"
                icon={<Gauge size={14} className={isDark ? 'text-violet-400' : 'text-violet-600'} />}
                value={maxDifficulty}
                onChange={setMaxDifficulty}
                min={1}
                max={10}
                placeholder="10"
                isDark={isDark}
                hint="1-10, 10 = все сложности"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ Manual word selection ═══ */}
        <AnimatePresence mode="wait">
          {wordMode === 'manual' && (
            <motion.div
              key="manual"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 overflow-hidden"
            >
              {/* Selected words */}
              <div>
                <div className="flex items-center justify-between mb-2 gap-2">
                  <span
                    className={cn('text-xs font-medium', isDark ? 'text-white/50' : 'text-stone-500')}
                  >
                    Выбрано слов: {selectedWords.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAutoFillManualWords}
                      disabled={manualAutoFillLoading || gridSize === ''}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                        manualAutoFillLoading || gridSize === ''
                          ? isDark
                            ? 'bg-white/10 text-white/30 cursor-not-allowed'
                            : 'bg-stone-100 text-stone-300 cursor-not-allowed'
                          : isDark
                            ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                            : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      )}
                    >
                      {manualAutoFillLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      Заполнить
                    </button>
                    <button
                      onClick={() => setShowWordSearch(true)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                        isDark
                          ? 'bg-violet-500/20 text-violet-300 hover:bg-violet-500/30'
                          : 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                      )}
                    >
                      <Search size={12} />
                      Найти слова
                    </button>
                  </div>
                </div>

                {selectedWords.length === 0 ? (
                  <div
                    className={cn(
                      'text-center py-6 rounded-xl border-2 border-dashed',
                      isDark ? 'border-white/10 text-white/30' : 'border-stone-200 text-stone-400'
                    )}
                  >
                    <BookOpen size={24} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Нажмите «Найти слова» чтобы добавить</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <AnimatePresence>
                      {selectedWords.map((w) => (
                        <WordChip
                          key={w._id}
                          word={w}
                          isDark={isDark}
                          onRemove={() => removeWord(w._id)}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Info about manual mode */}
              <div
                className={cn(
                  'p-3 rounded-xl border flex items-start gap-2',
                  isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'
                )}
              >
                <BookOpen
                  size={16}
                  className={isDark ? 'text-blue-400 shrink-0 mt-0.5' : 'text-blue-600 shrink-0 mt-0.5'}
                />
                <p className={cn('text-xs', isDark ? 'text-blue-300/70' : 'text-blue-700')}>
                  Эти конкретные слова будут использоваться каждый раз. Все игроки увидят одинаковый набор.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ Save Button ═══ */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={saving || levelNumber === ''}
          className={cn(
            'w-full py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-200 shadow-lg',
            saving || levelNumber === ''
              ? isDark
                ? 'bg-white/10 text-white/30'
                : 'bg-stone-200 text-stone-400'
              : isDark
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-violet-500/25 hover:shadow-violet-500/40'
                : 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-violet-400/25 hover:shadow-violet-400/40'
          )}
        >
          {saving ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Сохранение...
            </>
          ) : (
            <>
              <Save size={18} />
              {existingLevel ? 'Обновить уровень' : 'Создать уровень'}
            </>
          )}
        </motion.button>
      </main>

      {/* ═══ Word Search Modal ═══ */}
      <AnimatePresence>
        {showWordSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col"
          >
            {/* Backdrop */}
            <div
              className={cn('absolute inset-0', isDark ? 'bg-black/80' : 'bg-black/40')}
              onClick={() => setShowWordSearch(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className={cn(
                'relative mt-auto max-h-[85dvh] rounded-t-3xl flex flex-col overflow-hidden',
                isDark ? 'bg-stone-900' : 'bg-white'
              )}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className={cn('w-10 h-1 rounded-full', isDark ? 'bg-white/20' : 'bg-stone-300')} />
              </div>

              {/* Search Header */}
              <div className="px-4 pb-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className={cn('text-lg font-bold', isDark ? 'text-white' : 'text-stone-900')}>
                    Поиск слов
                  </h3>
                  <button
                    onClick={() => setShowWordSearch(false)}
                    className={cn(
                      'p-2 rounded-xl transition-colors',
                      isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-stone-100 hover:bg-stone-200'
                    )}
                  >
                    <X size={18} className={isDark ? 'text-white/60' : 'text-stone-500'} />
                  </button>
                </div>

                {/* Search input */}
                <div className="relative">
                  <Search
                    size={16}
                    className={cn(
                      'absolute left-3 top-1/2 -translate-y-1/2',
                      isDark ? 'text-white/30' : 'text-stone-400'
                    )}
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по бурятскому или русскому..."
                    autoFocus
                    className={cn(
                      'w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-colors',
                      isDark
                        ? 'bg-white/10 border border-white/10 text-white placeholder:text-white/30 focus:border-violet-500/50'
                        : 'bg-stone-100 border border-stone-200 text-stone-900 placeholder:text-stone-400 focus:border-violet-400'
                    )}
                  />
                </div>

                <div
                  className={cn(
                    'text-xs mt-2 flex items-center justify-between',
                    isDark ? 'text-white/30' : 'text-stone-400'
                  )}
                >
                  <span>
                    Выбрано: <strong>{selectedWords.length}</strong>
                  </span>
                  <span>Найдено: {searchTotal}</span>
                </div>
              </div>

              {/* Results */}
              <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-1.5">
                {searchLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2
                      size={20}
                      className={cn('animate-spin', isDark ? 'text-white/30' : 'text-stone-400')}
                    />
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className={cn('text-center py-8 text-sm', isDark ? 'text-white/30' : 'text-stone-400')}>
                    {searchQuery ? 'Ничего не найдено' : 'Введите запрос для поиска'}
                  </div>
                ) : (
                  searchResults.map((word) => (
                    <WordSearchRow
                      key={word._id}
                      word={word}
                      isDark={isDark}
                      isSelected={selectedWordIds.has(word._id)}
                      onToggle={() => toggleWord(word)}
                    />
                  ))
                )}
              </div>

              {/* Done button */}
              <div className={cn('p-4 border-t', isDark ? 'border-white/10' : 'border-stone-200')}>
                <button
                  onClick={() => setShowWordSearch(false)}
                  className={cn(
                    'w-full py-3 rounded-xl font-semibold transition-colors',
                    isDark
                      ? 'bg-violet-600 text-white hover:bg-violet-500'
                      : 'bg-violet-500 text-white hover:bg-violet-600'
                  )}
                >
                  Готово ({selectedWords.length} слов)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Delete Confirmation ═══ */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
          >
            <div className={cn('absolute inset-0', isDark ? 'bg-black/70' : 'bg-black/40')} onClick={() => setShowDeleteConfirm(false)} />
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={cn(
                'relative w-full max-w-sm rounded-2xl p-6 shadow-2xl',
                isDark ? 'bg-stone-800 border border-white/10' : 'bg-white border border-stone-200'
              )}
            >
              <div className="text-center mb-4">
                <div
                  className={cn(
                    'w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center',
                    'bg-red-500/20'
                  )}
                >
                  <Trash2 size={24} className="text-red-500" />
                </div>
                <h3 className={cn('text-lg font-bold', isDark ? 'text-white' : 'text-stone-900')}>
                  Удалить уровень {existingLevel?.levelNumber}?
                </h3>
                <p className={cn('text-sm mt-1', isDark ? 'text-white/50' : 'text-stone-500')}>
                  Уровень продолжит работать с автогенерацией
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl font-medium transition-colors',
                    isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  )}
                >
                  Отмена
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2',
                    'bg-red-500 text-white hover:bg-red-600'
                  )}
                >
                  {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  Удалить
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} isDark={isDark} onDismiss={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  );
};

export default AdminLevelEditorScreen;
