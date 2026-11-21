import type { GameStore } from '../../store/gameStore';
import { activeCourseId } from '../../courses/activeCourse';
import { useTheme } from '../../theme/ThemeContext';
import { useBookProgress } from './bookProgress';
import { englishBook } from '../../data/books/en-ru';
import { BookHome } from './BookHome';
import { BookChapter } from './BookChapter';
import './book.css';
export default function EnglishBookScreen({ store }: { store: GameStore }) {
  const { isDark, themeId } = useTheme();
  const { owner } = useBookProgress();
  const chapter = englishBook.chapters.find(ch => ch.id === store.state.selectedBookChapter);
  if (activeCourseId() !== 'en-ru') return <div className="english-book" data-book-theme={themeId} data-tone={isDark ? 'dark' : 'light'}><main className="book-layout"><h1>Самоучитель английского</h1><p>Эта книга доступна в английском курсе.</p><button type="button" className="book-button" onClick={() => store.replaceScreen('menu')}>К моим курсам</button></main></div>;
  return <div className="english-book" data-book-theme={themeId} data-tone={isDark ? 'dark' : 'light'}>{store.state.currentScreen === 'bookChapter' && chapter
    ? <BookChapter key={`${owner}:${chapter.id}`} chapter={chapter} store={store} />
    : <BookHome key={owner} store={store} />}</div>;
}
