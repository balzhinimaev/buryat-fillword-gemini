// Урок учебника: цель, теория (буквы/лексика/фразы/грамматика/совет),
// карточки + квиз, практика-филлворды со звёздами, переход к следующему уроку.
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Layers,
  Lightbulb,
  MessageCircle,
  Play,
  SpellCheck,
  Star,
  Target,
} from 'lucide-react';
import { cn } from '../components/ui';
import { useTheme } from '../theme/ThemeContext';
import type { GameStore } from '../store/gameStore';
import { hintOf, useGameLang } from '../services/gameLang';
import {
  buildQuiz,
  fetchPracticeLessons,
  getQuizBest,
  getTextbook,
  isTheoryRead,
  markTheoryRead,
  type PracticeLessonInfo,
} from '../services/textbook';
import { TextbookQuiz } from '../components/TextbookQuiz';
import { TextbookFlashcards } from '../components/TextbookFlashcards';
import { burAudioUrl, hasBurAudio } from '../services/burAudio';
import { WaveAudioButton } from '../components/WaveAudioButton';

interface Props {
  store: GameStore;
}

/** заголовок секции: иконка в тонированном квадрате + подпись */
const SectionTitle: React.FC<{ icon: React.ReactNode; label: string; isDark: boolean; muted: string }> = ({
  icon, label, isDark, muted,
}) => (
  <div className="flex items-center gap-2.5 mb-3">
    <span
      className={cn(
        'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
        isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-100 text-amber-600',
      )}
    >
      {icon}
    </span>
    <span className={cn('text-[11px] font-bold uppercase tracking-[0.14em]', muted)}>{label}</span>
  </div>
);

