import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Bookmark, Check, CheckCircle2, List, MessageSquare, X, BookOpen, PenLine, ChevronDown } from 'lucide-react';
import type { GameStore } from '../../store/gameStore';
import type { BookChapter as Chapter } from './model';
import { englishBook as book } from '../../data/books/en-ru';
import { BookUsagePanel } from './BookUsagePanel';
import { BookTable } from './BookTable';
import { PracticeHub } from './PracticeHub';
import { useBookProgress, chapterPassed } from './bookProgress';
export function BookChapter({ chapter, store }: { chapter: Chapter; store: GameStore }) {
  const { progress, update, storageError } = useBookProgress();
  const state = progress.chapters[chapter.id];
  const [outlineOpen, setOutlineOpen] = useState(false);
  const initialSection = useRef(state?.section);
  const latestSection = useRef(state?.section);
  const root = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const chapterIndex = book.chapters.findIndex(ch => ch.id === chapter.id);
  const next = book.chapters[chapterIndex + 1];
  const previous = book.chapters[chapterIndex - 1];
  useEffect(() => {
    update(current => ({ ...current, last: chapter.id }));
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(initialSection.current || '');
      if (target) target.scrollIntoView?.({ block: 'start' });
      else { heading.current?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }
    });
    return () => cancelAnimationFrame(frame);
  }, [chapter.id, update]);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => {
      const visible = entries.find(entry => entry.isIntersecting);
      const id = visible?.target.id;
      if (id && id !== latestSection.current) {
        latestSection.current = id;
        update(current => ({ ...current, chapters: { ...current.chapters, [chapter.id]: { ...current.chapters[chapter.id], section: id } } }));
      }
    }, { rootMargin: '-15% 0px -65% 0px', threshold: 0 });
    root.current?.querySelectorAll('[data-book-section]').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [chapter.id, update]);
  const jump = (id: string) => {
    const target = document.getElementById(id); target?.scrollIntoView?.({ block: 'start' }); target?.focus({ preventScroll: true });
  };
  return <main className="book-layout book-reader" ref={root} style={{ fontSize: progress.font }}>
    <header className="book-top"><button type="button" className="book-button" onClick={() => store.replaceScreen('textbook')}><ArrowLeft size={18} /> К оглавлению</button>
      <button type="button" className="book-icon" aria-label={state?.bookmark ? 'Убрать закладку' : 'Добавить закладку'} aria-pressed={Boolean(state?.bookmark)} onClick={() => update(current => ({ ...current, chapters: { ...current.chapters, [chapter.id]: { ...current.chapters[chapter.id], bookmark: !current.chapters[chapter.id]?.bookmark } } }))}><Bookmark fill={state?.bookmark ? 'currentColor' : 'none'} size={22} /></button>
    </header>
    <div className="book-reader-masthead">
      <p className="book-eyebrow"><span className="book-level">{chapter.level}</span> Глава {String(chapterIndex + 1).padStart(2, '0')} <span className="book-muted">/ {book.chapters.length}</span></p>
      <h1 ref={heading} tabIndex={-1}>{chapter.title}</h1><p className="book-lead">{chapter.goal}</p>
      <div className="book-reader-meta"><span>{chapter.sections.length} тем</span><span>{chapter.questions.length + (chapter.practice || []).reduce((sum, set) => sum + set.questions.length, 0)} заданий</span><span>Объяснения на русском</span></div>
    </div>
    <nav className="book-reading-route" aria-label="Маршрут главы"><button type="button" onClick={() => jump(chapter.sections[0].id)}><BookOpen size={18} aria-hidden="true" /><span><small>01 · Разобраться</small>Правила</span></button>{chapter.usage && <button type="button" aria-label="К диалогу ↓" onClick={() => jump(`${chapter.id}-usage`)}><MessageSquare size={18} aria-hidden="true" /><span><small>02 · Услышать смысл</small>Диалог</span></button>}<button type="button" aria-label="К проверке ↓" onClick={() => jump('practice-title')}><PenLine size={18} aria-hidden="true" /><span><small>03 · Закрепить</small>Практика</span></button></nav>
    <div className="book-reader-tools"><span className="book-small">Размер текста</span><button type="button" aria-label="Уменьшить текст" disabled={progress.font <= 16} onClick={() => update(current => ({ ...current, font: current.font - 2 }))}>A−</button><button type="button" aria-label="Увеличить текст" disabled={progress.font >= 22} onClick={() => update(current => ({ ...current, font: current.font + 2 }))}>A+</button><output className="book-font-value" aria-label="Текущий размер текста">{progress.font} px</output></div>
    {storageError && <p role="alert" className="book-note">Хранилище недоступно. Изменения доступны в этой сессии, но могут не сохраниться после закрытия.</p>}
    <div className="book-reader-grid">
    <aside className="book-reader-sidebar"><button type="button" className="book-outline-toggle" aria-expanded={outlineOpen} aria-controls="chapter-outline" onClick={() => setOutlineOpen(value => !value)}><List size={18} aria-hidden="true" /><span>Темы главы<small>{chapter.sections.length} правил</small></span><ChevronDown size={18} aria-hidden="true" /></button><nav className="book-outline" id="chapter-outline" hidden={!outlineOpen} aria-label="Темы главы">{chapter.sections.map((section, n) => <button type="button" key={section.id} aria-current={state?.section === section.id ? 'location' : undefined} onClick={() => { setOutlineOpen(false); jump(section.id); }}><span className="book-outline-number" aria-hidden="true">{String(n + 1).padStart(2, '0')}</span>{section.title}</button>)}</nav></aside>
    <div className="book-reading-content">
    {chapter.sections.map((section, n) => <section id={section.id} data-book-section key={section.id} className="book-section" tabIndex={-1}>
      <p className="book-eyebrow"><span className="book-section-index">{String(n + 1).padStart(2, '0')}</span> Разбираем правило</p><h2>{section.title}</h2><p>{section.body}</p>
      {section.table && <BookTable table={section.table} caption={section.title} />}
      <div className="book-examples"><p className="book-eyebrow">Как это звучит</p>{section.examples.map(([en, ru]) => <div key={en}><p lang="en">{en}</p><p className="book-muted">{ru}</p></div>)}</div>
    </section>)}
    <section className="book-section"><p className="book-eyebrow">Обратите внимание</p><h2>Типичные ошибки</h2><div className="book-mistakes">{chapter.mistakes.map(([wrong, right, reason]) => <div key={wrong}><p className="book-mistake-wrong"><X size={17} aria-hidden="true" /><span><span className="book-sr-only">Ошибка / неточность: </span>{wrong}</span></p><p className="book-mistake-right"><Check size={17} aria-hidden="true" /><span><strong>Верно:</strong> {right}</span></p><p className="book-mistake-reason">{reason}</p></div>)}</div></section>
    {chapter.usage && <BookUsagePanel usage={chapter.usage} chapterId={chapter.id} />}
    <section className="book-note book-speaking"><p className="book-eyebrow"><MessageSquare size={16} aria-hidden="true" /> Теперь ваша очередь</p><h2>{chapter.usage ? 'Ещё одно самостоятельное задание' : 'Примените в своей речи'}</h2><p>{chapter.task}</p><p className="book-small book-muted">Это самостоятельное задание. Свободный ответ автоматически не оценивается.</p></section>
    <div className="book-reading-complete"><CheckCircle2 size={24} aria-hidden="true" /><div><button type="button" className="book-button" aria-pressed={Boolean(state?.read)} onClick={() => update(current => ({ ...current, chapters: { ...current.chapters, [chapter.id]: { ...current.chapters[chapter.id], read: !current.chapters[chapter.id]?.read } } }))}>{state?.read && <Check size={17} />}{state?.read ? 'Прочитано — снять отметку' : 'Отметить главу прочитанной'}</button>
    <p className="book-small book-muted">Чтение и проверка — разные шаги.{state?.best !== undefined ? ` Лучший результат: ${Math.round(state.best * 100)}%. ${chapterPassed(state) ? 'Проверка пройдена.' : 'Для прохождения нужно 80%.'}` : ''}</p></div></div>
    <PracticeHub chapter={chapter} store={store} />
    {chapter.vocabulary && <aside className="book-note book-vocabulary"><p className="book-eyebrow"><ArrowUpRight size={16} aria-hidden="true" /> Следующий шаг</p><h3>Закрепите слова в игре</h3><p className="book-small">Карточки и филлворд дополняют главу. Их результат не заменяет грамматическую проверку.</p><button type="button" className="book-button" onClick={() => store.navigateToTextbookUnit(chapter.vocabulary!)}>Открыть связанный урок слов</button></aside>}
    </div></div>
    <nav className="book-bottom" aria-label="Продолжение чтения">{previous && <button type="button" className="book-button" onClick={() => store.navigateToBookChapter(previous.id)}>← Предыдущая глава</button>}<button type="button" className="book-button" onClick={() => store.replaceScreen('textbook')}>Оглавление</button>{next ? <button type="button" className="book-button book-primary" onClick={() => store.navigateToBookChapter(next.id)}>Далее: {next.title} →</button> : <p>Вы дошли до конца книги. Вернитесь к главам с ошибками и попробуйте применить правила в собственной речи.</p>}</nav>
  </main>;
}
