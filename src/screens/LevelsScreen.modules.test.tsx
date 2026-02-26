import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import LevelsScreen from './LevelsScreen';
import { api, type CampaignOverviewResponse } from '../services/api';

const makeStore = () => ({
  state: { stats: { totalStars: 0 } },
  goBack: vi.fn(),
  selectCategory: vi.fn(),
  getLevelProgress: vi.fn(() => undefined),
});

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

describe('LevelsScreen thematic modules shelf', () => {
  it('renders modules shelf and NEW badge for eligible non-started module', async () => {
    const store = makeStore();

    const overview: CampaignOverviewResponse = {
      categories: [],
      modules: [
        {
          id: 'chapter-1',
          title: 'Сагаан һара / Сагаалган',
          titleBur: 'Сагаан һара',
          order: 1,
          requiredStars: 8,
          isUnlocked: true,
          earnedStars: 0,
          totalStars: 36,
          levels: [
            {
              id: 'lvl-1',
              slug: 'sagaan-hara-basic',
              name: 'Сагаан һара — базовое',
              difficulty: 'beginner',
              requiredStars: 8,
              isUnlocked: true,
              earnedStars: 0,
              maxStars: 3,
            },
          ],
        },
      ],
      totalStars: 36,
      earnedStars: 0,
      progressPercent: 0,
    };

    vi.spyOn(api, 'getCampaignOverview').mockResolvedValue(overview);

    render(<LevelsScreen store={store as any} />);

    expect(await screen.findByText('Тематические модули')).toBeInTheDocument();
    expect(await screen.findByText('Сагаан һара / Сагаалган')).toBeInTheDocument();
    expect(screen.getByText('Новый')).toBeInTheDocument();
  });

  it('opens first unlocked level when module card is clicked', async () => {
    const store = makeStore();

    const overview: CampaignOverviewResponse = {
      categories: [],
      modules: [
        {
          id: 'chapter-1',
          title: 'Сагаан һара / Сагаалган',
          order: 1,
          requiredStars: 0,
          isUnlocked: true,
          earnedStars: 0,
          totalStars: 6,
          levels: [
            {
              id: 'lvl-locked',
              slug: 'locked-level',
              name: 'Locked',
              difficulty: 'beginner',
              requiredStars: 0,
              isUnlocked: false,
              earnedStars: 0,
              maxStars: 3,
            },
            {
              id: 'lvl-open',
              slug: 'open-level',
              name: 'Open',
              difficulty: 'beginner',
              requiredStars: 2,
              isUnlocked: true,
              earnedStars: 0,
              maxStars: 3,
            },
          ],
        },
      ],
      totalStars: 6,
      earnedStars: 0,
      progressPercent: 0,
    };

    vi.spyOn(api, 'getCampaignOverview').mockResolvedValue(overview);
    const trackSpy = vi.spyOn(api, 'trackCampaignModuleOpened').mockResolvedValue({ ok: true });

    render(<LevelsScreen store={store as any} />);

    const moduleTitle = await screen.findByText('Сагаан һара / Сагаалган');
    fireEvent.click(moduleTitle);

    expect(trackSpy).toHaveBeenCalledWith('chapter-1', 'levels_screen');
    expect(store.selectCategory).toHaveBeenCalledWith('open-level');
  });
});
