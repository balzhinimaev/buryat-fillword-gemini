import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Layers, Loader2, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import { cn } from '../components/ui';
import { StickyHeader } from '../components/StickyHeader';
import { useTheme } from '../theme/ThemeContext';
import { useBackButton } from '../hooks/useTelegram';
import type { GameStore } from '../store/gameStore';
import {
  api,
  type ApiError,
  type CampaignAdminLevel,
  type CampaignAdminLevelCreateRequest,
  type CampaignChapter,
  type CampaignChapterCreateRequest,
  type CampaignContentStatus,
  type CampaignDifficulty,
} from '../services/api';

interface AdminCampaignScreenProps {
  store: GameStore;
}

type Tab = 'chapters' | 'lessons';

const STATUSES: CampaignContentStatus[] = ['draft', 'scheduled', 'published', 'archived'];
const DIFFICULTIES: CampaignDifficulty[] = ['beginner', 'intermediate', 'expert'];

const emptyChapterForm: CampaignChapterCreateRequest = {
  title: '',
  titleBur: '',
  description: '',
  descriptionBur: '',
  order: 1,
  status: 'draft',
  isActive: true,
};

const emptyLessonForm: CampaignAdminLevelCreateRequest = {
  slug: '',
  name: '',
  nameBur: '',
  difficulty: 'beginner',
  order: 0,
  icon: '📚',
  requiredStars: 0,
  words: [],
  timeLimitSeconds: 120,
  isActive: true,
  status: 'draft',
  chapterId: '',
  description: '',
  descriptionBur: '',
};

const statusLabel: Record<CampaignContentStatus, string> = {
  draft: 'Черновик',
  scheduled: 'По расписанию',
  published: 'Опубликовано',
  archived: 'Архив',
};

const toErrorMessage = (error: unknown): string => {
  const apiError = error as Partial<ApiError>;
  if (Array.isArray(apiError.message)) return apiError.message.join(', ');
  if (typeof apiError.message === 'string' && apiError.message.length > 0) return apiError.message;
  if (error instanceof Error && error.message) return error.message;
  return 'Произошла ошибка';
};

const parseWordsTextarea = (value: string): Array<{ bur: string; ru: string }> => {
  return value
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [burRaw, ...ruParts] = line.split('|');
      const bur = (burRaw ?? '').trim().toUpperCase();
      const ru = ruParts.join('|').trim();
      return { bur, ru };
    })
    .filter(item => item.bur.length > 0 && item.ru.length > 0);
};

const wordsToTextarea = (words?: Array<{ bur: string; ru: string }>): string => {
  if (!words || words.length === 0) return '';
  return words.map(w => `${w.bur}|${w.ru}`).join('\n');
};

