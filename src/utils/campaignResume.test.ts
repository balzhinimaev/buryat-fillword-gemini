import { describe, expect, it } from 'vitest';
import type { CampaignOverviewResponse } from '../services/api';
import { getPrimaryCampaignLevel, getResumeFirstLevelSlug, isUnfinishedStartedLevel } from './campaignResume';

function makeOverview(primary: Partial<CampaignOverviewResponse> = {}): CampaignOverviewResponse {
  return {
    categories: [
      {
        difficulty: 'beginner',
        name: 'Beginner',
        order: 1,
        requiredStars: 0,
        isUnlocked: true,
        totalStars: 9,
        earnedStars: 0,
        levels: [
          {
            id: 'l1',
            slug: 'greetings',
            name: 'Greetings',
            difficulty: 'beginner',
            order: 0,
            requiredStars: 0,
            isUnlocked: true,
            earnedStars: 0,
            attempts: 0,
            maxStars: 3,
          },
          {
            id: 'l2',
            slug: 'family',
            name: 'Family',
            difficulty: 'beginner',
            order: 1,
            requiredStars: 2,
            isUnlocked: false,
            earnedStars: 0,
            attempts: 0,
            maxStars: 3,
          },
        ],
      },
    ],
    totalStars: 9,
    earnedStars: 0,
    progressPercent: 0,
    ...primary,
  };
}

describe('campaignResume utils', () => {
  it('detects primary campaign level', () => {
    const overview = makeOverview();
    const level = getPrimaryCampaignLevel(overview);
    expect(level?.slug).toBe('greetings');
  });

  it('flags started but unfinished level for resume', () => {
    const level = {
      id: 'l1',
      slug: 'greetings',
      name: 'Greetings',
      difficulty: 'beginner' as const,
      requiredStars: 0,
      attempts: 2,
      earnedStars: 0,
    };

    expect(isUnfinishedStartedLevel(level)).toBe(true);
  });

  it('does not resume when primary level already completed', () => {
    const overview = makeOverview({
      categories: [
        {
          difficulty: 'beginner',
          name: 'Beginner',
          order: 1,
          requiredStars: 0,
          isUnlocked: true,
          totalStars: 9,
          earnedStars: 3,
          levels: [
            {
              id: 'l1',
              slug: 'greetings',
              name: 'Greetings',
              difficulty: 'beginner',
              order: 0,
              requiredStars: 0,
              isUnlocked: true,
              earnedStars: 1,
              attempts: 1,
              maxStars: 3,
              firstCompletedAt: '2026-02-26T10:00:00.000Z',
            },
          ],
        },
      ],
    });

    expect(getResumeFirstLevelSlug(overview)).toBeNull();
  });

  it('returns resume slug when primary level started but unfinished', () => {
    const overview = makeOverview({
      categories: [
        {
          difficulty: 'beginner',
          name: 'Beginner',
          order: 1,
          requiredStars: 0,
          isUnlocked: true,
          totalStars: 9,
          earnedStars: 0,
          levels: [
            {
              id: 'l1',
              slug: 'greetings',
              name: 'Greetings',
              difficulty: 'beginner',
              order: 0,
              requiredStars: 0,
              isUnlocked: true,
              earnedStars: 0,
              attempts: 2,
              maxStars: 3,
            },
          ],
        },
      ],
    });

    expect(getResumeFirstLevelSlug(overview)).toBe('greetings');
  });
});
