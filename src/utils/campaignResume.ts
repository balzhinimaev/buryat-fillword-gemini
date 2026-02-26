import type { CampaignOverviewLevel, CampaignOverviewResponse } from '../services/api';

function sortLevels(levels: CampaignOverviewLevel[]): CampaignOverviewLevel[] {
  return [...levels].sort((a, b) => {
    const reqA = a.requiredStars ?? 0;
    const reqB = b.requiredStars ?? 0;
    if (reqA !== reqB) return reqA - reqB;

    const orderA = a.order ?? 0;
    const orderB = b.order ?? 0;
    if (orderA !== orderB) return orderA - orderB;

    return (a.slug ?? '').localeCompare(b.slug ?? '');
  });
}

function sortCategories(categories: CampaignOverviewResponse['categories']) {
  return [...categories].sort((a, b) => {
    const orderA = a.order ?? 0;
    const orderB = b.order ?? 0;
    if (orderA !== orderB) return orderA - orderB;
    return (a.name ?? '').localeCompare(b.name ?? '');
  });
}

export function getPrimaryCampaignLevel(
  overview: CampaignOverviewResponse,
): CampaignOverviewLevel | null {
  const categories = sortCategories(overview.categories ?? []);
  for (const category of categories) {
    const levels = sortLevels(category.levels ?? []);
    if (levels.length > 0) {
      return levels[0]!;
    }
  }
  return null;
}

export function isUnfinishedStartedLevel(level: CampaignOverviewLevel): boolean {
  const attempts = level.attempts ?? 0;
  const earnedStars = level.earnedStars ?? 0;
  const completed = earnedStars > 0 || Boolean(level.firstCompletedAt);
  return attempts > 0 && !completed;
}

export function getResumeFirstLevelSlug(
  overview: CampaignOverviewResponse,
): string | null {
  const primary = getPrimaryCampaignLevel(overview);
  if (!primary) return null;
  if (!isUnfinishedStartedLevel(primary)) return null;
  return primary.slug;
}
