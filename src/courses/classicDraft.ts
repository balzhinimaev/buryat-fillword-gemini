import { additionalCourse } from './activeCourse';
import { readProgress, writeProgress } from '../services/courseStorage';
import { draftBoard, readDraft, clearDraft } from './draft';
import { progressOwner } from '../services/progressStorage';
import type { GameState } from '../gameEngine';

export interface ClassicDraft { board: GameState; found: string[]; time: number; content: string }
const key = (slug: string) => `classic-campaign-draft:${slug}`;
function lessonFor(slug: string) { return additionalCourse()?.lessons.find(l => l.id === slug); }
export function readClassicDraft(slug: string): ClassicDraft | null {
  const course = additionalCourse();
  const lesson = lessonFor(slug);
  if (!course || !lesson) return null;
  const content = JSON.stringify(lesson.words);
  try {
    const raw = JSON.parse(readProgress(key(slug)) || 'null') as ClassicDraft | null;
    if (raw && raw.content === content && validDraft(raw, lesson.words.map(w => w.text.toUpperCase()))) return raw;
    // One-way bridge: the old generator is used only to recover an existing board.
    const legacy = readDraft(lesson, course);
    if (!legacy || legacy.found.length === lesson.words.length) return null;
    const board = draftBoard(lesson, legacy.seed, course, legacy.version);
    const draft: ClassicDraft = { content, time: 0,
      found: lesson.words.filter(w => legacy.found.includes(w.id)).map(w => w.text.toUpperCase()),
      board: { size: board.size, grid: board.grid, placedWords: board.words.map(p => ({
        word: { bur: p.word.text.toUpperCase(), ru: p.word.ru }, path: p.path,
      })) } };
    writeProgress(key(slug), JSON.stringify(draft));
    return draft;
  } catch { return null; }
}
function validDraft(draft: ClassicDraft, expected: string[]): boolean {
  const { board, found, time } = draft;
  if (!board || !Number.isInteger(board.size) || board.size < 2 || board.size > 20 ||
    !Array.isArray(board.grid) || board.grid.length !== board.size ||
    !board.grid.every(row => Array.isArray(row) && row.length === board.size && row.every(c => typeof c === 'string')) ||
    !Array.isArray(board.placedWords) || board.placedWords.length !== expected.length ||
    !Array.isArray(found) || new Set(found).size !== found.length || !found.every(w => expected.includes(w)) ||
    !Number.isFinite(time) || time < 0) return false;
  const seen = new Set<string>(); const words = new Set<string>();
  for (const p of board.placedWords) {
    if (!p.word || !expected.includes(p.word.bur) || words.has(p.word.bur) || !Array.isArray(p.path) || !p.path.length) return false;
    words.add(p.word.bur);
    let spelling = '';
    for (let i = 0; i < p.path.length; i++) {
      const c = p.path[i]; const id = `${c.r}:${c.c}`; const prev = p.path[i - 1];
      if (!Number.isInteger(c.r) || !Number.isInteger(c.c) || c.r < 0 || c.c < 0 || c.r >= board.size || c.c >= board.size || seen.has(id) ||
        (prev && Math.abs(prev.r - c.r) + Math.abs(prev.c - c.c) !== 1)) return false;
      seen.add(id); spelling += board.grid[c.r][c.c];
    }
    if (spelling !== p.word.bur) return false;
  }
  return true;
}
export function saveClassicDraft(slug: string, board: GameState, found: string[], time: number): void {
  const lesson = lessonFor(slug);
  if (!lesson) return;
  const draft = { board, found, time, content: JSON.stringify(lesson.words) };
  if (validDraft(draft, lesson.words.map(w => w.text.toUpperCase()))) writeProgress(key(slug), JSON.stringify(draft));
}
export function clearClassicDraft(slug: string): void {
  const course = additionalCourse(); const lesson = lessonFor(slug);
  if (!course || !lesson) return;
  writeProgress(key(slug), 'null');
  clearDraft(lesson, progressOwner(), course);
}
