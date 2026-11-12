import { readProgress } from '../services/progressStorage';
import type { CampaignOverviewResponse } from '../services/api';

// Read-only bridge: no writes to stars, XP, attempts, sessions or old drafts.
export function localLegacyCompletions(owner: string): string[] {
  try {
    const records = JSON.parse(readProgress('offline_campaign_levels', owner) || '{}');
    return Object.entries(records).filter(([, value]) => {
      const record = value as { stars?: number; firstCompletedAt?: string } | null;
      return record && ((typeof record.stars === 'number' && record.stars > 0) || !!record.firstCompletedAt);
    }).map(([slug]) => slug);
  } catch { return []; }
}
export function remoteLegacyCompletions(overview: CampaignOverviewResponse): string[] {
  return [...(overview.modules || []), ...(overview.categories || [])].flatMap(group => group.levels || [])
    .filter(level => (level.earnedStars || 0) > 0 || !!level.firstCompletedAt).map(level => level.slug);
}
