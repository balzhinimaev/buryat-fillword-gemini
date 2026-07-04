// src/screens/DictionaryScreen.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Search, Check, Volume2, ArrowLeft, Loader2, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../components/ui';
import { StickyHeader } from '../components/StickyHeader';
import { useTheme } from '../theme/ThemeContext';
import { useBackButton } from '../hooks/useTelegram';
import type { GameStore } from '../store/gameStore';
import { getCategories, getWords, type ApiCategory, type ApiWord } from '../services/api';
import { hintOf, useGameLang } from '../services/gameLang';
import { WaveAudioButton } from '../components/WaveAudioButton';

const WORDS_PER_PAGE = 50;

interface DictionaryScreenProps {
  store: GameStore;
}

export const DictionaryScreen: React.FC<DictionaryScreenProps> = ({ store }) => {
  useGameLang(); // перерисовка подсказок при смене языка
  const { state, goBack, navigateToWord } = store;
  const { stats } = state;
  const { theme, isDark } = useTheme();

  useBackButton(() => goBack());

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showLearnedOnly, setShowLearnedOnly] = useState(false);
  const [expandedWordId, setExpandedWordId] = useState<string | null>(null);
  const [tooltipWordId, setTooltipWordId] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);

  // API data
  const [apiCategories, setApiCategories] = useState<ApiCategory[]>([]);
  const [words, setWords] = useState<ApiWord[]>([]);
  const [totalWords, setTotalWords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch categories on mount
  useEffect(() => {
    getCategories()
      .then(cats => setApiCategories(cats.filter(c => c.isActive)))
      .catch(err => console.error('Failed to load categories:', err));
  }, []);

  // Fetch words
  const fetchWords = useCallback(async (categoryId: string | null, offset = 0) => {
    const params: {
      status: 'verified';
      limit: number;
      offset: number;
      categoryId?: string;
    } = {
      status: 'verified',
      limit: WORDS_PER_PAGE,
      offset,
    };
    if (categoryId) params.categoryId = categoryId;

    return getWords(params);
  }, []);

  // Reload when category changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setWords([]);

    fetchWords(selectedCategory)
      .then(res => {
        if (!cancelled) {
          setWords(res.words);
          setTotalWords(res.total);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message || 'Ошибка загрузки');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [selectedCategory, fetchWords]);

  // Load more (pagination)
  const handleLoadMore = useCallback(() => {
    if (loadingMore || words.length >= totalWords) return;
    setLoadingMore(true);

    fetchWords(selectedCategory, words.length)
      .then(res => {
        setWords(prev => [...prev, ...res.words]);
        setTotalWords(res.total);
      })
      .catch(err => console.error('Failed to load more:', err))
      .finally(() => setLoadingMore(false));
  }, [loadingMore, words.length, totalWords, selectedCategory, fetchWords]);

  // Retry on error
  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    setWords([]);

    fetchWords(selectedCategory)
      .then(res => {
        setWords(res.words);
        setTotalWords(res.total);
      })
      .catch(err => setError(err.message || 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [selectedCategory, fetchWords]);

  // Client-side filtering (search + learned)
  const filteredWords = useMemo(() => {
    let result = words;

    if (showLearnedOnly) {
      result = result.filter(w => stats.learnedWords.includes(w.bur));
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        w => w.bur.toLowerCase().includes(query) || w.ru.toLowerCase().includes(query)
      );
    }

    return result;
  }, [words, showLearnedOnly, searchQuery, stats.learnedWords]);

  // Group by categories
  const wordsByCategory = useMemo(() => {
    if (selectedCategory) {
      const cat = apiCategories.find(c => c._id === selectedCategory);
      return [{ category: cat ?? null, words: filteredWords }];
    }

    const categoryMap = new Map(apiCategories.map(c => [c._id, c]));
    const grouped = new Map<string, ApiWord[]>();
    const uncategorized: ApiWord[] = [];

    for (const word of filteredWords) {
      if (word.categoryId && categoryMap.has(word.categoryId)) {
        const arr = grouped.get(word.categoryId) || [];
        arr.push(word);
        grouped.set(word.categoryId, arr);
      } else {
        uncategorized.push(word);
      }
    }

    const result: { category: ApiCategory | null; words: ApiWord[] }[] = [];

    for (const cat of apiCategories) {
      const catWords = grouped.get(cat._id);
      if (catWords && catWords.length > 0) {
        result.push({ category: cat, words: catWords });
      }
    }

    if (uncategorized.length > 0) {
      result.push({ category: null, words: uncategorized });
    }

    return result;
  }, [selectedCategory, filteredWords, apiCategories]);

  const handleSpeakClick = (wordId: string) => {
    setTooltipWordId(prev => prev === wordId ? null : wordId);
    setTimeout(() => setTooltipWordId(prev => prev === wordId ? null : prev), 2000);
  };

  // --- Category dropdown logic ---
  const selectedCategoryData = useMemo(
    () => apiCategories.find(c => c._id === selectedCategory) ?? null,
    [apiCategories, selectedCategory]
  );

  const toggleDropdown = useCallback(() => {
    if (!dropdownOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
      });
    }
    setDropdownOpen(prev => !prev);
  }, [dropdownOpen]);

  // Close dropdown on Escape
  useEffect(() => {
    if (!dropdownOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [dropdownOpen]);

  const hasMore = words.length < totalWords;

  return (
    <div className={cn(theme.backgrounds.primaryGradient, "min-h-[100dvh] flex flex-col relative overflow-x-hidden")}>
      {/* Sticky Header при скролле */}
      <StickyHeader
        title="Словарь"
        onBack={() => goBack()}
        rightElement={
          <div className={cn(
            "text-sm px-3 py-1 rounded-full flex items-center gap-1",
            isDark ? "bg-white/20 text-white" : "bg-black/10 text-stone-700"
          )}>
            <BookOpen size={14} />
            {stats.learnedWords.length}/{totalWords}
          </div>
        }
      />

      {/* Декоративный фон */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-terra-500/10 via-steppe-500/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-32 w-64 h-64 bg-terra-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className={cn(theme.header.bg, theme.header.text, "relative z-10 p-4 pb-4 rounded-b-3xl shadow-lg overflow-visible")}>
        <div className="flex items-center gap-4 mb-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => goBack()}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ArrowLeft size={24} className={theme.header.text} />
          </motion.button>
          <h1 className="text-xl font-bold flex-1">Словарь</h1>
          <div className="text-sm bg-white/20 px-3 py-1 rounded-full flex items-center gap-1">
            <BookOpen size={14} />
            {stats.learnedWords.length}/{totalWords}
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
          <input
            type="text"
            placeholder="Поиск слова..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </div>

        {/* Filters row */}
        <div className="flex items-center gap-2">
          {/* Learned toggle */}
          <button
            onClick={() => setShowLearnedOnly(!showLearnedOnly)}
            className={cn(
              'flex-none px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1',
              showLearnedOnly
                ? cn('bg-white/90', theme.text.accent)
                : 'bg-white/20 text-white'
            )}
          >
            <Check size={14} />
            Выученные
          </button>

          {/* Category dropdown trigger */}
          <div className="flex-1 min-w-0">
            <button
              ref={triggerRef}
              onClick={toggleDropdown}
              className={cn(
                'w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all',
                'focus:outline-none text-white',
                selectedCategoryData
                  ? 'bg-white/30 active:bg-white/35'
                  : 'bg-white/20 active:bg-white/25',
                dropdownOpen && 'ring-1 ring-white/30',
              )}
            >
              <span className="truncate">
                {selectedCategoryData
                  ? `${selectedCategoryData.emoji ?? ''} ${selectedCategoryData.name}`
                  : 'Все категории'}
              </span>
              <motion.span
                animate={{ rotate: dropdownOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown size={14} className="text-white/70" />
              </motion.span>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 overflow-auto relative z-10 pb-24">
        {/* Loading state */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-64"
          >
            <Loader2 size={40} className={cn("animate-spin mb-4", theme.text.muted)} />
            <p className={theme.text.muted}>Загрузка словаря...</p>
          </motion.div>
        )}

        {/* Error state */}
        {!loading && error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center h-64 text-center"
          >
            <div className={cn("w-20 h-20 rounded-full flex items-center justify-center mb-4", theme.backgrounds.card)}>
              <BookOpen size={40} className={theme.text.muted} />
            </div>
            <h3 className={cn("text-lg font-semibold mb-2", theme.text.secondary)}>
              Ошибка загрузки
            </h3>
            <p className={cn("mb-4 text-sm", theme.text.muted)}>
              {error}
            </p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleRetry}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors",
                isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              )}
            >
              <RefreshCw size={16} />
              Повторить
            </motion.button>
          </motion.div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredWords.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center h-64 text-center"
          >
            <div className={cn("w-20 h-20 rounded-full flex items-center justify-center mb-4", theme.backgrounds.card)}>
              <BookOpen size={40} className={theme.text.muted} />
            </div>
            <h3 className={cn("text-lg font-semibold mb-2", theme.text.secondary)}>
              Слов не найдено
            </h3>
            <p className={theme.text.muted}>
              Попробуйте изменить фильтры поиска
            </p>
          </motion.div>
        )}

        {/* Words list */}
        {!loading && !error && filteredWords.length > 0 && (
          <div className="space-y-1.5">
            {wordsByCategory.map(({ category, words: catWords }, groupIdx) => (
              <React.Fragment key={category?._id ?? 'uncategorized'}>
                {/* Category divider — compact inline separator */}
                {!selectedCategory && (
                  <div className={cn("flex items-center gap-2.5 px-1", groupIdx > 0 ? 'pt-3 pb-1' : 'pb-1')}>
                    <span className="text-sm">{category?.emoji ?? '📝'}</span>
                    <span className={cn("text-[11px] font-semibold uppercase tracking-wide", theme.text.muted)}>
                      {category?.name ?? 'Другое'}
                    </span>
                    <div className={cn("flex-1 h-px", isDark ? "bg-white/[0.08]" : "bg-stone-200/80")} />
                    <span className={cn("text-[10px] tabular-nums", theme.text.dimmed)}>
                      {catWords.length}
                    </span>
                  </div>
                )}

                {/* Word cards */}
                {catWords.map((word, index) => {
                  const isLearned = stats.learnedWords.includes(word.bur);
                  const globalIdx = groupIdx * 100 + index;
                  const isExpanded = expandedWordId === word._id;

                  const hasExample = word.exampleBur || word.exampleRu;
                  const hasPronunciation = !!word.pronunciation;
                  const hasSynonyms = word.synonyms && word.synonyms.length > 0;
                  const hasAntonyms = word.antonyms && word.antonyms.length > 0;
                  const hasDialect = !!word.dialectId?.name;
                  const hasPartOfSpeech = !!word.partOfSpeechId?.name;
                  const hasExtra = hasExample || hasPronunciation || hasSynonyms || hasAntonyms || hasDialect || hasPartOfSpeech;

                  return (
                    <motion.div
                      key={word._id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(globalIdx * 0.025, 0.4) }}
                      onClick={() => setExpandedWordId(prev => prev === word._id ? null : word._id)}
                      className={cn(
                        'relative rounded-2xl px-3 py-2.5 cursor-pointer',
                        'transition-all duration-200',
                        // Фон
                        isDark ? 'bg-white/[0.06]' : 'bg-white/80',
                        // Рамка
                        isDark ? 'border border-white/[0.06]' : 'border border-stone-200/60',
                        // Hover
                        isDark ? 'hover:bg-white/[0.10] hover:border-white/[0.12]'
                               : 'hover:bg-white hover:border-stone-300/70',
                        // Выученное
                        isLearned && (isDark
                          ? 'bg-emerald-500/[0.08] border-emerald-400/20 hover:bg-emerald-500/[0.14]'
                          : 'bg-emerald-50/60 border-emerald-200/50 hover:bg-emerald-50'),
                        // Раскрыто — чуть заметнее
                        isExpanded && (isDark
                          ? 'bg-white/[0.10] border-white/[0.14]'
                          : 'bg-white border-stone-300/80 shadow-sm'),
                      )}
                    >
                      {/* Collapsed row */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              'font-semibold text-[15px] truncate leading-tight',
                              theme.text.primary,
                            )}>
                              {word.bur.charAt(0) + word.bur.slice(1).toLowerCase()}
                            </span>
                            {word.audioUrl && (
                              <WaveAudioButton src={word.audioUrl} size="sm" className="flex-shrink-0" />
                            )}
                            {isLearned && (
                              <span className={cn(
                                'text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0',
                                isDark ? 'bg-emerald-400/15 text-emerald-400' : 'bg-emerald-100 text-emerald-600',
                              )}>
                                выучено
                              </span>
                            )}
                          </div>
                          <div className={cn('text-[11px] truncate mt-0.5 leading-none', theme.text.muted)}>
                            {hintOf(word)}
                          </div>
                        </div>

                        {/* Chevron */}
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex-shrink-0 pl-1"
                        >
                          <ChevronDown size={16} className={cn(
                            isDark ? 'text-white/25' : 'text-stone-400',
                          )} />
                        </motion.div>
                      </div>

                      {/* Expanded content */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            {/* Divider */}
                            <div className={cn(
                              "h-px my-2.5",
                              isDark ? "bg-white/[0.08]" : "bg-stone-200/80",
                            )} />

                            <div className="space-y-2">
                              {/* Part of speech + dialect */}
                              {(hasPartOfSpeech || hasDialect) && (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {hasPartOfSpeech && (
                                    <span className={cn(
                                      'text-[10px] font-medium px-2 py-0.5 rounded-full',
                                      isDark ? 'bg-white/[0.08] text-white/60' : 'bg-stone-100 text-stone-500',
                                    )}>
                                      {word.partOfSpeechId!.emoji} {word.partOfSpeechId!.name}
                                    </span>
                                  )}
                                  {hasDialect && (
                                    <span className={cn(
                                      'text-[10px] font-medium px-2 py-0.5 rounded-full',
                                      isDark ? 'bg-white/[0.08] text-white/60' : 'bg-stone-100 text-stone-500',
                                    )}>
                                      {word.dialectId!.name}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Pronunciation */}
                              {hasPronunciation && (
                                <div className="flex items-center gap-2">
                                  <span className={cn('text-[10px] uppercase tracking-wide font-medium', theme.text.dimmed)}>
                                    Произн.
                                  </span>
                                  <span className={cn('text-[12px] italic', theme.text.secondary)}>
                                    [{word.pronunciation}]
                                  </span>
                                </div>
                              )}

                              {/* Example */}
                              {hasExample && (
                                <div className={cn(
                                  'rounded-xl px-2.5 py-2',
                                  isDark ? 'bg-white/[0.04]' : 'bg-stone-50/80',
                                )}>
                                  {word.exampleBur && (
                                    <p className={cn('text-[12px] leading-relaxed', theme.text.primary)}>
                                      {word.exampleBur}
                                    </p>
                                  )}
                                  {word.exampleRu && (
                                    <p className={cn('text-[11px] leading-relaxed mt-0.5', theme.text.muted)}>
                                      {word.exampleRu}
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Synonyms */}
                              {hasSynonyms && (
                                <div className="flex items-start gap-2">
                                  <span className={cn('text-[10px] uppercase tracking-wide font-medium pt-0.5 flex-shrink-0', theme.text.dimmed)}>
                                    Син.
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {word.synonyms.map((s, i) => (
                                      <span key={i} className={cn(
                                        'text-[11px] px-1.5 py-0.5 rounded-md',
                                        isDark ? 'bg-white/[0.06] text-white/70' : 'bg-stone-100 text-stone-600',
                                      )}>
                                        {s}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Antonyms */}
                              {hasAntonyms && (
                                <div className="flex items-start gap-2">
                                  <span className={cn('text-[10px] uppercase tracking-wide font-medium pt-0.5 flex-shrink-0', theme.text.dimmed)}>
                                    Ант.
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {word.antonyms.map((a, i) => (
                                      <span key={i} className={cn(
                                        'text-[11px] px-1.5 py-0.5 rounded-md',
                                        isDark ? 'bg-white/[0.06] text-white/70' : 'bg-stone-100 text-stone-600',
                                      )}>
                                        {a}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* No extra info placeholder */}
                              {!hasExtra && (
                                <p className={cn('text-[11px]', theme.text.dimmed)}>
                                  Дополнительная информация пока не добавлена
                                </p>
                              )}

                              {/* Actions row */}
                              <div className="flex items-center gap-2 pt-1">
                                {/* Audio button (disabled) */}
                                <div className="relative">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleSpeakClick(word._id); }}
                                    className={cn(
                                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium cursor-not-allowed opacity-40",
                                      isDark ? 'bg-white/[0.06] text-white/60' : 'bg-stone-100 text-stone-500',
                                    )}
                                    title="В разработке"
                                  >
                                    <Volume2 size={12} />
                                    Озвучка
                                  </button>
                                  <AnimatePresence>
                                    {tooltipWordId === word._id && (
                                      <motion.div
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 4 }}
                                        transition={{ duration: 0.15 }}
                                        className={cn(
                                          "absolute -top-8 left-0 px-2 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap z-50 shadow-lg",
                                          isDark ? "bg-stone-700 text-stone-200" : "bg-stone-800 text-white",
                                        )}
                                      >
                                        В разработке
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>

                                <div className="flex-1" />

                                {/* Open full page */}
                                <button
                                  onClick={(e) => { e.stopPropagation(); navigateToWord(word._id); }}
                                  className={cn(
                                    "flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-medium transition-colors",
                                    isDark
                                      ? 'bg-white/[0.08] text-white/70 hover:bg-white/[0.14] active:bg-white/[0.18]'
                                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200 active:bg-stone-250',
                                  )}
                                >
                                  Подробнее
                                  <ChevronRight size={12} />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </React.Fragment>
            ))}

            {/* Load more */}
            {hasMore && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-center pt-3"
              >
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2 rounded-2xl font-medium text-sm transition-colors",
                    isDark
                      ? "bg-white/[0.06] border border-white/[0.06] text-white/70 hover:bg-white/10 disabled:opacity-50"
                      : "bg-white/80 border border-stone-200/60 text-stone-600 hover:bg-white disabled:opacity-50"
                  )}
                >
                  {loadingMore ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Загрузка...
                    </>
                  ) : (
                    <>
                      Показать ещё {Math.min(WORDS_PER_PAGE, totalWords - words.length)}
                    </>
                  )}
                </motion.button>
              </motion.div>
            )}
          </div>
        )}
      </main>

      {/* Category dropdown portal — rendered outside stacking contexts */}
      {createPortal(
        <AnimatePresence>
          {dropdownOpen && (
            <div key="category-dropdown">
              {/* Invisible backdrop to catch outside clicks */}
              <div
                className="fixed inset-0 z-[9998]"
                onClick={() => setDropdownOpen(false)}
              />
              {/* Dropdown menu */}
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                style={dropdownStyle}
                className={cn(
                  "fixed z-[9999] rounded-xl shadow-xl max-h-64 overflow-y-auto overscroll-contain",
                  isDark
                    ? "bg-stone-800 border border-white/10"
                    : "bg-white border border-stone-200 shadow-stone-200/50",
                )}
              >
                {/* All categories option */}
                <button
                  onClick={() => { setSelectedCategory(null); setDropdownOpen(false); }}
                  className={cn(
                    'w-full text-left px-3 py-2.5 text-sm font-medium transition-colors flex items-center gap-2',
                    'focus:outline-none',
                    !selectedCategory
                      ? (isDark ? 'bg-white/10 text-white' : 'bg-stone-100 text-stone-900')
                      : (isDark ? 'text-white/80 hover:bg-white/[0.06] active:bg-white/10' : 'text-stone-700 hover:bg-stone-50 active:bg-stone-100'),
                  )}
                >
                  <span className="text-base">📚</span>
                  <span>Все категории</span>
                  {!selectedCategory && <Check size={14} className="ml-auto opacity-60" />}
                </button>

                {/* Divider */}
                <div className={cn("h-px", isDark ? "bg-white/[0.08]" : "bg-stone-100")} />

                {/* Category items */}
                {apiCategories.map((cat) => (
                  <button
                    key={cat._id}
                    onClick={() => { setSelectedCategory(cat._id); setDropdownOpen(false); }}
                    className={cn(
                      'w-full text-left px-3 py-2.5 text-sm font-medium transition-colors flex items-center gap-2',
                      'focus:outline-none',
                      selectedCategory === cat._id
                        ? (isDark ? 'bg-white/10 text-white' : 'bg-stone-100 text-stone-900')
                        : (isDark ? 'text-white/80 hover:bg-white/[0.06] active:bg-white/10' : 'text-stone-700 hover:bg-stone-50 active:bg-stone-100'),
                    )}
                  >
                    <span className="text-base">{cat.emoji}</span>
                    <span className="truncate">{cat.name}</span>
                    {selectedCategory === cat._id && <Check size={14} className="ml-auto flex-shrink-0 opacity-60" />}
                  </button>
                ))}
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default DictionaryScreen;
