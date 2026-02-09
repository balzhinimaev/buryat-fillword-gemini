// src/screens/AdminDailyWordScreen.tsx
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
  // Settings2,
  Grid3X3,
  Clock,
  BookOpen,
  ToggleLeft,
  ToggleRight,
  ListOrdered,
  ChevronDown,
  ChevronUp,
  GripVertical,
  CalendarDays,
  CalendarPlus,
} from 'lucide-react';
import { cn } from '../components/ui';
import { StickyHeader } from '../components/StickyHeader';
import { useTheme } from '../theme/ThemeContext';
import { useBackButton } from '../hooks/useTelegram';
import type { GameStore } from '../store/gameStore';
import {
  api,
  type DailyWordItem,
  type DailyWordDetailResponse,
  type DailyWordCreateRequest,
  type DailyWordUpdateRequest,
  type ApiWord,
  type ApiWordsResponse,
} from '../services/api';

interface AdminDailyWordScreenProps {
  store: GameStore;
}

interface SelectedWord {
  _id: string;
  bur: string;
  ru: string;
}

// ─── Toast ───────────────────────────────────────────────────────────
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
          ? isDark ? 'text-emerald-200' : 'text-emerald-800'
          : isDark ? 'text-red-200' : 'text-red-800'
      )}
    >
      {message}
    </p>
  </motion.div>
);

// ─── Number Input ────────────────────────────────────────────────────
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
        if (raw === '') { onChange(''); return; }
        const n = parseInt(raw, 10);
        if (!isNaN(n)) onChange(n);
      }}
      min={min}
      max={max}
      placeholder={placeholder}
      className={cn(
        'w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors outline-none',
        isDark
          ? 'bg-white/10 border border-white/10 text-white placeholder:text-white/30 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30'
          : 'bg-white border border-stone-200 text-stone-900 placeholder:text-stone-400 focus:border-orange-400 focus:ring-1 focus:ring-orange-300'
      )}
    />
    {hint && <p className={cn('text-xs mt-1', isDark ? 'text-white/30' : 'text-stone-400')}>{hint}</p>}
  </div>
);

// ─── Word Chip ───────────────────────────────────────────────────────
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
      isDark ? 'bg-orange-500/20 border border-orange-500/30' : 'bg-orange-50 border border-orange-200'
    )}
  >
    <div className="flex items-center gap-1.5 min-w-0">
      <GripVertical size={12} className={isDark ? 'text-white/20' : 'text-stone-300'} />
      <span className={cn('font-bold truncate', isDark ? 'text-orange-300' : 'text-orange-700')}>
        {word.bur}
      </span>
      <span className={cn('text-xs truncate', isDark ? 'text-white/40' : 'text-stone-500')}>
        {word.ru}
      </span>
    </div>
    <button
      onClick={onRemove}
      className={cn('p-0.5 rounded-full transition-colors shrink-0', isDark ? 'hover:bg-white/10' : 'hover:bg-stone-200')}
    >
      <X size={12} className={isDark ? 'text-white/40' : 'text-stone-400'} />
    </button>
  </motion.div>
);

// ─── Word Search Row ─────────────────────────────────────────────────
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
        ? isDark ? 'bg-orange-500/20 border border-orange-500/30' : 'bg-orange-50 border border-orange-200'
        : isDark ? 'bg-white/5 border border-white/5 hover:bg-white/10' : 'bg-white border border-stone-100 hover:bg-stone-50'
    )}
  >
    <div
      className={cn(
        'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors',
        isSelected ? 'bg-orange-500 border-orange-500' : isDark ? 'border-white/20' : 'border-stone-300'
      )}
    >
      {isSelected && <CheckCircle2 size={12} className="text-white" />}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className={cn('font-bold text-sm', isDark ? 'text-white' : 'text-stone-900')}>{word.bur}</span>
        {word.difficulty > 0 && (
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', isDark ? 'bg-white/10 text-white/50' : 'bg-stone-100 text-stone-500')}>
            d:{word.difficulty}
          </span>
        )}
      </div>
      <span className={cn('text-xs', isDark ? 'text-white/40' : 'text-stone-500')}>{word.ru}</span>
    </div>
  </motion.button>
);

// ═════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════

