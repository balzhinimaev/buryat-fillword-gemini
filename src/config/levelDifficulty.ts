export type LevelDifficultyLabel = 'Лёгкий' | 'Средний' | 'Сложный';

export interface LevelDifficultyThresholds {
  mediumAvgAttempts: number;
  hardAvgAttempts: number;
  mediumAvgBestTimeSeconds: number;
  hardAvgBestTimeSeconds: number;
}

export const LEVEL_DIFFICULTY_THRESHOLDS_DEFAULTS: LevelDifficultyThresholds = {
  mediumAvgAttempts: 2.5,
  hardAvgAttempts: 4.5,
  mediumAvgBestTimeSeconds: 90,
  hardAvgBestTimeSeconds: 140,
};

let currentThresholds: LevelDifficultyThresholds = {
  ...LEVEL_DIFFICULTY_THRESHOLDS_DEFAULTS,
};

export function getLevelDifficultyThresholds(): LevelDifficultyThresholds {
  return { ...currentThresholds };
}

export function setLevelDifficultyThresholds(next: Partial<LevelDifficultyThresholds>): void {
  currentThresholds = {
    ...currentThresholds,
    ...next,
  };
}

export function resolveLevelDifficulty(
  avgAttempts?: number,
  avgBestTimeSeconds?: number,
): LevelDifficultyLabel {
  const t = currentThresholds;

  if (
    (typeof avgAttempts === 'number' && avgAttempts >= t.hardAvgAttempts) ||
    (typeof avgBestTimeSeconds === 'number' && avgBestTimeSeconds >= t.hardAvgBestTimeSeconds)
  ) {
    return 'Сложный';
  }

  if (
    (typeof avgAttempts === 'number' && avgAttempts >= t.mediumAvgAttempts) ||
    (typeof avgBestTimeSeconds === 'number' && avgBestTimeSeconds >= t.mediumAvgBestTimeSeconds)
  ) {
    return 'Средний';
  }

  return 'Лёгкий';
}
