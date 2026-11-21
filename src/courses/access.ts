import { isAdditionalCourse } from './activeCourse';

export const isServerWordId = (id?: string | null): boolean => !!id && /^[a-f\d]{24}$/i.test(id);
export const supportsWordCommunity = (id?: string | null): boolean => !isAdditionalCourse() && isServerWordId(id);
const BURYAT_SCREENS = new Set(['community', 'loreArticle', 'contribute', 'leaderboard', 'admin',
  'adminCampaign', 'broadcast', 'adminLevelEditor', 'adminDailyWord', 'adminCampaignMaps',
  'adminDictionary', 'adminVoiceStudio', 'adminWordReview']);
export const canOpenCourseScreen = (screen: string): boolean => !isAdditionalCourse() || !BURYAT_SCREENS.has(screen);
