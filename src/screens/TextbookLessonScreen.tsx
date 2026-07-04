// Урок учебника: цель, введение, лексика, фразы, грамматика, совет + практика-филлворды.
import React, { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, CheckCircle2, Lightbulb, Play, Star, Target } from 'lucide-react';
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

interface Props {
  store: GameStore;
}

export const TextbookLessonScreen: React.FC<Props> = ({ store }) => {
  const { theme, isDark } = useTheme();
  useGameLang(); // лексика показывает перевод на выбранном языке
  const slug = store.state.selectedTextbookUnit;
  const unit = getTextbook().units.find((u) => u.slug === slug);
  const [theoryRead, setTheoryRead] = useState(slug ? isTheoryRead(slug) : false);
  const [lessons, setLessons] = useState<Record<string, PracticeLessonInfo>>({});
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizBest, setQuizBest] = useState(slug ? getQuizBest(slug) : null);

  useEffect(() => {
    void fetchPracticeLessons().then(setLessons);
  }, []);

  if (!unit) {
    return (
      <div className={cn('min-h-screen p-6', theme.backgrounds.primaryGradient, theme.text.primary)}>
        Урок не найден.
        <button className="block mt-4 underline" onClick={store.goBack}>Назад</button>
      </div>
    );
  }

  const cardCls = cn(
    'rounded-2xl p-4 border',
    isDark ? cn(theme.backgrounds.card, theme.borders.subtle) : 'bg-white shadow-sm border-stone-100',
  );

  const toggleTheory = () => {
    markTheoryRead(unit.slug, !theoryRead);
    setTheoryRead(!theoryRead);
  };

  return (
    <div className={cn('min-h-screen flex flex-col', theme.backgrounds.primaryGradient)}>
      <header className={cn('p-4 relative z-10', isDark ? '' : 'rounded-b-3xl shadow-lg', theme.header.bg, theme.header.text)}>
        <div className="flex items-center gap-3">
          <button onClick={store.goBack} aria-label="Назад" className="p-2 -ml-2 rounded-xl active:bg-white/10">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-lg font-bold flex-1 min-w-0 leading-tight">{unit.title}</h1>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-3 pb-8">
        <div className={cardCls}>
          <div className={cn('text-xs font-bold uppercase tracking-wider mb-1', theme.text.muted)}>Цель урока</div>
          <div className={cn('text-sm', theme.text.primary)}>{unit.goal}</div>
          {unit.intro && <p className={cn('text-sm mt-2 leading-relaxed', theme.text.secondary)}>{unit.intro}</p>}
        </div>

        {unit.vocab.length > 0 && (
          <div className={cardCls}>
            <div className={cn('text-xs font-bold uppercase tracking-wider mb-2', theme.text.muted)}>Слова урока</div>
            <div className="space-y-1.5">
              {unit.vocab.map((w) => (
                <div key={w.bur} className="flex items-baseline justify-between gap-3">
                  <span className={cn('font-bold text-[15px]', theme.text.primary)}>{w.bur}</span>
                  <span className={cn('text-sm text-right', theme.text.secondary)}>
                    {hintOf({ ru: w.ru, translations: w.en ? { en: w.en } : undefined })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {unit.phrases.length > 0 && (
          <div className={cardCls}>
            <div className={cn('text-xs font-bold uppercase tracking-wider mb-2', theme.text.muted)}>Полезные фразы</div>
            <div className="space-y-2">
              {unit.phrases.map((p, i) => (
                <div key={i}>
                  <div className={cn('font-semibold text-[15px]', theme.text.primary)}>{p.bur}</div>
                  <div className={cn('text-xs', theme.text.muted)}>{p.ru}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {unit.grammar && (
          <div className={cardCls}>
            <div className={cn('text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5', theme.text.muted)}>
              <BookOpen size={12} /> {unit.grammar.title}
            </div>
            <p className={cn('text-sm leading-relaxed whitespace-pre-line', theme.text.secondary)}>{unit.grammar.text}</p>
          </div>
        )}

        {unit.tip && (
          <div className={cn(cardCls, 'border-amber-500/40')}>
            <div className="flex items-start gap-2">
              <Lightbulb size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className={cn('text-sm leading-relaxed', theme.text.secondary)}>{unit.tip}</p>
            </div>
          </div>
        )}

        <button
          onClick={toggleTheory}
          className={cn(
            'w-full rounded-2xl p-3.5 font-bold text-sm flex items-center justify-center gap-2 border transition-all active:scale-[0.99]',
            theoryRead
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : isDark ? cn(theme.backgrounds.card, theme.borders.subtle, theme.text.primary) : 'bg-white border-stone-200 text-stone-700',
          )}
        >
          <CheckCircle2 size={17} />
          {theoryRead ? 'Теория изучена' : 'Отметить теорию изученной'}
        </button>

        <button
          onClick={() => setQuizOpen(true)}
          className={cn(
            'w-full rounded-2xl p-3.5 font-bold text-sm flex items-center justify-center gap-2 border transition-all active:scale-[0.99]',
            quizBest && quizBest.correct / quizBest.total >= 0.75
              ? 'bg-amber-500 border-amber-500 text-white'
              : isDark ? cn(theme.backgrounds.card, theme.borders.subtle, theme.text.primary) : 'bg-white border-stone-200 text-stone-700',
          )}
        >
          <Target size={17} />
          {quizBest
            ? `Квиз: лучший результат ${quizBest.correct}/${quizBest.total}`
            : 'Проверь себя — квиз по словам'}
        </button>

        {unit.practiceSlugs.length > 0 && (
          <div className={cardCls}>
            <div className={cn('text-xs font-bold uppercase tracking-wider mb-2', theme.text.muted)}>
              Практика — найди эти слова в филлворде
            </div>
            <div className="space-y-2">
              {unit.practiceSlugs.map((ps, i) => {
                const info = lessons[ps];
                return (
                  <button
                    key={ps}
                    onClick={() => store.selectCategory(ps)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 border text-left active:scale-[0.99]',
                      isDark ? 'border-white/10 bg-white/5' : 'border-stone-200 bg-stone-50',
                    )}
                  >
                    <Play size={15} className="text-amber-500 flex-shrink-0" />
                    <span className={cn('flex-1 text-sm font-medium truncate', theme.text.primary)}>
                      {info?.name ?? `Филлворд ${i + 1}`}
                    </span>
                    <span className={cn('flex items-center gap-0.5 text-xs', (info?.stars ?? 0) > 0 ? 'text-amber-500' : theme.text.muted)}>
                      <Star size={12} /> {info?.stars ?? 0}/3
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {(() => {
          const units = getTextbook().units;
          const idx = units.findIndex((u) => u.slug === unit.slug);
          const next = units[idx + 1];
          if (!next) return null;
          return (
            <button
              onClick={() => store.navigateToTextbookUnit(next.slug)}
              className={cn(
                'w-full rounded-2xl p-3.5 font-bold text-sm flex items-center justify-center gap-1.5 border active:scale-[0.99]',
                isDark ? cn(theme.backgrounds.card, theme.borders.subtle, theme.text.secondary) : 'bg-white border-stone-200 text-stone-600',
              )}
            >
              Следующий урок → {next.title.replace(/^Урок \d+\. /, '')}
            </button>
          );
        })()}
      </main>

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
