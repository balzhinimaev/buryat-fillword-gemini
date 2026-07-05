// Границы ошибок для экранов: без них любое исключение в рендере (или упавший
// динамический импорт чанка) размонтировало ВСЁ дерево — пользователь оставался
// на тёмном пустом экране без кнопки «назад». Теперь показываем выход на главную.
import { Component } from 'react';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** при смене экрана сбрасываем состояние ошибки — даём новому экрану шанс */
  resetKey: string;
  onGoHome: () => void;
}

interface State {
  hasError: boolean;
}

export class ScreenErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('💥 Ошибка рендера экрана:', error);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  private handleGoHome = () => {
    this.setState({ hasError: false });
    this.props.onGoHome();
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 px-6 text-center bg-stone-50 dark:bg-stone-900">
        <div className="text-4xl">😔</div>
        <p className="text-base font-medium text-stone-800 dark:text-stone-100">
          Что-то пошло не так на этом экране
        </p>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Ошибка уже записана. Можно вернуться на главную и продолжить.
        </p>
        <div className="flex gap-3 mt-2">
          <button
            type="button"
            onClick={this.handleGoHome}
            className="px-5 py-2.5 rounded-xl font-semibold text-white bg-amber-600 hover:bg-amber-500 active:scale-95 transition"
          >
            На главную
          </button>
          <button
            type="button"
            onClick={this.handleReload}
            className="px-5 py-2.5 rounded-xl font-semibold text-stone-700 dark:text-stone-200 bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 active:scale-95 transition"
          >
            Перезагрузить
          </button>
        </div>
      </div>
    );
  }
}
