import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import GameModeSelectScreen from './GameModeSelectScreen';
import { api, type CampaignOverviewResponse } from '../services/api';
import type { GameStore } from '../store/gameStore';

const makeStore = () => ({
  navigate: vi.fn(),
  goBack: vi.fn(),
  selectLevelPack: vi.fn(),
  isPackUnlocked: vi.fn(() => true),
  getPackProgress: vi.fn(() => ({ completed: 0, total: 50, stars: 0 })),
  selectCategory: vi.fn(),
  setCampaignResumeSlug: vi.fn(),
  setCampaignLandingView: vi.fn(),
  startDailyGame: vi.fn(),
  state: {
    campaignResumeSlug: null,
    stats: { totalStars: 0 },
    endlessProgress: { completedLevels: [] },
  },
});

const makeOverview = (): CampaignOverviewResponse => ({
  categories: [
    {
      difficulty: 'beginner',
      name: 'Начинающий',
      order: 1,
      levels: [
        { id: 'c1-l1', slug: 'c1-l1', earnedStars: 3, maxStars: 3 },
        { id: 'c1-l2', slug: 'c1-l2', earnedStars: 3, maxStars: 3 },
      ],
      totalStars: 12,
      earnedStars: 12,
    },
  ],
  modules: [
    {
      id: 'module-1',
      title: 'Сагаан һара / Сагаалган',
      order: 1,
      levels: [
        { id: 'm1-l1', slug: 'm1-l1', earnedStars: 2, maxStars: 3 },
        { id: 'm1-l2', slug: 'm1-l2', earnedStars: 0, maxStars: 3 },
      ],
      totalStars: 6,
      earnedStars: 2,
    },
  ],
  classicProgress: {
    totalStars: 12,
    earnedStars: 12,
    progressPercent: 100,
  },
  modulesProgress: {
    totalStars: 6,
    earnedStars: 2,
    progressPercent: 33.33,
  },
  overallProgress: {
    totalStars: 18,
    earnedStars: 14,
    progressPercent: 77.78,
  },
  totalStars: 18,
  earnedStars: 14,
  progressPercent: 77.78,
});

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

describe('GameModeSelectScreen segmented campaign progress', () => {
  it('shows first chapter progress separately from modules progress', async () => {
    const store = makeStore();

    vi.spyOn(api, 'getCampaignOverview').mockResolvedValue(makeOverview());
    vi.spyOn(api, 'getLevelModeProgress').mockRejectedValue(new Error('level mode unavailable'));
    vi.spyOn(api, 'getDailyWordToday').mockRejectedValue({ statusCode: 404 });

    render(<GameModeSelectScreen store={store as unknown as GameStore} />);

    await screen.findByText('Первая глава');

    // «Первая глава» теперь ведёт в модули и показывает их прогресс (2/6)
    expect(screen.getByText('2/6')).toBeInTheDocument();

    // Общий прогресс не должен подмешиваться в карточку первой главы
    expect(screen.queryByText('14/18')).not.toBeInTheDocument();
  });

  it('falls back to computed segmented progress when new summary fields are missing', async () => {
    const store = makeStore();
    const overview = makeOverview();

    delete overview.classicProgress;
    delete overview.modulesProgress;
    delete overview.overallProgress;

    vi.spyOn(api, 'getCampaignOverview').mockResolvedValue(overview);
    vi.spyOn(api, 'getLevelModeProgress').mockRejectedValue(new Error('level mode unavailable'));
    vi.spyOn(api, 'getDailyWordToday').mockRejectedValue({ statusCode: 404 });

    render(<GameModeSelectScreen store={store as unknown as GameStore} />);

    await screen.findByText('Первая глава');

    // Без summary-полей прогресс модулей считается из массива modules (2/6)
    expect(screen.getByText('2/6')).toBeInTheDocument();
  });
});
