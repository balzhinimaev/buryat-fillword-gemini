import { useState } from 'react';
import { CheckCircle2, Layers3, PenLine } from 'lucide-react';
import type { GameStore } from '../../store/gameStore';
import type { BookChapter } from './model';
import { GrammarPractice } from './GrammarPractice';
import { recordBookResult, recordPracticeResult, useBookProgress } from './bookProgress';
export function PracticeHub({ chapter, store, initialSet = 'base' }: { chapter: BookChapter; store: GameStore; initialSet?: string }) {
  const { progress, owner, update, storageError, setStorageError } = useBookProgress();
  const sets = [{ id: 'base', title: 'Базовая проверка', description: 'Пять заданий по основным правилам главы. Прежние результаты сохранены.', questions: chapter.questions }, ...(chapter.practice || [])];
  const start = sets.some(set => set.id === initialSet) ? initialSet : 'base';
  const [active, setActive] = useState(start);
  const [visited, setVisited] = useState([start]);
  const review = (sectionId: string) => {
    const target = document.getElementById(sectionId);
    if (target) { target.scrollIntoView?.({ block: 'start' }); target.focus({ preventScroll: true }); return; }
    const chapterId = sectionId.slice(0, 5);
    update(current => ({ ...current, chapters: { ...current.chapters, [chapterId]: { ...current.chapters[chapterId], section: sectionId } } }));
    store.navigateToBookChapter(chapterId);
  };
  return <section className="book-practice-hub" id="practice-title" tabIndex={-1} aria-label="Практика главы">
    <h2>Отработайте тему</h2>
    <p className="book-small book-muted">Базовая проверка, расширенная практика и смешанные задания учитываются отдельно. Незавершённые ответы сохраняются при переключении наборов на этом экране, но не после его закрытия.</p>
    <div className="book-practice-select" aria-label="Набор заданий">{sets.map(set => {
      const result = set.id === 'base' ? progress.chapters[chapter.id] : progress.chapters[chapter.id]?.practice?.[set.id];
      return <button type="button" className="book-button" aria-pressed={active === set.id} key={set.id} onClick={() => { setActive(set.id); setVisited(old => old.includes(set.id) ? old : [...old, set.id]); }}>
        <span className="book-set-icon" aria-hidden="true">{set.id === 'base' ? <CheckCircle2 size={20} /> : set.id.endsWith('-mixed') ? <Layers3 size={20} /> : <PenLine size={20} />}</span><strong>{set.title}</strong><span>{set.questions.length} заданий{result?.best !== undefined ? ` · Лучший: ${Math.round(result.best * 100)}%` : ' · Ещё не пройдено'}</span>
        {result?.latest !== undefined && <span>Последний: {Math.round(result.latest * 100)}% · Ошибок: {result.wrong?.length || 0}</span>}
      </button>;
    })}</div>
    {storageError && <p role="alert" className="book-note">Результат доступен в этой сессии, но хранилище недоступно: после закрытия он может не сохраниться.</p>}
    {sets.filter(set => visited.includes(set.id)).map(set => <div key={set.id} hidden={active !== set.id}>
      <p className="book-small">{set.description}</p>
      {set.id !== 'base' && <p className="book-small book-muted">Перевод проверяется в рамках условий задания, а не как свободный текст. Регистр, конечные . ! ? и запятые во вводимых фразах не влияют на результат; формы слов и апострофы важны.</p>}
      <GrammarPractice headingId={`${chapter.id}-${set.id}-title`} title={set.id === 'base' ? 'Проверь себя' : set.title} questions={set.questions} onReview={review}
        onResult={(correct, total, wrong) => setStorageError(!(set.id === 'base'
          ? recordBookResult(chapter.id, correct, total, wrong, owner)
          : recordPracticeResult(chapter.id, set.id, correct, total, wrong, owner)))} />
    </div>)}
  </section>;
}
