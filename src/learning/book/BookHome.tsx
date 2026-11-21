import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Bookmark, CheckCircle2, ChevronRight, Layers3, Search, Table2, X, ArrowUpRight } from 'lucide-react';
import { englishBook as book } from '../../data/books/en-ru';
import { englishCourse } from '../../courses/english';
import type { GameStore } from '../../store/gameStore';
import { PracticeHub } from './PracticeHub';
import { BookTable } from './BookTable';
import { chapterPassed, chapterMistakes, useBookProgress } from './bookProgress';
import { searchText, type BookChapter } from './model';

const index = new Map(book.chapters.map(ch => [ch.id, searchText(ch)]));
const parts = [
  { title: 'Первые шаги', description: 'От звуков и слов к первым предложениям', range: '01–08' },
  { title: 'Уверенная основа', description: 'Связываем мысли и выбираем нужную форму', range: '09–16' },
  { title: 'Больше возможностей', description: 'Сложные конструкции и точность речи', range: '17–24' },
];

export function BookHome({ store }: { store: GameStore }) {
  const { progress } = useBookProgress();
  const [tab, setTab] = useState<'chapters' | 'reference' | 'words' | 'practice'>('chapters');
  const [practiceSelection, setPracticeSelection] = useState({ chapter: 'en-01', set: 'en-01-practice' });
  const practiceChapter = book.chapters.find(ch => ch.id === practiceSelection.chapter)!;
  const [query, setQuery] = useState('');
  const searchInput = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState('all');
  const terms = query.trim().toLowerCase().replace(/ё/g, 'е').split(/\s+/).filter(Boolean);
  const chapters = book.chapters.filter(ch => terms.every(term => index.get(ch.id)?.includes(term)))
    .filter(ch => filter === 'all' || (filter === 'bookmarks' ? progress.chapters[ch.id]?.bookmark : chapterMistakes(progress.chapters[ch.id]) > 0));
  const references = book.references.filter(ref => terms.every(term => [ref.title, ref.note, ...ref.rows.flat()].join(' ').toLowerCase().replace(/ё/g, 'е').includes(term)));
  const read = book.chapters.filter(ch => progress.chapters[ch.id]?.read).length;
  const passed = book.chapters.filter(ch => chapterPassed(progress.chapters[ch.id])).length;
  const resume = book.chapters.find(ch => ch.id === progress.last) || book.chapters[0];
  const topics = useMemo(() => book.chapters.reduce((sum, ch) => sum + ch.sections.length, 0), []);
  const filtered = terms.length > 0 || filter !== 'all';
  const chapterCard = (ch: BookChapter) => {
    const state = progress.chapters[ch.id];
    return <button type="button" className="book-chapter-card" data-resume={progress.last === ch.id || undefined} key={ch.id} onClick={() => store.navigateToBookChapter(ch.id)}>
      <span className="book-chapter-number">{Number(ch.id.slice(3)).toString().padStart(2, '0')}</span>
      <span className="book-chapter-description">
        <span className="book-chapter-meta"><span className="book-level">{ch.level}</span><span>{ch.sections.length} тем</span>{state?.bookmark && <Bookmark size={14} aria-label="В закладках" />}</span>
        <strong>{ch.title}</strong><span className="book-chapter-goal">{ch.goal}</span>
        <span className="book-statuses">{progress.last === ch.id && <span className="book-current">Читаю сейчас</span>}{state?.read && <span>Прочитано</span>}{chapterPassed(state) && <span><CheckCircle2 size={13} aria-hidden="true" /> Проверка пройдена</span>}{chapterMistakes(state) > 0 && <span className="book-review-status">Повторить ошибки: {chapterMistakes(state)}</span>}</span>
      </span><ChevronRight className="book-card-arrow" size={18} aria-hidden="true" />
    </button>;
  };
  return <main className="book-layout book-home">
    <header className="book-top"><div className="book-top-context"><button type="button" className="book-icon" aria-label="Назад" onClick={store.goBack}><ArrowLeft size={20} /></button><span>Английский <span className="book-top-divider">/</span> Самоучитель</span></div><span className="book-monogram" aria-hidden="true">EN</span></header>
    <div className="book-library-tools">
      <nav className="book-tabs" aria-label="Разделы самоучителя">{([
        ['chapters', 'Главы', BookOpen], ['practice', 'Практика', CheckCircle2], ['reference', 'Таблицы', Table2], ['words', 'Практика слов', Layers3],
      ] as const).map(([id, label, Icon]) => <button type="button" key={id} aria-label={label} aria-current={tab === id ? 'page' : undefined} onClick={() => { setTab(id); setQuery(''); setFilter('all'); window.scrollTo({ top: 0, behavior: 'instant' }); }}><Icon size={16} aria-hidden="true" />{id === 'words' ? 'Слова' : label}</button>)}</nav>
      <div className="book-search"><Search size={18} aria-hidden="true" /><span className="book-sr-only">Поиск по правилам, примерам и таблицам</span><input ref={searchInput} aria-label="Поиск по правилам, примерам и таблицам" type="search" placeholder="Артикли, does, wish…" value={query} onChange={e => { setQuery(e.target.value); setFilter('all'); }} />{query && <button type="button" aria-label="Очистить поиск" onClick={() => { setQuery(''); searchInput.current?.focus(); }}><X size={18} aria-hidden="true" /></button>}</div>
    </div>
    {tab === 'chapters' && !terms.length && <>
    <section className="book-cover">
      <div className="book-cover-copy">
        <p className="book-eyebrow"><BookOpen size={15} aria-hidden="true" /> Ваш английский, каждый день</p>
        <h1>{book.title}</h1>
        <p className="book-cover-lead">Понять правило.<br />Увидеть в примерах. Применить в речи.</p>
        <div className="book-cover-facts"><span><strong>{book.chapters.length}</strong> главы</span><span><strong>{topics}</strong> тем</span><span><strong>{book.references.length}</strong> таблиц</span><span><strong>{book.chapters.reduce((sum, ch) => sum + ch.questions.length + (ch.practice || []).reduce((n, set) => n + set.questions.length, 0), 0)}</strong> заданий</span></div>
        <div className="book-cover-actions"><button type="button" className="book-button book-primary" onClick={() => store.navigateToBookChapter(resume.id)}>{progress.last ? 'Продолжить чтение' : 'Начать с первой главы'}<ArrowRight size={17} aria-hidden="true" /></button>
          <button type="button" className="book-cover-link" onClick={() => { setTab('practice'); setPracticeSelection({ chapter: resume.id, set: `${resume.id}-practice` }); setQuery(''); setFilter('all'); window.scrollTo({ top: 0, behavior: 'instant' }); }}>Перейти к практике <ArrowUpRight size={16} aria-hidden="true" /></button></div>
        {progress.last && <p className="book-resume-line">Вы остановились: {resume.title}</p>}
      </div>
      <div className="book-cover-art" aria-hidden="true">
        <div className="book-art-orbit" />
        <div className="book-volume"><span className="book-volume-series">BURLIVE / SELF-STUDY</span><span className="book-volume-title" lang="en">English<span>in practice.</span></span><div className="book-volume-mark">Aa<span>→</span></div><span className="book-volume-footer">GRAMMAR · EXAMPLES · PRACTICE</span></div>
        <span className="book-art-caption">Теория, которая становится навыком</span>
      </div>
    </section>
    <section className="book-progress-panel" aria-label="Ваш прогресс">
      <div className="book-progress-label"><BookOpen size={20} aria-hidden="true" /><div><strong>Ваш путь</strong><span>Шаг за шагом, в своём темпе</span></div></div>
      <div className="book-progress-item"><div><span>Прочитано: {read} / {book.chapters.length}</span><span aria-hidden="true">{Math.round(read / book.chapters.length * 100)}%</span></div><progress aria-label="Прочитанные главы" value={read} max={book.chapters.length} /></div>
      <div className="book-progress-item"><div><span>Проверено: {passed} / {book.chapters.length}</span><CheckCircle2 size={15} aria-hidden="true" /></div><progress aria-label="Главы с пройденной проверкой" value={passed} max={book.chapters.length} /></div>
    </section>
    <p className="book-small book-muted book-progress-note">Чтение и базовые проверки — отдельные шаги. Расширенные тренировки учитываются в разделе «Практика».</p>
    </>}
    {(tab === 'chapters' || terms.length > 0) && <section aria-labelledby="chapter-list-title">
      <div className="book-section-heading"><div><p className="book-eyebrow">{filtered ? 'Ваша подборка' : 'Содержание книги'}</p><h2 id="chapter-list-title">{terms.length ? 'Найденные главы' : 'Учиться по порядку'}</h2></div>
        <label className="book-filter"><span className="book-sr-only">Показать</span><select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Все главы</option><option value="bookmarks">Закладки</option><option value="review">С ошибками</option></select></label></div>
      <p className="book-muted book-small book-catalog-note">В каждой главе — диалог с переводом, сравнение смыслов и задание с образцом. Все главы открыты. Обозначения A1–B2 — ориентир сложности тем, не сертификат уровня.</p>
      {chapters.length === 0 && <div role="status" className="book-empty"><Search size={28} aria-hidden="true" /><p>{filter === 'bookmarks' ? 'Закладок пока нет. Добавьте главу кнопкой с закладкой при чтении.' : filter === 'review' ? 'Глав с ошибками пока нет.' : 'Ничего не найдено. Попробуйте другое слово.'}</p></div>}
      {filtered ? <div className="book-chapter-list">{chapters.map(chapterCard)}</div> : parts.map((part, n) => <section className="book-part" key={part.title} aria-labelledby={`book-part-${n}`}>
        <header className="book-part-heading"><span className="book-part-index" aria-hidden="true">0{n + 1}</span><div><h3 id={`book-part-${n}`}>{part.title}</h3><p>{part.description}</p></div><span className="book-part-range">{part.range}</span></header>
        <div className="book-chapter-list">{chapters.slice(n * 8, n * 8 + 8).map(chapterCard)}</div>
      </section>)}
    </section>}
    {(tab === 'reference' || terms.length > 0) && <section className="book-reference-section" aria-labelledby="reference-title">
      <div className="book-section-heading"><div><p className="book-eyebrow">Правило под рукой</p><h2 id="reference-title">Быстрый справочник</h2></div><Table2 size={25} aria-hidden="true" /></div>
      <p className="book-muted book-small">Сводки помогают вспомнить правило. Подробные объяснения и исключения — в главах.</p>
      {!references.length && <p role="status" className="book-empty">Подходящих таблиц не найдено.</p>}
      {references.map((ref, n) => <details className="book-reference" key={`${ref.id}-${Boolean(terms.length)}`} open={terms.length ? true : undefined}><summary><span className="book-reference-number" aria-hidden="true">{String(n + 1).padStart(2, '0')}</span><span>{ref.title}</span><ChevronRight size={18} aria-hidden="true" /></summary><div className="book-reference-body"><BookTable table={ref} caption={ref.title} /><p className="book-small book-muted">{ref.note}</p></div></details>)}
    </section>}
    {tab === 'practice' && !terms.length && <section aria-label="Тренировки по грамматике">
      <div className="book-practice-intro"><p className="book-eyebrow">Из знания — в навык</p><h1>Больше практики</h1><p>Одна тема или несколько правил сразу. Без таймера, с объяснением каждого ответа.</p><div className="book-practice-facts"><span><strong>24</strong> тренировки глав</span><span><strong>6</strong> смешанных проверок</span><span><strong>300</strong> дополнительных заданий</span></div></div>
      <label className="book-input-label">Глава для тренировки<select value={practiceSelection.chapter} onChange={e => setPracticeSelection({ chapter: e.target.value, set: `${e.target.value}-practice` })}>{book.chapters.map((ch, n) => <option key={ch.id} value={ch.id}>{n + 1}. {ch.title}</option>)}</select></label>
      <details className="book-mixed-picker"><summary>Смешанные проверки <span className="book-small">6 блоков · по 10 заданий</span><ChevronRight size={18} aria-hidden="true" /></summary><div className="book-mixed-list">{book.chapters.flatMap(ch => (ch.practice || []).filter(set => set.kind === 'mixed').map(set => <button type="button" className="book-button" key={set.id} aria-pressed={practiceSelection.set === set.id} onClick={() => setPracticeSelection({ chapter: ch.id, set: set.id })}>{set.title}</button>))}</div></details>
      <h3>{practiceChapter.title}</h3><PracticeHub key={`${practiceSelection.chapter}:${practiceSelection.set}`} chapter={practiceChapter} store={store} initialSet={practiceSelection.set} />
    </section>}
    {tab === 'words' && !terms.length && <section><div className="book-section-heading"><div><p className="book-eyebrow">От правила к слову</p><h2>Слова и филлворды</h2></div><Layers3 size={25} aria-hidden="true" /></div><p className="book-muted book-small">Знакомые восемь уроков: карточки, словарная проверка и игра. Их результаты сохраняются отдельно от грамматики.</p>
      <div className="book-chapter-list book-word-list">{englishCourse.lessons.map((lesson, n) => <button type="button" className="book-chapter-card" key={lesson.id} onClick={() => store.navigateToTextbookUnit(lesson.id)}><span className="book-chapter-number">{String(n + 1).padStart(2, '0')}</span><span className="book-chapter-description"><strong>{lesson.title}</strong><span className="book-small book-muted">{lesson.words.length} слов · Карточки и игра</span></span><ChevronRight className="book-card-arrow" size={18} aria-hidden="true" /></button>)}</div></section>}
    <footer className="book-footer"><div className="book-footer-title"><span className="book-monogram" aria-hidden="true">EN</span><strong>Английский. В своём темпе.</strong></div><p>Место чтения, закладки и проверки сохраняются для текущего аккаунта в этом браузере или приложении. Автоматического переноса на другое устройство пока нет.</p>
      <details><summary>Об этой книге</summary><p>Авторский учебный материал с русскими объяснениями. Основные конструкции — от первых фраз до сложных тем B2. Чтение книги не заменяет слушание, разговор и обратную связь преподавателя.</p><p>Ориентиры программы и проверка правил: <a href="https://www.teachingenglish.org.uk/publications/case-studies-insights-and-research/british-council-eaquals-core-inventory-general" target="_blank" rel="noreferrer">British Council / EAQUALS</a>, <a href="https://dictionary.cambridge.org/grammar/british-grammar/" target="_blank" rel="noreferrer">Cambridge Grammar</a>. Тексты книги не являются копией этих пособий.</p></details>
    </footer>
  </main>;
}
