import { useRef, useState } from 'react';
import { CheckCircle2, CircleHelp, PenLine, RotateCcw, ArrowRight } from 'lucide-react';
import { answerText, BOOK_PASS_RATIO, isCorrect, type BookQuestion } from './model';
export function GrammarPractice({ questions, onResult, title = 'Проверь себя', headingId = 'practice-title', onReview }: {
  questions: BookQuestion[]; title?: string; headingId?: string; onReview?: (id: string) => void; onResult: (correct: number, total: number, wrong: string[]) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [orders, setOrders] = useState<Record<string, number[]>>({});
  const [checked, setChecked] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);
  const start = useRef<HTMLHeadingElement>(null);
  const questionNodes = useRef<Record<string, HTMLFieldSetElement | null>>({});
  const resultNode = useRef<HTMLDivElement>(null);
  const jumpTo = (id: string) => { const node = questionNodes.current[id]; node?.scrollIntoView?.({ block: 'start' }); node?.focus({ preventScroll: true }); };
  const correct = questions.filter(q => checked.includes(q.id) && isCorrect(q, answers[q.id] || '')).length;
  const check = (question: BookQuestion) => {
    if (!answers[question.id]?.trim() || checked.includes(question.id)) return;
    const next = [...checked, question.id];
    setChecked(next);
    if (next.length === questions.length) {
      const wrong = questions.filter(q => !isCorrect(q, answers[q.id] || '')).map(q => q.id);
      onResult(questions.length - wrong.length, questions.length, wrong); setFinished(true);
    }
  };
  const reset = () => { setAnswers({}); setOrders({}); setChecked([]); setFinished(false); start.current?.focus(); };
  return <section className="book-practice" aria-labelledby={headingId}>
    <div className="book-practice-heading"><p className="book-eyebrow"><PenLine size={16} aria-hidden="true" /> От теории к практике</p><h2 id={headingId} ref={start} tabIndex={-1}>{title}</h2>
    <p className="book-muted">Заданий: {questions.length}. Без таймера. Проверка пройдена от {Math.round(BOOK_PASS_RATIO * 100)}%. После ответа прочитайте объяснение.</p>
    <div className="book-practice-progress"><p className="book-small">Проверено {checked.length} из {questions.length}. Правильно: {correct}.</p><progress aria-label="Выполненные задания" value={checked.length} max={questions.length} /></div>
    <nav className="book-question-map" aria-label="Переход к заданию">{questions.map((q, n) => {
      const done = checked.includes(q.id); const ok = done && isCorrect(q, answers[q.id] || '');
      return <button type="button" key={q.id} data-state={done ? ok ? 'correct' : 'wrong' : undefined} aria-label={`Задание ${n + 1}${done ? ok ? ' — верно' : ' — разобрать ошибку' : ' — не проверено'}`} onClick={() => jumpTo(q.id)}><span>{n + 1}</span>{done && (ok ? <CheckCircle2 size={12} aria-hidden="true" /> : <CircleHelp size={12} aria-hidden="true" />)}</button>;
    })}</nav></div>
    {questions.map((q, index) => {
      const locked = checked.includes(q.id);
      const ok = locked && isCorrect(q, answers[q.id] || '');
      const selected = orders[q.id] || [];
      const next = [...questions.slice(index + 1), ...questions.slice(0, index)].find(question => !checked.includes(question.id));
      const chooseToken = (tokenIndex: number) => {
        if (q.type !== 'order' || locked) return;
        const next = [...selected, tokenIndex];
        setOrders(old => ({ ...old, [q.id]: next }));
        setAnswers(old => ({ ...old, [q.id]: next.map(n => q.tokens[n]).join(' ') }));
      };
      return <fieldset ref={node => { questionNodes.current[q.id] = node; }} tabIndex={-1} className="book-question" data-result={locked ? ok ? 'correct' : 'wrong' : undefined} key={q.id}>
        <legend><span className="book-question-number">{index + 1}.</span> {q.prompt}</legend>
        <p className="book-question-kind">{q.skill === 'correction' ? 'Исправьте ошибку' : q.skill === 'translation' ? 'Переведите фразу' : q.type === 'choice' ? 'Выберите ответ' : q.type === 'input' ? 'Впишите ответ' : 'Соберите предложение'}</p>
        {q.hint && <p className="book-small book-muted">{q.hint}</p>}
        {q.type === 'choice' && <div className="book-choices">{q.options.map(option => <label key={option} data-selected={answers[q.id] === option || undefined}>
          <input type="radio" name={q.id} value={option} disabled={locked} checked={answers[q.id] === option}
            onChange={() => setAnswers(old => ({ ...old, [q.id]: option }))} /><span>{option}</span>
        </label>)}</div>}
        {q.type === 'input' && <label className="book-input-label">Ваш ответ
          <input type="text" autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} disabled={locked}
            value={answers[q.id] || ''} onChange={e => setAnswers(old => ({ ...old, [q.id]: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); check(q); } }} />
        </label>}
        {q.type === 'order' && <div>
          <p className="book-small">Нажимайте слова по порядку. Одинаковые слова можно использовать отдельно.</p>
          <div className="book-tokens">{q.tokens.map((token, n) => <button type="button" key={n} disabled={locked || selected.includes(n)} onClick={() => chooseToken(n)}>{token}</button>)}</div>
          <p className="book-built" aria-live="polite">{answers[q.id] || 'Здесь появится ваше предложение'}</p>
          <button type="button" className="book-text-button" disabled={locked || !selected.length} onClick={() => {
            const next = selected.slice(0, -1); setOrders(old => ({ ...old, [q.id]: next }));
            setAnswers(old => ({ ...old, [q.id]: next.map(n => q.tokens[n]).join(' ') }));
          }}>Убрать последнее слово</button>
        </div>}
        {!locked && <button type="button" className="book-button book-primary" disabled={!answers[q.id]?.trim() || (q.type === 'order' && selected.length !== q.tokens.length)} onClick={() => check(q)}>Проверить ответ</button>}
        {locked && <div role="status" className={`book-feedback ${ok ? 'is-correct' : 'is-wrong'}`}>
          <strong className="book-feedback-title">{ok ? <CheckCircle2 size={18} aria-hidden="true" /> : <CircleHelp size={18} aria-hidden="true" />}{ok ? 'Верно.' : 'Пока неверно.'}</strong> {!ok && <p>Правильный ответ: <span lang="en">{answerText(q)}</span></p>}
          <p>{q.explanation}</p>
          {onReview && q.sectionIds && <div className="book-rule-links"><span>Повторить правило:</span>{q.sectionIds.map(id => <button className="book-text-button" type="button" key={id} onClick={() => onReview(id)}>Глава {Number(id.slice(3, 5))}, тема {id.split('-s')[1]}</button>)}</div>}
          <button type="button" className="book-button book-next-question" onClick={() => { if (next) jumpTo(next.id); else { resultNode.current?.scrollIntoView?.({ block: 'start' }); resultNode.current?.focus({ preventScroll: true }); } }}>{next ? 'Следующее задание' : 'К результату'}<ArrowRight size={16} aria-hidden="true" /></button>
        </div>}
      </fieldset>;
    })}
    {finished && <div ref={resultNode} tabIndex={-1} className="book-note book-practice-result" role="status"><div className="book-result-score" aria-hidden="true">{Math.round(correct / questions.length * 100)}<span>%</span></div><h3>{correct / questions.length >= BOOK_PASS_RATIO ? 'Проверка пройдена' : 'Стоит повторить правило'}</h3>
      <p>Правильно {correct} из {questions.length}. {correct === questions.length ? 'Теперь составьте собственные примеры.' : 'Разберите объяснения выше и попробуйте ещё раз.'}</p>
      <button type="button" className="book-button" onClick={reset}><RotateCcw size={16} aria-hidden="true" />Пройти проверку заново</button>
    </div>}
  </section>;
}
