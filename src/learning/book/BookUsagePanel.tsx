import { useState } from 'react';
import { Languages, MessageSquare, PenLine, Check } from 'lucide-react';
import type { BookUsage } from './model';
export function BookUsagePanel({ usage, chapterId }: { usage: BookUsage; chapterId: string }) {
  const [translated, setTranslated] = useState(false);
  return <section className="book-section book-usage" data-book-section id={`${chapterId}-usage`} tabIndex={-1} aria-labelledby={`${chapterId}-usage-title`}>
    <p className="book-eyebrow"><MessageSquare size={16} aria-hidden="true" /> В живой речи</p>
    <h2 id={`${chapterId}-usage-title`}>{usage.title}</h2><p>{usage.situation}</p>
    <p className="book-small book-muted">Сначала прочитайте реплики по-английски. Определите, чего хотят собеседники, затем проверьте себя по переводу. А и Б — два участника разговора.</p>
    <div className="book-conversation"><div className="book-dialogue-toolbar"><span lang="en">EN <span aria-hidden="true">↔</span> RU</span><button type="button" className="book-button" aria-expanded={translated} aria-controls={`${chapterId}-dialogue`} onClick={() => setTranslated(value => !value)}><Languages size={16} aria-hidden="true" />{translated ? 'Скрыть перевод диалога' : 'Показать перевод диалога'}</button></div>
    <ol className="book-dialogue" id={`${chapterId}-dialogue`} aria-label="Диалог с переводом">{usage.dialogue.map(([en, ru], n) => <li key={n}>
      <span className="book-dialogue-speaker" aria-label={`Собеседник ${n % 2 ? 'Б' : 'А'}`}>{n % 2 ? 'Б' : 'А'}</span>
      <div><p lang="en">{en}</p><p className="book-muted" hidden={!translated}>{ru}</p></div>
    </li>)}</ol></div>
    <h3>Похожая форма — другой смысл</h3><dl className="book-contrast">{usage.contrast.map(([en, explanation]) => <div key={en}><dt lang="en">{en}</dt><dd>{explanation}</dd></div>)}</dl>
    <div className="book-note"><strong>Как выбрать конструкцию</strong><p>{usage.takeaway}</p></div>
    <div className="book-expression"><p className="book-eyebrow"><PenLine size={16} aria-hidden="true" /> Ваша практика</p><h3>Скажите по-своему</h3><p>{usage.task}</p><p className="book-small book-muted">Ответьте вслух или запишите в своих заметках. Это самостоятельная работа: здесь нет автоматической оценки или поля сохранения ответа.</p>
    <details className="book-usage-model"><summary>Сравнить с образцом</summary><div><p lang="en">{usage.model[0]}</p><p className="book-muted">{usage.model[1]}</p><p className="book-small">Это один из возможных ответов. Сравните смысл и конструкцию; ваши имена, детали и формулировки могут отличаться.</p></div></details>
    <h3>Самопроверка</h3><ul className="book-self-check">{usage.checklist.map(item => <li key={item}><Check size={16} aria-hidden="true" /><span>{item}</span></li>)}</ul></div>
  </section>;
}
