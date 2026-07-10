// Обратный отсчёт до повторной отправки кода на email
import { useEffect, useMemo, useState } from 'react';

export function useResendCountdown() {
  const [availableAtMs, setAvailableAtMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!availableAtMs) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [availableAtMs]);

  const secondsLeft = useMemo(() => {
    if (!availableAtMs) return 0;
    return Math.max(0, Math.ceil((availableAtMs - nowMs) / 1000));
  }, [availableAtMs, nowMs]);

  /** Запустить отсчёт на `seconds` секунд от текущего момента */
  const start = (seconds: number) => {
    const now = Date.now();
    setNowMs(now);
    setAvailableAtMs(now + seconds * 1000);
  };

  return { secondsLeft, canResend: secondsLeft === 0, start };
}