export const AdminCampaignScreen: React.FC<AdminCampaignScreenProps> = ({ store }) => {
  const { goBack, navigateToCampaignMapEditor } = store;
  const { isDark, theme } = useTheme();

  useBackButton(() => goBack());

  const [tab, setTab] = useState<Tab>('chapters');
  const [error, setError] = useState<string | null>(null);

  const [chapters, setChapters] = useState<CampaignChapter[]>([]);
  const [levels, setLevels] = useState<CampaignAdminLevel[]>([]);

  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingLevels, setLoadingLevels] = useState(false);
  const [saving, setSaving] = useState(false);

  const [chapterForm, setChapterForm] = useState<CampaignChapterCreateRequest>(emptyChapterForm);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);

  const [lessonForm, setLessonForm] = useState<CampaignAdminLevelCreateRequest>(emptyLessonForm);
  const [lessonWordsRaw, setLessonWordsRaw] = useState('');
  const [editingLessonSlug, setEditingLessonSlug] = useState<string | null>(null);

  const [lessonFilterChapterId, setLessonFilterChapterId] = useState<string>('');
  const [lessonFilterStatus, setLessonFilterStatus] = useState<string>('');
  const [lessonSearch, setLessonSearch] = useState('');

  const chapterOrderHint = useMemo(() => {
    const maxOrder = chapters.reduce((max, c) => Math.max(max, c.order ?? 0), 0);
    return maxOrder + 1;
  }, [chapters]);

  const loadChapters = useCallback(async () => {
    try {
      setLoadingChapters(true);
      setError(null);
      const data = await api.getCampaignAdminChapters();
      setChapters(data);
    } catch (e) {
      setError(toErrorMessage(e));
    } finally {
      setLoadingChapters(false);
    }
  }, []);

  const loadLevels = useCallback(async () => {
    try {
      setLoadingLevels(true);
      setError(null);
      const data = await api.getCampaignAdminLevels({
        chapterId: lessonFilterChapterId || undefined,
        status: (lessonFilterStatus || undefined) as CampaignContentStatus | undefined,
        search: lessonSearch.trim() || undefined,
      });
      setLevels(data);
    } catch (e) {
      setError(toErrorMessage(e));
    } finally {
      setLoadingLevels(false);
    }
  }, [lessonFilterChapterId, lessonFilterStatus, lessonSearch]);

  useEffect(() => {
    void loadChapters();
  }, [loadChapters]);

  useEffect(() => {
    void loadLevels();
  }, [loadLevels]);

  const resetChapterForm = () => {
    setEditingChapterId(null);
    setChapterForm({
      ...emptyChapterForm,
      order: chapterOrderHint,
    });
  };

  const resetLessonForm = () => {
    setEditingLessonSlug(null);
    setLessonForm(emptyLessonForm);
    setLessonWordsRaw('');
  };

  const onEditChapter = (chapter: CampaignChapter) => {
    setEditingChapterId(chapter.id);
    setChapterForm({
      title: chapter.title,
      titleBur: chapter.titleBur ?? '',
      description: chapter.description ?? '',
      descriptionBur: chapter.descriptionBur ?? '',
      order: chapter.order,
      status: chapter.status,
      isActive: chapter.isActive,
    });
    setTab('chapters');
  };

  const onEditLesson = async (slug: string) => {
    try {
      setSaving(true);
      const level = await api.getCampaignAdminLevel(slug);
      setEditingLessonSlug(level.slug);
      setLessonForm({
        slug: level.slug,
        name: level.name,
        nameBur: level.nameBur,
        difficulty: level.difficulty,
        order: level.order,
        icon: level.icon,
        requiredStars: level.requiredStars,
        words: level.words ?? [],
        timeLimitSeconds: level.timeLimitSeconds,
        isActive: level.isActive,
        status: level.status,
        chapterId: level.chapterId ?? '',
        description: level.description ?? '',
        descriptionBur: level.descriptionBur ?? '',
      });
      setLessonWordsRaw(wordsToTextarea(level.words));
      setTab('lessons');
    } catch (e) {
      setError(toErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const saveChapter = async () => {
    if (!chapterForm.title.trim()) {
      setError('Введите название главы');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      if (editingChapterId) {
        await api.updateCampaignAdminChapter(editingChapterId, chapterForm);
      } else {
        await api.createCampaignAdminChapter(chapterForm);
      }
      await loadChapters();
      resetChapterForm();
    } catch (e) {
      setError(toErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const saveLesson = async () => {
    const parsedWords = parseWordsTextarea(lessonWordsRaw);

    if (!lessonForm.slug.trim()) {
      setError('Введите slug урока');
      return;
    }

    if (!lessonForm.name.trim()) {
      setError('Введите название урока');
      return;
    }

    if (!lessonForm.chapterId) {
      setError('Выберите главу');
      return;
    }

    if (!editingLessonSlug && parsedWords.length < 3) {
      setError('Для нового урока нужно минимум 3 слова (формат BUR|RU)');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload: CampaignAdminLevelCreateRequest = {
        ...lessonForm,
        words: parsedWords.length > 0 ? parsedWords : lessonForm.words,
      };

      if (editingLessonSlug) {
        const { slug: _ignoredSlug, ...updateData } = payload;
        await api.updateCampaignAdminLevel(editingLessonSlug, updateData);
      } else {
        await api.createCampaignAdminLevel(payload);
      }

      await loadLevels();
      resetLessonForm();
    } catch (e) {
      setError(toErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const removeLesson = async (slug: string) => {
    if (!window.confirm(`Удалить урок ${slug}?`)) return;

    try {
      setSaving(true);
      setError(null);
      await api.deleteCampaignAdminLevel(slug);
      await loadLevels();
      if (editingLessonSlug === slug) {
        resetLessonForm();
      }
    } catch (e) {
      setError(toErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const changeChapterStatus = async (chapterId: string, status: CampaignContentStatus) => {
    try {
      setSaving(true);
      setError(null);
      await api.updateCampaignAdminChapterStatus(chapterId, status);
      await Promise.all([loadChapters(), loadLevels()]);
    } catch (e) {
      setError(toErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cn('min-h-[100dvh] flex flex-col', theme.backgrounds.primaryGradient)}>
      <StickyHeader title="Кампании" onBack={goBack} />

      <header className="px-5 pt-14 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            className={cn(
              'p-2 rounded-xl transition-colors',
              isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'
            )}
          >
            <ArrowLeft size={22} className={theme.text.primary} />
          </button>
          <div className="flex-1">
            <h1 className={cn('text-xl font-bold', theme.text.primary)}>Кампании</h1>
            <p className={cn('text-xs mt-0.5', isDark ? 'text-white/40' : 'text-stone-500')}>
              Главы и уроки кампании
            </p>
          </div>
          <button
            onClick={() => {
              void loadChapters();
              void loadLevels();
            }}
            className={cn(
              'p-2.5 rounded-xl transition-colors',
              isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'
            )}
            disabled={loadingChapters || loadingLevels}
          >
            <RefreshCw
              size={18}
              className={cn(theme.text.primary, (loadingChapters || loadingLevels) && 'animate-spin')}
            />
          </button>
        </div>

        <div className="mt-4 inline-flex rounded-xl overflow-hidden border border-white/10">
          <button
            onClick={() => setTab('chapters')}
            className={cn(
              'px-4 py-2 text-sm',
              tab === 'chapters'
                ? isDark ? 'bg-violet-500/30 text-violet-200' : 'bg-violet-100 text-violet-700'
                : isDark ? 'bg-white/5 text-white/60' : 'bg-white text-stone-600'
            )}
          >
            <span className="inline-flex items-center gap-2"><Layers size={14} /> Главы</span>
          </button>
          <button
            onClick={() => setTab('lessons')}
            className={cn(
              'px-4 py-2 text-sm',
              tab === 'lessons'
                ? isDark ? 'bg-violet-500/30 text-violet-200' : 'bg-violet-100 text-violet-700'
                : isDark ? 'bg-white/5 text-white/60' : 'bg-white text-stone-600'
            )}
          >
            <span className="inline-flex items-center gap-2"><BookOpen size={14} /> Уроки</span>
          </button>
        </div>
      </header>

      <main className="flex-1 px-5 pb-8 space-y-4">
        {error && (
          <div className={cn(
            'p-3 rounded-xl border text-sm',
            isDark ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-red-50 border-red-200 text-red-700'
          )}>
            {error}
          </div>
        )}

        {tab === 'chapters' && (
          <>
            <section className={cn('rounded-2xl border p-4', isDark ? 'bg-white/5 border-white/10' : 'bg-white border-stone-200')}>
              <div className="flex items-center justify-between mb-3">
                <h2 className={cn('font-semibold', theme.text.primary)}>
                  {editingChapterId ? 'Редактирование главы' : 'Новая глава'}
                </h2>
                {editingChapterId && (
                  <button onClick={resetChapterForm} className={cn('text-xs', isDark ? 'text-white/50' : 'text-stone-500')}>
                    Отменить
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3">
                <input
                  value={chapterForm.title}
                  onChange={(e) => setChapterForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Название главы"
                  className={cn('px-3 py-2 rounded-xl border text-sm', isDark ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-stone-200 text-stone-900')}
                />
                <input
                  value={chapterForm.titleBur ?? ''}
                  onChange={(e) => setChapterForm(prev => ({ ...prev, titleBur: e.target.value }))}
                  placeholder="Название на бурятском (опционально)"
                  className={cn('px-3 py-2 rounded-xl border text-sm', isDark ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-stone-200 text-stone-900')}
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    value={chapterForm.order}
                    onChange={(e) => setChapterForm(prev => ({ ...prev, order: Number(e.target.value || 1) }))}
                    min={1}
                    className={cn('px-3 py-2 rounded-xl border text-sm', isDark ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-stone-200 text-stone-900')}
                  />
                  <select
                    value={chapterForm.status ?? 'draft'}
                    onChange={(e) => setChapterForm(prev => ({ ...prev, status: e.target.value as CampaignContentStatus }))}
                    className={cn('px-3 py-2 rounded-xl border text-sm', isDark ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-stone-200 text-stone-900')}
                  >
                    {STATUSES.map(s => (
                      <option key={s} value={s}>{statusLabel[s]}</option>
                    ))}
                  </select>
                </div>
                <textarea
                  value={chapterForm.description ?? ''}
                  onChange={(e) => setChapterForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Описание главы"
                  rows={2}
                  className={cn('px-3 py-2 rounded-xl border text-sm', isDark ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-stone-200 text-stone-900')}
                />
                <button
                  onClick={() => void saveChapter()}
                  disabled={saving}
                  className={cn(
                    'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold',
                    isDark ? 'bg-violet-500/30 text-violet-100 hover:bg-violet-500/40' : 'bg-violet-600 text-white hover:bg-violet-700'
                  )}
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {editingChapterId ? 'Сохранить главу' : 'Создать главу'}
                </button>
              </div>
            </section>

            <section className={cn('rounded-2xl border p-4', isDark ? 'bg-white/5 border-white/10' : 'bg-white border-stone-200')}>
              <h2 className={cn('font-semibold mb-3', theme.text.primary)}>Список глав</h2>
              {loadingChapters ? (
                <div className="py-6 flex justify-center"><Loader2 size={20} className={cn('animate-spin', theme.text.primary)} /></div>
              ) : chapters.length === 0 ? (
                <p className={cn('text-sm', isDark ? 'text-white/50' : 'text-stone-500')}>Глав пока нет</p>
              ) : (
                <div className="space-y-2">
                  {chapters.map(ch => (
                    <div key={ch.id} className={cn('rounded-xl border p-3', isDark ? 'border-white/10 bg-white/5' : 'border-stone-200 bg-stone-50')}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className={cn('font-semibold text-sm', theme.text.primary)}>{ch.order}. {ch.title}</div>
                          <div className={cn('text-xs mt-0.5', isDark ? 'text-white/50' : 'text-stone-500')}>
                            {statusLabel[ch.status]} · уроков: {ch.lessonsTotal ?? 0} (pub {ch.lessonsPublished ?? 0})
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 justify-end">
                          <button onClick={() => onEditChapter(ch)} className={cn('px-2 py-1 rounded-lg text-xs', isDark ? 'bg-white/10 text-white/80' : 'bg-white text-stone-700 border border-stone-200')}>
                            Edit
                          </button>
                          {STATUSES.filter(s => s !== ch.status).map(s => (
                            <button
                              key={s}
                              onClick={() => void changeChapterStatus(ch.id, s)}
                              className={cn('px-2 py-1 rounded-lg text-xs', isDark ? 'bg-white/10 text-white/70' : 'bg-white text-stone-600 border border-stone-200')}
                            >
                              {statusLabel[s]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {tab === 'lessons' && (
          <>
            <section className={cn('rounded-2xl border p-4', isDark ? 'bg-white/5 border-white/10' : 'bg-white border-stone-200')}>
              <div className="flex items-center justify-between mb-3">
                <h2 className={cn('font-semibold', theme.text.primary)}>
                  {editingLessonSlug ? `Редактирование: ${editingLessonSlug}` : 'Новый урок'}
                </h2>
                {editingLessonSlug && (
                  <button onClick={resetLessonForm} className={cn('text-xs', isDark ? 'text-white/50' : 'text-stone-500')}>
                    Отменить
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  value={lessonForm.slug}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, slug: e.target.value.trim() }))}
                  placeholder="slug"
                  disabled={!!editingLessonSlug}
                  className={cn('px-3 py-2 rounded-xl border text-sm col-span-2', isDark ? 'bg-white/10 border-white/10 text-white disabled:opacity-50' : 'bg-white border-stone-200 text-stone-900 disabled:opacity-70')}
                />
                <input
                  value={lessonForm.name}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Название"
                  className={cn('px-3 py-2 rounded-xl border text-sm', isDark ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-stone-200 text-stone-900')}
                />
                <input
                  value={lessonForm.nameBur}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, nameBur: e.target.value }))}
                  placeholder="Название (бурят.)"
                  className={cn('px-3 py-2 rounded-xl border text-sm', isDark ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-stone-200 text-stone-900')}
                />
                <select
                  value={lessonForm.chapterId}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, chapterId: e.target.value }))}
                  className={cn('px-3 py-2 rounded-xl border text-sm', isDark ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-stone-200 text-stone-900')}
                >
                  <option value="">Выбери главу</option>
                  {chapters.map(ch => (
                    <option key={ch.id} value={ch.id}>{ch.order}. {ch.title}</option>
                  ))}
                </select>
                <select
                  value={lessonForm.difficulty}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, difficulty: e.target.value as CampaignDifficulty }))}
                  className={cn('px-3 py-2 rounded-xl border text-sm', isDark ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-stone-200 text-stone-900')}
                >
                  {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <input
                  type="number"
                  value={lessonForm.order}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, order: Number(e.target.value || 0) }))}
                  placeholder="order"
                  className={cn('px-3 py-2 rounded-xl border text-sm', isDark ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-stone-200 text-stone-900')}
                />
                <input
                  type="number"
                  value={lessonForm.requiredStars}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, requiredStars: Number(e.target.value || 0) }))}
                  placeholder="requiredStars"
                  className={cn('px-3 py-2 rounded-xl border text-sm', isDark ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-stone-200 text-stone-900')}
                />
                <input
                  value={lessonForm.icon}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, icon: e.target.value || '📚' }))}
                  placeholder="icon"
                  className={cn('px-3 py-2 rounded-xl border text-sm', isDark ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-stone-200 text-stone-900')}
                />
                <select
                  value={lessonForm.status ?? 'draft'}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, status: e.target.value as CampaignContentStatus }))}
                  className={cn('px-3 py-2 rounded-xl border text-sm', isDark ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-stone-200 text-stone-900')}
                >
                  {STATUSES.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
                </select>
                <textarea
                  value={lessonWordsRaw}
                  onChange={(e) => setLessonWordsRaw(e.target.value)}
                  placeholder={'Слова: одна строка = BUR|RU\nпример: САЙН|Привет'}
                  rows={6}
                  className={cn('px-3 py-2 rounded-xl border text-sm col-span-2', isDark ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-stone-200 text-stone-900')}
                />
                <button
                  onClick={() => void saveLesson()}
                  disabled={saving}
                  className={cn(
                    'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold col-span-2',
                    isDark ? 'bg-violet-500/30 text-violet-100 hover:bg-violet-500/40' : 'bg-violet-600 text-white hover:bg-violet-700'
                  )}
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {editingLessonSlug ? 'Сохранить урок' : 'Создать урок'}
                </button>
              </div>
            </section>

            <section className={cn('rounded-2xl border p-4', isDark ? 'bg-white/5 border-white/10' : 'bg-white border-stone-200')}>
              <div className="flex items-center justify-between mb-3">
                <h2 className={cn('font-semibold', theme.text.primary)}>Уроки</h2>
                <button
                  onClick={resetLessonForm}
                  className={cn('inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg', isDark ? 'bg-white/10 text-white/70' : 'bg-stone-100 text-stone-700')}
                >
                  <Plus size={12} /> New
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <select
                  value={lessonFilterChapterId}
                  onChange={(e) => setLessonFilterChapterId(e.target.value)}
                  className={cn('px-2 py-2 rounded-xl border text-xs', isDark ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-stone-200 text-stone-900')}
                >
                  <option value="">Все главы</option>
                  {chapters.map(ch => (
                    <option key={ch.id} value={ch.id}>{ch.order}. {ch.title}</option>
                  ))}
                </select>
                <select
                  value={lessonFilterStatus}
                  onChange={(e) => setLessonFilterStatus(e.target.value)}
                  className={cn('px-2 py-2 rounded-xl border text-xs', isDark ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-stone-200 text-stone-900')}
                >
                  <option value="">Все статусы</option>
                  {STATUSES.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
                </select>
                <input
                  value={lessonSearch}
                  onChange={(e) => setLessonSearch(e.target.value)}
                  placeholder="search"
                  className={cn('px-2 py-2 rounded-xl border text-xs', isDark ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-stone-200 text-stone-900')}
                />
              </div>

              {loadingLevels ? (
                <div className="py-6 flex justify-center"><Loader2 size={20} className={cn('animate-spin', theme.text.primary)} /></div>
              ) : levels.length === 0 ? (
                <p className={cn('text-sm', isDark ? 'text-white/50' : 'text-stone-500')}>Уроков не найдено</p>
              ) : (
                <div className="space-y-2">
                  {levels.map(level => (
                    <div key={level.slug} className={cn('rounded-xl border p-3', isDark ? 'border-white/10 bg-white/5' : 'border-stone-200 bg-stone-50')}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className={cn('font-semibold text-sm', theme.text.primary)}>{level.slug}</div>
                          <div className={cn('text-xs mt-0.5', isDark ? 'text-white/50' : 'text-stone-500')}>
                            {level.name} · {level.difficulty} · {statusLabel[level.status]}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => void onEditLesson(level.slug)}
                            className={cn('px-2 py-1 rounded-lg text-xs', isDark ? 'bg-white/10 text-white/80' : 'bg-white text-stone-700 border border-stone-200')}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => navigateToCampaignMapEditor(level.slug)}
                            className={cn('px-2 py-1 rounded-lg text-xs', isDark ? 'bg-violet-500/20 text-violet-200' : 'bg-violet-50 text-violet-700 border border-violet-200')}
                          >
                            Maps
                          </button>
                          <button
                            onClick={() => void removeLesson(level.slug)}
                            className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs', isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-50 text-red-700 border border-red-200')}
                          >
                            <Trash2 size={12} /> Del
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default AdminCampaignScreen;