export const AdminDailyWordScreen: React.FC<AdminDailyWordScreenProps> = ({ store }) => {
  const { goBack, state } = store;
  const { isDark } = useTheme();

  useBackButton(() => goBack());

  const editDate = state.adminEditDailyDate; // null = new, 'YYYY-MM-DD' = edit
  const isNew = editDate === null;

  // ─── Form state ──────────────────────────────────────────────────
  const [date, setDate] = useState<string>(editDate ?? '');
  const [gridSize, setGridSize] = useState<number | ''>(6);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState<number | ''>(120);
  const [isActive, setIsActive] = useState(true);
  const [selectedWords, setSelectedWords] = useState<SelectedWord[]>([]);

  // ─── UI state ────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [existingItem, setExistingItem] = useState<DailyWordDetailResponse | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showWordSearch, setShowWordSearch] = useState(false);

  // ─── Word search state ──────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ApiWord[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTotal, setSearchTotal] = useState(0);

  // ─── All daily words list ───────────────────────────────────────
  const [allItems, setAllItems] = useState<DailyWordItem[]>([]);
  const [allItemsLoading, setAllItemsLoading] = useState(false);
  const [showAllItems, setShowAllItems] = useState(false);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  }, []);

  // ─── Load existing daily word ──────────────────────────────────
  useEffect(() => {
    if (isNew || !editDate) return;
    let isMounted = true;
    setLoading(true);

    (async () => {
      try {
        const data = await api.getDailyWordByDate(editDate);
        if (!isMounted) return;
        setExistingItem(data);
        setDate(data.date);
        setGridSize(data.gridSize);
        setTimeLimitSeconds(data.timeLimitSeconds);
        setIsActive(data.isActive);
        if (data.words && data.words.length > 0) {
          setSelectedWords(
            data.words.map((w) => ({ _id: w._id, bur: w.bur, ru: w.ru }))
          );
        }
      } catch (err) {
        if (isMounted) showToast('Не удалось загрузить филлворд', 'error');
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => { isMounted = false; };
  }, [editDate, isNew, showToast]);

  // ─── Load all items for listing ────────────────────────────────
  const loadAllItems = useCallback(async () => {
    setAllItemsLoading(true);
    try {
      const items = await api.getDailyWordList();
      setAllItems(items);
    } catch (err) {
      showToast('Не удалось загрузить список', 'error');
      console.error(err);
    } finally {
      setAllItemsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (showAllItems && allItems.length === 0) {
      loadAllItems();
    }
  }, [showAllItems, allItems.length, loadAllItems]);

  // ─── Word search ──────────────────────────────────────────────
  const searchWords = useCallback(async (query: string) => {
    setSearchLoading(true);
    try {
      const searchParams = new URLSearchParams();
      searchParams.set('status', 'verified');
      searchParams.set('isActiveInGame', 'true');
      searchParams.set('limit', '30');
      if (query.trim()) searchParams.set('search', query.trim());

      const response: ApiWordsResponse = await api.get(`/words?${searchParams.toString()}`);
      setSearchResults(response.words || []);
      setSearchTotal(response.total || 0);
    } catch (err) {
      console.error('Word search failed:', err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (!showWordSearch) return;
    const timer = setTimeout(() => searchWords(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, showWordSearch, searchWords]);

  const selectedWordIds = useMemo(() => new Set(selectedWords.map((w) => w._id)), [selectedWords]);

  const toggleWord = useCallback((word: ApiWord) => {
    setSelectedWords((prev) => {
      const exists = prev.find((w) => w._id === word._id);
      if (exists) return prev.filter((w) => w._id !== word._id);
      return [...prev, { _id: word._id, bur: word.bur, ru: word.ru }];
    });
  }, []);

  const removeWord = useCallback((id: string) => {
    setSelectedWords((prev) => prev.filter((w) => w._id !== id));
  }, []);

  // ─── Save ─────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!date) {
      showToast('Укажите дату (YYYY-MM-DD)', 'error');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      showToast('Формат даты: YYYY-MM-DD', 'error');
      return;
    }
    if (selectedWords.length === 0) {
      showToast('Добавьте хотя бы одно слово', 'error');
      return;
    }
    if (gridSize === '' || gridSize < 4 || gridSize > 10) {
      showToast('Размер сетки: от 4 до 10', 'error');
      return;
    }
    if (timeLimitSeconds === '' || timeLimitSeconds < 1) {
      showToast('Укажите лимит времени', 'error');
      return;
    }

    setSaving(true);
    try {
      if (existingItem) {
        const update: DailyWordUpdateRequest = {
          words: selectedWords.map((w) => w._id),
          gridSize: gridSize as number,
          timeLimitSeconds: timeLimitSeconds as number,
          isActive,
        };
        await api.updateDailyWord(existingItem.date, update);
        showToast(`Филлворд на ${existingItem.date} обновлён`, 'success');
      } else {
        const create: DailyWordCreateRequest = {
          date,
          words: selectedWords.map((w) => w._id),
          gridSize: gridSize as number,
          timeLimitSeconds: timeLimitSeconds as number,
          isActive,
        };
        const created = await api.createDailyWord(create);
        setExistingItem(created as unknown as DailyWordDetailResponse);
        showToast(`Филлворд на ${date} создан!`, 'success');
      }
    } catch (err) {
      const msg = (err as { message?: string })?.message || 'Ошибка сохранения';
      showToast(msg, 'error');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }, [date, gridSize, timeLimitSeconds, isActive, selectedWords, existingItem, showToast]);

  // ─── Delete ──────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!existingItem) return;
    setDeleting(true);
    try {
      await api.deleteDailyWord(existingItem.date);
      showToast(`Филлворд на ${existingItem.date} удалён`, 'success');
      setExistingItem(null);
      setTimeout(() => goBack(), 500);
    } catch (err) {
      const msg = (err as { message?: string })?.message || 'Ошибка удаления';
      showToast(msg, 'error');
      console.error(err);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [existingItem, showToast, goBack]);

  // ─── Navigate to edit another item ────────────────────────────
  const editItem = useCallback((item: DailyWordItem) => {
    store.navigateToDailyWordEditor(item.date);
  }, [store]);

  // ─── Helpers ──────────────────────────────────────────────────
  const formatDate = (d: string) => {
    try {
      const [y, m, day] = d.split('-');
      const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
      return `${parseInt(day)} ${months[parseInt(m) - 1]} ${y}`;
    } catch {
      return d;
    }
  };

  const todayUlanUde = useMemo(() => {
    const now = new Date();
    const uu = new Date(now.getTime() + 8 * 3600_000);
    return uu.toISOString().slice(0, 10);
  }, []);

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
        title={isNew ? 'Новый филлворд дня' : `Филлворд: ${editDate}`}
        onBack={goBack}
        rightElement={
          existingItem ? (
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
              <CalendarDays size={20} className={isDark ? 'text-orange-400' : 'text-orange-600'} />
              <h1 className={cn('text-xl font-bold', isDark ? 'text-white' : 'text-stone-900')}>
                {isNew ? 'Новый филлворд дня' : `Редактирование: ${formatDate(editDate!)}`}
              </h1>
            </div>
            <p className={cn('text-xs mt-0.5', isDark ? 'text-white/40' : 'text-stone-500')}>
              {existingItem ? 'Изменяйте параметры и сохраняйте' : 'Выберите дату, слова и настройки'}
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-5 pb-8 space-y-5">

        {/* ═══ All Daily Words List (collapsible) ═══ */}
        <section>
          <button
            onClick={() => setShowAllItems(!showAllItems)}
            className={cn(
              'w-full flex items-center justify-between p-3 rounded-xl border transition-colors',
              isDark
                ? 'bg-white/5 border-white/10 hover:bg-white/10'
                : 'bg-white border-stone-200 hover:bg-stone-50'
            )}
          >
            <div className="flex items-center gap-2">
              <ListOrdered size={16} className={isDark ? 'text-orange-400' : 'text-orange-600'} />
              <span className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-stone-900')}>
                Все филлворды дня
              </span>
              {allItems.length > 0 && (
                <span className={cn(
                  'text-xs px-1.5 py-0.5 rounded-full font-bold',
                  isDark ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-orange-700'
                )}>
                  {allItems.length}
                </span>
              )}
            </div>
            {showAllItems ? (
              <ChevronUp size={16} className={isDark ? 'text-white/40' : 'text-stone-400'} />
            ) : (
              <ChevronDown size={16} className={isDark ? 'text-white/40' : 'text-stone-400'} />
            )}
          </button>

          <AnimatePresence>
            {showAllItems && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-2 space-y-1.5">
                  {allItemsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 size={18} className={cn('animate-spin', isDark ? 'text-white/30' : 'text-stone-400')} />
                    </div>
                  ) : allItems.length === 0 ? (
                    <div className={cn('text-center py-4 text-sm', isDark ? 'text-white/30' : 'text-stone-400')}>
                      Нет филлвордов дня
                    </div>
                  ) : (
                    <>
                      {allItems.map((item) => {
                        const isToday = item.date === todayUlanUde;
                        const isPast = item.date < todayUlanUde;
                        return (
                          <motion.button
                            key={item._id}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => editItem(item)}
                            className={cn(
                              'w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left',
                              editDate === item.date
                                ? isDark ? 'bg-orange-500/20 border-orange-500/30' : 'bg-orange-50 border-orange-200'
                                : isDark ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-white border-stone-100 hover:bg-stone-50'
                            )}
                          >
                            <div className={cn(
                              'w-10 h-10 rounded-lg flex flex-col items-center justify-center text-[10px] font-bold leading-tight',
                              isToday
                                ? 'bg-orange-500 text-white'
                                : isPast
                                  ? isDark ? 'bg-white/5 text-white/40' : 'bg-stone-100 text-stone-400'
                                  : isDark ? 'bg-white/10 text-white' : 'bg-stone-100 text-stone-700'
                            )}>
                              <span className="text-[8px]">{item.date.slice(5, 7)}</span>
                              <span className="text-base">{parseInt(item.date.slice(8))}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={cn('font-medium text-sm', isDark ? 'text-white' : 'text-stone-900')}>
                                  {formatDate(item.date)}
                                </span>
                                {isToday && (
                                  <span className={cn(
                                    'text-[10px] px-1.5 py-0.5 rounded-full font-bold',
                                    'bg-orange-500 text-white'
                                  )}>
                                    сегодня
                                  </span>
                                )}
                                {!item.isActive && (
                                  <span className={cn(
                                    'text-[10px] px-1.5 py-0.5 rounded-full',
                                    isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'
                                  )}>
                                    выкл
                                  </span>
                                )}
                              </div>
                              <span className={cn('text-xs', isDark ? 'text-white/30' : 'text-stone-400')}>
                                {Array.isArray(item.words) ? item.words.length : 0} слов · {item.gridSize}x{item.gridSize} · {item.timeLimitSeconds}с
                              </span>
                            </div>
                          </motion.button>
                        );
                      })}
                      <button
                        onClick={() => store.navigateToDailyWordEditor(null)}
                        className={cn(
                          'w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed transition-colors',
                          isDark
                            ? 'border-white/10 text-white/40 hover:border-orange-500/30 hover:text-orange-400'
                            : 'border-stone-200 text-stone-400 hover:border-orange-300 hover:text-orange-600'
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

        {/* ═══ Date ═══ */}
        <div>
          <label className={cn('flex items-center gap-2 text-sm font-medium mb-1.5', isDark ? 'text-white/70' : 'text-stone-600')}>
            <CalendarPlus size={14} className={isDark ? 'text-orange-400' : 'text-orange-600'} />
            Дата (по Улан-Удэ)
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={!!existingItem}
            className={cn(
              'w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors outline-none',
              existingItem ? 'opacity-50 cursor-not-allowed' : '',
              isDark
                ? 'bg-white/10 border border-white/10 text-white placeholder:text-white/30 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30'
                : 'bg-white border border-stone-200 text-stone-900 placeholder:text-stone-400 focus:border-orange-400 focus:ring-1 focus:ring-orange-300'
            )}
          />
          <p className={cn('text-xs mt-1', isDark ? 'text-white/30' : 'text-stone-400')}>
            {existingItem ? 'Нельзя менять — удалите и создайте новый' : 'Формат YYYY-MM-DD, дата по Улан-Удэ (UTC+8)'}
          </p>
        </div>

        {/* ═══ Grid Size ═══ */}
        <NumberInput
          label="Размер сетки"
          icon={<Grid3X3 size={14} className={isDark ? 'text-orange-400' : 'text-orange-600'} />}
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
          icon={<Clock size={14} className={isDark ? 'text-orange-400' : 'text-orange-600'} />}
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
            Филлворд активен
          </label>
          <button
            onClick={() => setIsActive(!isActive)}
            className={cn(
              'w-12 h-7 rounded-full transition-colors relative',
              isActive ? 'bg-emerald-500' : isDark ? 'bg-white/10' : 'bg-stone-200'
            )}
          >
            <motion.div
              animate={{ x: isActive ? 22 : 2 }}
              className="absolute top-1 w-5 h-5 bg-white rounded-full shadow"
            />
          </button>
        </div>

        {/* ═══ Words selection ═══ */}
        <div>
          <label className={cn(
            'flex items-center gap-2 text-sm font-medium mb-2',
            isDark ? 'text-white/70' : 'text-stone-600'
          )}>
            <BookOpen size={14} className={isDark ? 'text-orange-400' : 'text-orange-600'} />
            Слова
          </label>

          <div className="flex items-center justify-between mb-2">
            <span className={cn('text-xs font-medium', isDark ? 'text-white/50' : 'text-stone-500')}>
              Выбрано слов: {selectedWords.length}
            </span>
            <button
              onClick={() => setShowWordSearch(true)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                isDark
                  ? 'bg-orange-500/20 text-orange-300 hover:bg-orange-500/30'
                  : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
              )}
            >
              <Search size={12} />
              Найти слова
            </button>
          </div>

          {selectedWords.length === 0 ? (
            <div className={cn(
              'text-center py-6 rounded-xl border-2 border-dashed',
              isDark ? 'border-white/10 text-white/30' : 'border-stone-200 text-stone-400'
            )}>
              <BookOpen size={24} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Нажмите «Найти слова» чтобы добавить</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <AnimatePresence>
                {selectedWords.map((w) => (
                  <WordChip key={w._id} word={w} isDark={isDark} onRemove={() => removeWord(w._id)} />
                ))}
              </AnimatePresence>
            </div>
          )}

          <div className={cn(
            'p-3 rounded-xl border flex items-start gap-2 mt-3',
            isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'
          )}>
            <BookOpen size={16} className={isDark ? 'text-amber-400 shrink-0 mt-0.5' : 'text-amber-600 shrink-0 mt-0.5'} />
            <p className={cn('text-xs', isDark ? 'text-amber-300/70' : 'text-amber-700')}>
              Все игроки в этот день увидят одинаковый набор слов. Один филлворд — одна дата.
            </p>
          </div>
        </div>

        {/* ═══ Save Button ═══ */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={saving || !date || selectedWords.length === 0}
          className={cn(
            'w-full py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-200 shadow-lg',
            saving || !date || selectedWords.length === 0
              ? isDark ? 'bg-white/10 text-white/30' : 'bg-stone-200 text-stone-400'
              : isDark
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-orange-500/25 hover:shadow-orange-500/40'
                : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-orange-400/25 hover:shadow-orange-400/40'
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
              {existingItem ? 'Обновить филлворд' : 'Создать филлворд'}
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
            <div
              className={cn('absolute inset-0', isDark ? 'bg-black/80' : 'bg-black/40')}
              onClick={() => setShowWordSearch(false)}
            />
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
              <div className="flex justify-center pt-3 pb-1">
                <div className={cn('w-10 h-1 rounded-full', isDark ? 'bg-white/20' : 'bg-stone-300')} />
              </div>

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

                <div className="relative">
                  <Search
                    size={16}
                    className={cn('absolute left-3 top-1/2 -translate-y-1/2', isDark ? 'text-white/30' : 'text-stone-400')}
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
                        ? 'bg-white/10 border border-white/10 text-white placeholder:text-white/30 focus:border-orange-500/50'
                        : 'bg-stone-100 border border-stone-200 text-stone-900 placeholder:text-stone-400 focus:border-orange-400'
                    )}
                  />
                </div>

                <div className={cn('text-xs mt-2 flex items-center justify-between', isDark ? 'text-white/30' : 'text-stone-400')}>
                  <span>Выбрано: <strong>{selectedWords.length}</strong></span>
                  <span>Найдено: {searchTotal}</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-1.5">
                {searchLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={20} className={cn('animate-spin', isDark ? 'text-white/30' : 'text-stone-400')} />
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

              <div className={cn('p-4 border-t', isDark ? 'border-white/10' : 'border-stone-200')}>
                <button
                  onClick={() => setShowWordSearch(false)}
                  className={cn(
                    'w-full py-3 rounded-xl font-semibold transition-colors',
                    isDark ? 'bg-orange-600 text-white hover:bg-orange-500' : 'bg-orange-500 text-white hover:bg-orange-600'
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
                <div className={cn('w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center', 'bg-red-500/20')}>
                  <Trash2 size={24} className="text-red-500" />
                </div>
                <h3 className={cn('text-lg font-bold', isDark ? 'text-white' : 'text-stone-900')}>
                  Удалить филлворд на {existingItem?.date}?
                </h3>
                <p className={cn('text-sm mt-1', isDark ? 'text-white/50' : 'text-stone-500')}>
                  Это действие нельзя отменить
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

export default AdminDailyWordScreen;