export const TextbookLessonScreen: React.FC<Props> = ({ store }) => {
  const { theme, isDark } = useTheme();
  useGameLang(); // лексика показывает перевод на выбранном языке
  const slug = store.state.selectedTextbookUnit;
  const unit = getTextbook().units.find((u) => u.slug === slug);
  const [theoryRead, setTheoryRead] = useState(slug ? isTheoryRead(slug) : false);
  const [lessons, setLessons] = useState<Record<string, PracticeLessonInfo>>({});
  const [quizOpen, setQuizOpen] = useState(false);
  const [cardsOpen, setCardsOpen] = useState(false);
  const [quizBest, setQuizBest] = useState(slug ? getQuizBest(slug) : null);
  const learned = new Set(store.state.stats.learnedWords.map((w: string) => w.toUpperCase()));

  useEffect(() => {
    void fetchPracticeLessons().then(setLessons);
  }, []);

  // при переходе «следующий урок» экран остаётся смонтированным — синхронизируем
  useEffect(() => {
    setTheoryRead(slug ? isTheoryRead(slug) : false);
    setQuizBest(slug ? getQuizBest(slug) : null);
  }, [slug]);

  if (!unit) {
    return (
      <div className={cn('min-h-screen p-6', theme.backgrounds.primaryGradient, theme.text.primary)}>
        Урок не найден.
        <button className="block mt-4 underline" onClick={store.goBack}>Назад</button>
      </div>
    );
  }

  const units = getTextbook().units;
  const unitIdx = units.findIndex((u) => u.slug === unit.slug);
  const nextUnit = units[unitIdx + 1];
  const quizPassed = !!quizBest && quizBest.correct / quizBest.total >= 0.75;

  const card = cn(
    'rounded-2xl p-4 border',
    isDark ? cn(theme.backgrounds.card, theme.borders.subtle) : 'bg-white shadow-sm border-stone-100',
  );

  const toggleTheory = () => {
    markTheoryRead(unit.slug, !theoryRead);
    setTheoryRead(!theoryRead);
  };

  const fade = (i: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: Math.min(i * 0.05, 0.4), duration: 0.3 },
  });

  return (
    <div className={cn('min-h-screen flex flex-col', theme.backgrounds.primaryGradient)}>
      {/* Шапка урока */}
      <header className={cn('relative overflow-hidden p-4 pb-5', isDark ? '' : 'rounded-b-3xl shadow-lg', theme.header.bg, theme.header.text)}>
        <div className="absolute -top-12 -right-8 w-40 h-40 rounded-full bg-amber-500/15 blur-2xl pointer-events-none" />
        <div className="flex items-center gap-2">
          <button onClick={store.goBack} aria-label="Назад" className="p-2 -ml-2 rounded-xl active:bg-white/10">
            <ArrowLeft size={22} />
          </button>
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-60">
            урок {unitIdx + 1} из {units.length}
          </span>
        </div>
        <h1 className="text-xl font-extrabold leading-tight mt-1 px-1">
          {unit.title.replace(/^Урок \d+\. /, '')}
        </h1>
        <p className="text-xs opacity-70 mt-1.5 px-1 leading-relaxed">{unit.goal}</p>
      </header>

      <main className="flex-1 p-4 space-y-3.5 pb-10">
        {unit.intro && (
          <motion.p {...fade(0)} className={cn('text-sm leading-relaxed px-1', theme.text.secondary)}>
            {unit.intro}
          </motion.p>
        )}

        {unit.letters && unit.letters.length > 0 && (
          <motion.div {...fade(1)} className={card}>
            <SectionTitle icon={<SpellCheck size={14} />} label="Особые буквы и звуки" isDark={isDark} muted={theme.text.dimmed} />
            <div className={cn('divide-y', isDark ? 'divide-white/5' : 'divide-stone-100')}>
              {unit.letters.map((l) => (
                <div key={l.letter} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span
                    className={cn(
                      'min-w-[64px] text-center rounded-lg px-1.5 py-1.5 font-extrabold text-base leading-none',
                      isDark ? 'bg-white/5 text-amber-300' : 'bg-amber-50 text-amber-700',
                    )}
                  >
                    {l.letter}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className={cn('text-[13px] block leading-snug', theme.text.secondary)}>{l.sound}</span>
                    {(() => {
                      const exBur = l.example.split(' — ')[0].trim();
                      return hasBurAudio(exBur) ? (
                        <span className="flex items-center gap-2 flex-wrap mt-1.5">
                          <WaveAudioButton src={burAudioUrl(exBur)!} size="sm" />
                          <span className={cn('text-[11px]', theme.text.muted)}>{l.example}</span>
                        </span>
                      ) : (
                        <span className={cn('text-[11px] block mt-1', theme.text.muted)}>{l.example}</span>
                      );
                    })()}
                  </span>
                </div>
              ))}
            </div>
            <p className={cn('text-[10px] mt-3', theme.text.dimmed)}>
              🔊 Озвучка сгенерирована ИИ — произношение приближённое, ориентируйтесь на описания звуков.
            </p>
          </motion.div>
        )}

        {unit.vocab.length > 0 && (
          <motion.div {...fade(2)} className={card}>
            <SectionTitle icon={<BookOpen size={14} />} label="Слова урока" isDark={isDark} muted={theme.text.dimmed} />
            <div className={cn('divide-y', isDark ? 'divide-white/5' : 'divide-stone-100')}>
              {unit.vocab.map((w) => (
                <div key={w.bur} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                  <span className={cn('font-bold text-[15px] flex items-center gap-2 min-w-0', theme.text.primary)}>
                    <span className="truncate">{w.bur}</span>
                    {learned.has(w.bur.toUpperCase()) && (
                      <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" aria-label="выучено в игре" />
                    )}
                    {hasBurAudio(w.bur) && <WaveAudioButton src={burAudioUrl(w.bur)!} size="sm" />}
                  </span>
                  <span className={cn('text-[13px] text-right flex-shrink-0 max-w-[45%]', theme.text.secondary)}>
                    {hintOf({ ru: w.ru, translations: w.en ? { en: w.en } : undefined })}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {unit.phrases.length > 0 && (
          <motion.div {...fade(3)} className={card}>
            <SectionTitle icon={<MessageCircle size={14} />} label="Полезные фразы" isDark={isDark} muted={theme.text.dimmed} />
            <div className="space-y-2.5">
              {unit.phrases.map((p, i) => (
                <div
                  key={i}
                  className={cn(
                    'rounded-xl px-3 py-2.5 border-l-[3px]',
                    isDark ? 'bg-white/[0.03] border-l-amber-500/50' : 'bg-amber-50/50 border-l-amber-400',
                  )}
                >
                  <div className={cn('font-semibold text-[14px]', theme.text.primary)}>{p.bur}</div>
                  <div className={cn('text-xs mt-0.5', theme.text.muted)}>{p.ru}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {unit.grammar && (
          <motion.div {...fade(4)} className={card}>
            <SectionTitle icon={<BookOpen size={14} />} label={unit.grammar.title} isDark={isDark} muted={theme.text.dimmed} />
            <p className={cn('text-[13px] leading-[1.7] whitespace-pre-line', theme.text.secondary)}>
              {unit.grammar.text}
            </p>
          </motion.div>
        )}

        {unit.tip && (
          <motion.div
            {...fade(5)}
            className={cn(
              'rounded-2xl p-4 border bg-gradient-to-r',
              isDark ? 'from-amber-500/10 to-transparent border-amber-500/30' : 'from-amber-50 to-white border-amber-200',
            )}
          >
            <div className="flex items-start gap-2.5">
              <Lightbulb size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className={cn('text-[13px] leading-relaxed', theme.text.secondary)}>{unit.tip}</p>
            </div>
          </motion.div>
        )}

        {/* Действия: карточки + квиз */}
        <motion.div {...fade(6)} className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => setCardsOpen(true)}
            className={cn(
              'rounded-2xl py-3.5 px-3 font-bold text-[13px] flex flex-col items-center gap-1.5 border active:scale-[0.97] transition-transform',
              isDark ? cn(theme.backgrounds.card, theme.borders.subtle, theme.text.primary) : 'bg-white border-stone-200 text-stone-700 shadow-sm',
            )}
          >
            <Layers size={18} className="text-amber-500" />
            Карточки
          </button>
          <button
            onClick={() => setQuizOpen(true)}
            className={cn(
              'rounded-2xl py-3.5 px-3 font-bold text-[13px] flex flex-col items-center gap-1.5 text-white active:scale-[0.97] transition-transform shadow-md',
              quizPassed
                ? 'bg-gradient-to-br from-emerald-400 to-emerald-600'
                : 'bg-gradient-to-br from-amber-400 to-orange-500',
            )}
          >
            <Target size={18} />
            {quizBest ? `Квиз · ${quizBest.correct}/${quizBest.total}` : 'Квиз'}
          </button>
        </motion.div>

        {/* Теория изучена */}
        <motion.button
          {...fade(7)}
          onClick={toggleTheory}
          className={cn(
            'w-full rounded-2xl p-3.5 font-bold text-sm flex items-center justify-center gap-2 border transition-all active:scale-[0.985]',
            theoryRead
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 border-transparent text-white shadow-md'
              : isDark ? cn(theme.backgrounds.card, theme.borders.subtle, theme.text.primary) : 'bg-white border-stone-200 text-stone-700 shadow-sm',
          )}
        >
          <CheckCircle2 size={17} />
          {theoryRead ? 'Теория изучена' : 'Отметить теорию изученной'}
        </motion.button>

        {/* Практика */}
        {unit.practiceSlugs.length > 0 && (
          <motion.div {...fade(8)} className={card}>
            <SectionTitle icon={<Play size={14} />} label="Практика · найди слова в филлворде" isDark={isDark} muted={theme.text.dimmed} />
            <div className="space-y-2">
              {unit.practiceSlugs.map((ps, i) => {
                const info = lessons[ps];
                const stars = info?.stars ?? 0;
                return (
                  <button
                    key={ps}
                    onClick={() => store.selectCategory(ps)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-xl px-3 py-3 border text-left active:scale-[0.985] transition-transform',
                      isDark ? 'border-white/10 bg-white/[0.04]' : 'border-stone-200 bg-stone-50',
                    )}
                  >
                    <span
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                        stars > 0
                          ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                          : isDark ? 'bg-white/10 text-amber-400' : 'bg-amber-100 text-amber-600',
                      )}
                    >
                      <Play size={14} />
                    </span>
                    <span className={cn('flex-1 text-sm font-semibold truncate', theme.text.primary)}>
                      {info?.name ?? `Филлворд ${i + 1}`}
                    </span>
                    <span className="flex items-center gap-0.5 flex-shrink-0">
                      {[0, 1, 2].map((n) => (
                        <Star
                          key={n}
                          size={13}
                          className={n < stars ? 'text-amber-400 fill-amber-400' : isDark ? 'text-white/20' : 'text-stone-300'}
                        />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Следующий урок */}
        {nextUnit && (
          <motion.button
            {...fade(9)}
            onClick={() => store.navigateToTextbookUnit(nextUnit.slug)}
            className={cn(
              'w-full rounded-2xl p-4 flex items-center gap-3 border text-left active:scale-[0.985] transition-transform',
              isDark ? cn(theme.backgrounds.card, theme.borders.subtle) : 'bg-white border-stone-200 shadow-sm',
            )}
          >
            <div className="flex-1 min-w-0">
              <div className={cn('text-[10px] font-bold uppercase tracking-widest', theme.text.dimmed)}>
                следующий урок
              </div>
              <div className={cn('font-bold text-sm mt-0.5 truncate', theme.text.primary)}>
                {nextUnit.title.replace(/^Урок \d+\. /, '')}
              </div>
            </div>
            <span className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center flex-shrink-0">
              <ArrowRight size={15} />
            </span>
          </motion.button>
        )}
      </main>

      {cardsOpen && (
        <TextbookFlashcards title="Карточки" words={unit.vocab} onClose={() => setCardsOpen(false)} />
      )}
      {quizOpen && (
        <TextbookQuiz
          title="Проверь себя"
          makeQuestions={() => buildQuiz(unit)}
          saveSlug={unit.slug}
          onClose={() => setQuizOpen(false)}
          onFinished={() => setQuizBest(getQuizBest(unit.slug))}
        />
      )}
    </div>
  );
};
