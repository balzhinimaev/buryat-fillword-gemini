// src/screens/BroadcastScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Send,
  Eye,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Link2,
  AppWindow,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  History,
  Megaphone,
  RefreshCw,
  Info,
} from 'lucide-react';
import { cn } from '../components/ui';
import { StickyHeader } from '../components/StickyHeader';
import { useTheme } from '../theme/ThemeContext';
import { useBackButton } from '../hooks/useTelegram';
import type { GameStore } from '../store/gameStore';
import {
  api,
  type BroadcastCohortType,
  type BroadcastRequest,
  type BroadcastItem,
  type BroadcastPreviewResponse,
  type BroadcastStatus,
  type CampaignPerformanceResponse,
} from '../services/api';

interface BroadcastScreenProps {
  store: GameStore;
}

// ─── Cohort Config ──────────────────────────────────────────────────
interface CohortOption {
  value: BroadcastCohortType;
  label: string;
  emoji: string;
  description: string;
  needsTelegramIds?: boolean;
  needsRole?: boolean;
  needsDays?: boolean;
}

const COHORT_OPTIONS: CohortOption[] = [
  { value: 'all', label: 'Все пользователи', emoji: '🌍', description: 'Все незабаненные пользователи' },
  { value: 'telegram_ids', label: 'По Telegram ID', emoji: '🆔', description: 'Конкретный список ID', needsTelegramIds: true },
  { value: 'role', label: 'По роли', emoji: '🎭', description: 'Пользователи с определённой ролью', needsRole: true },
  { value: 'premium', label: 'Telegram Premium', emoji: '⭐', description: 'Только Premium пользователи' },
  { value: 'active', label: 'Активные', emoji: '🟢', description: 'Активные за последние N дней', needsDays: true },
  { value: 'inactive', label: 'Неактивные', emoji: '💤', description: 'Неактивные за N дней', needsDays: true },
  {
    value: 'zero_star_inactive_24h',
    label: '0⭐ неактивны >24ч',
    emoji: '🧊',
    description: 'Без прогресса и не заходили >24 часов',
  },
  { value: 'language_keepers', label: 'Хранители языка', emoji: '🛡️', description: 'Участники программы хранителей' },
  { value: 'prelaunch', label: 'Прелонч', emoji: '🚀', description: 'Пользователи прелонча' },
];

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'user', label: 'Пользователь' },
  { value: 'trusted', label: 'Доверенный' },
  { value: 'moderator', label: 'Модератор' },
  { value: 'admin', label: 'Администратор' },
];

// ─── Status Badge ───────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: BroadcastStatus; isDark: boolean }> = ({ status, isDark }) => {
  const config: Record<BroadcastStatus, { label: string; bg: string; text: string }> = {
    pending: {
      label: 'Ожидает',
      bg: isDark ? 'bg-slate-500/20' : 'bg-slate-100',
      text: isDark ? 'text-slate-400' : 'text-slate-600',
    },
    in_progress: {
      label: 'Отправляется',
      bg: isDark ? 'bg-blue-500/20' : 'bg-blue-100',
      text: isDark ? 'text-blue-400' : 'text-blue-600',
    },
    completed: {
      label: 'Завершена',
      bg: isDark ? 'bg-emerald-500/20' : 'bg-emerald-100',
      text: isDark ? 'text-emerald-400' : 'text-emerald-600',
    },
    failed: {
      label: 'Ошибка',
      bg: isDark ? 'bg-red-500/20' : 'bg-red-100',
      text: isDark ? 'text-red-400' : 'text-red-600',
    },
    cancelled: {
      label: 'Отменена',
      bg: isDark ? 'bg-stone-500/20' : 'bg-stone-100',
      text: isDark ? 'text-stone-400' : 'text-stone-600',
    },
  };
  const c = config[status];
  return (
    <span className={cn('px-2 py-0.5 rounded text-[10px] font-semibold', c.bg, c.text)}>
      {c.label}
    </span>
  );
};

// ─── HTML Formatting Toolbar ────────────────────────────────────────
const FormatToolbar: React.FC<{
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onInsert: (before: string, after: string) => void;
  isDark: boolean;
}> = ({ onInsert, isDark }) => {
  const btnClass = cn(
    'p-1.5 rounded transition-colors',
    isDark ? 'hover:bg-white/10 text-white/50 hover:text-white/80' : 'hover:bg-stone-200 text-stone-500 hover:text-stone-700'
  );
  return (
    <div className="flex items-center gap-0.5">
      <button type="button" className={btnClass} onClick={() => onInsert('<b>', '</b>')} title="Жирный">
        <Bold size={14} />
      </button>
      <button type="button" className={btnClass} onClick={() => onInsert('<i>', '</i>')} title="Курсив">
        <Italic size={14} />
      </button>
      <button type="button" className={btnClass} onClick={() => onInsert('<u>', '</u>')} title="Подчёркнутый">
        <Underline size={14} />
      </button>
      <button type="button" className={btnClass} onClick={() => onInsert('<s>', '</s>')} title="Зачёркнутый">
        <Strikethrough size={14} />
      </button>
      <button type="button" className={btnClass} onClick={() => onInsert('<code>', '</code>')} title="Код">
        <Code size={14} />
      </button>
    </div>
  );
};

// ─── Section Header ─────────────────────────────────────────────────
const SectionTitle: React.FC<{
  icon: React.ReactNode;
  title: string;
  isDark: boolean;
}> = ({ icon, title, isDark }) => (
  <div className="flex items-center gap-2 mb-3">
    <span className={cn('opacity-60', isDark ? 'text-white' : 'text-stone-700')}>{icon}</span>
    <h2 className={cn('text-base font-bold', isDark ? 'text-white' : 'text-stone-900')}>{title}</h2>
  </div>
);

// ═════════════════════════════════════════════════════════════════════
// MAIN VIEW TYPES
// ═════════════════════════════════════════════════════════════════════
type ViewMode = 'compose' | 'history' | 'detail';

// ═════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════
export const BroadcastScreen: React.FC<BroadcastScreenProps> = ({ store }) => {
  const { goBack } = store;
  const { theme, isDark } = useTheme();

  useBackButton(() => {
    if (viewMode === 'detail') setViewMode('history');
    else if (viewMode === 'history') setViewMode('compose');
    else goBack();
  });

  // ─── View ──────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('compose');

  // ─── Compose state ─────────────────────────────────────────────────
  const [message, setMessage] = useState('');
  const [cohortType, setCohortType] = useState<BroadcastCohortType>('all');
  const [telegramIdsInput, setTelegramIdsInput] = useState('');
  const [role, setRole] = useState('user');
  const [days, setDays] = useState(7);
  const [showButton, setShowButton] = useState(false);
  const [buttonText, setButtonText] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');
  const [isMiniApp, setIsMiniApp] = useState(false);
  const [showCohortDropdown, setShowCohortDropdown] = useState(false);

  // ─── Preview state ─────────────────────────────────────────────────
  const [preview, setPreview] = useState<BroadcastPreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // ─── Send state ────────────────────────────────────────────────────
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ─── History state ─────────────────────────────────────────────────
  const [history, setHistory] = useState<BroadcastItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);

  // ─── Detail state ──────────────────────────────────────────────────
  const [detailItem, setDetailItem] = useState<BroadcastItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pollingId, setPollingId] = useState<string | null>(null);

  // ─── Campaign analytics state ─────────────────────────────────────
  const [campaignIdInput, setCampaignIdInput] = useState('');
  const [campaignHours, setCampaignHours] = useState(72);
  const [campaignConversionHours, setCampaignConversionHours] = useState(24);
  const [campaignReport, setCampaignReport] = useState<CampaignPerformanceResponse | null>(null);
  const [campaignLoading, setCampaignLoading] = useState(false);

  // ─── Error ─────────────────────────────────────────────────────────
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ─── Build request body ────────────────────────────────────────────
  const buildRequest = useCallback((): BroadcastRequest | null => {
    if (!message.trim()) {
      setError('Введите текст сообщения');
      return null;
    }

    const req: BroadcastRequest = {
      message: message.trim(),
      cohortType,
    };

    if (cohortType === 'telegram_ids') {
      const ids = telegramIdsInput
        .split(/[\s,;\n]+/)
        .map(s => parseInt(s.trim(), 10))
        .filter(n => !isNaN(n) && n > 0);
      if (ids.length === 0) {
        setError('Укажите хотя бы один Telegram ID');
        return null;
      }
      req.telegramIds = ids;
    }

    if (cohortType === 'role') {
      req.role = role as BroadcastRequest['role'];
    }

    if (cohortType === 'active' || cohortType === 'inactive') {
      req.days = days;
    }

    if (showButton && buttonText.trim() && buttonUrl.trim()) {
      req.button = {
        text: buttonText.trim(),
        url: buttonUrl.trim(),
        isMiniApp,
      };
    }

    return req;
  }, [message, cohortType, telegramIdsInput, role, days, showButton, buttonText, buttonUrl, isMiniApp]);

  const getErrorMessage = useCallback((err: unknown, fallback: string): string => {
    if (err && typeof err === 'object' && 'message' in err) {
      const message = (err as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim().length > 0) {
        return message;
      }
    }
    return fallback;
  }, []);

  const extractCampaignIdFromUrl = useCallback((url?: string): string | null => {
    if (!url || !url.trim()) return null;

    try {
      const parsed = new URL(url);
      const id = parsed.searchParams.get('campaign_id') || parsed.searchParams.get('campaignId');
      return id?.trim() || null;
    } catch {
      const match = url.match(/[?&](campaign_id|campaignId)=([^&#]+)/i);
      if (!match?.[2]) return null;
      try {
        return decodeURIComponent(match[2]).trim() || null;
      } catch {
        return match[2].trim() || null;
      }
    }
  }, []);

  // ─── Preview ───────────────────────────────────────────────────────
  const handlePreview = useCallback(async () => {
    const req = buildRequest();
    if (!req) return;

    try {
      setPreviewLoading(true);
      setError(null);
      const result = await api.previewBroadcast(req);
      setPreview(result);
    } catch (err: unknown) {
      console.error('Preview failed:', err);
      setError(getErrorMessage(err, 'Не удалось получить превью'));
    } finally {
      setPreviewLoading(false);
    }
  }, [buildRequest, getErrorMessage]);

  // ─── Send ──────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const req = buildRequest();
    if (!req) return;

    try {
      setSending(true);
      setError(null);
      setShowConfirm(false);
      const result = await api.sendBroadcast(req);
      // Switch to detail view to track progress
      setDetailItem(result);
      setPollingId(result._id);
      setViewMode('detail');
      // Reset form
      setMessage('');
      setPreview(null);
      setShowButton(false);
      setButtonText('');
      setButtonUrl('');
    } catch (err: unknown) {
      console.error('Send failed:', err);
      setError(getErrorMessage(err, 'Не удалось отправить рассылку'));
    } finally {
      setSending(false);
    }
  }, [buildRequest, getErrorMessage]);

  // ─── Load history ──────────────────────────────────────────────────
  const loadHistory = useCallback(async (page = 1) => {
    try {
      setHistoryLoading(true);
      const result = await api.getBroadcastList(page, 15);
      setHistory(result.items);
      setHistoryTotal(result.total);
      setHistoryPage(page);
    } catch (err: unknown) {
      console.error('Failed to load history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // ─── Load detail ───────────────────────────────────────────────────
  const loadDetail = useCallback(async (id: string) => {
    try {
      setDetailLoading(true);
      const result = await api.getBroadcastDetail(id);
      setDetailItem(result);
    } catch (err: unknown) {
      console.error('Failed to load detail:', err);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const loadCampaignAnalytics = useCallback(async (campaignIdParam?: string) => {
    const campaignId = (campaignIdParam || campaignIdInput).trim();
    if (!campaignId) {
      setError('Укажите campaign_id для отчёта');
      return;
    }

    try {
      setCampaignLoading(true);
      setError(null);

      const result = await api.getCampaignPerformance(
        campaignId,
        Math.max(1, campaignHours),
        Math.max(1, campaignConversionHours),
      );

      setCampaignReport(result);
    } catch (err: unknown) {
      console.error('Failed to load campaign analytics:', err);
      setError(getErrorMessage(err, 'Не удалось загрузить аналитику кампании'));
    } finally {
      setCampaignLoading(false);
    }
  }, [campaignIdInput, campaignHours, campaignConversionHours, getErrorMessage]);

  // Poll for in_progress broadcasts
  useEffect(() => {
    if (!pollingId || !detailItem) return;
    if (detailItem.status !== 'in_progress' && detailItem.status !== 'pending') {
      setPollingId(null);
      return;
    }
    const interval = setInterval(() => {
      loadDetail(pollingId);
    }, 3000);
    return () => clearInterval(interval);
  }, [pollingId, detailItem, loadDetail]);

  // Load history when switching to history tab
  useEffect(() => {
    if (viewMode === 'history') {
      loadHistory(1);
    }
  }, [viewMode, loadHistory]);

  // Prefill campaign_id from selected broadcast detail (if available)
  useEffect(() => {
    if (!detailItem) return;

    const idFromButton = extractCampaignIdFromUrl(detailItem.cohortParams?.button?.url);
    setCampaignIdInput(idFromButton || '');
    setCampaignReport(null);
  }, [detailItem, extractCampaignIdFromUrl]);

  // ─── Insert HTML tag ──────────────────────────────────────────────
  const handleInsertTag = useCallback((before: string, after: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = message;
    const selected = text.substring(start, end);
    const newText = text.substring(0, start) + before + selected + after + text.substring(end);
    setMessage(newText);
    // Restore cursor
    setTimeout(() => {
      textarea.focus();
      const cursorPos = start + before.length + selected.length;
      textarea.setSelectionRange(cursorPos, cursorPos);
    }, 0);
  }, [message]);

  // ─── Cohort label ─────────────────────────────────────────────────
  const selectedCohort = COHORT_OPTIONS.find(c => c.value === cohortType) || COHORT_OPTIONS[0];

  // ─── Helpers ──────────────────────────────────────────────────────
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const getCohortLabel = (type: BroadcastCohortType) => {
    return COHORT_OPTIONS.find(c => c.value === type)?.label || type;
  };

  const getCohortEmoji = (type: BroadcastCohortType) => {
    return COHORT_OPTIONS.find(c => c.value === type)?.emoji || '📨';
  };

  // ─── Card style ───────────────────────────────────────────────────
  const cardClass = cn(
    'rounded-2xl border',
    isDark ? 'bg-white/5 border-white/10' : 'bg-white border-stone-200'
  );

  const inputClass = cn(
    'w-full rounded-xl px-3 py-2.5 text-sm border outline-none transition-colors',
    isDark
      ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500/50'
      : 'bg-stone-50 border-stone-200 text-stone-900 placeholder:text-stone-400 focus:border-violet-400'
  );

  const labelClass = cn('text-xs font-medium mb-1.5 block', isDark ? 'text-white/60' : 'text-stone-600');

  // ═════════════════════════════════════════════════════════════════
  // COMPOSE VIEW
  // ═════════════════════════════════════════════════════════════════
  const renderCompose = () => (
    <div className="space-y-4">
      {/* Message */}
      <section className={cn(cardClass, 'p-4')}>
        <SectionTitle icon={<Megaphone size={16} />} title="Сообщение" isDark={isDark} />
        <FormatToolbar textareaRef={textareaRef} onInsert={handleInsertTag} isDark={isDark} />
        <textarea
          ref={textareaRef}
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Текст сообщения (поддерживает HTML)..."
          rows={5}
          className={cn(inputClass, 'mt-2 resize-none')}
        />
        <div className={cn('text-[10px] mt-1.5 flex items-center gap-1', isDark ? 'text-white/30' : 'text-stone-400')}>
          <Info size={10} />
          HTML: &lt;b&gt;, &lt;i&gt;, &lt;u&gt;, &lt;s&gt;, &lt;code&gt;, &lt;a href=&quot;...&quot;&gt;
        </div>
      </section>

      {/* Cohort */}
      <section className={cn(cardClass, 'p-4')}>
        <SectionTitle icon={<Users size={16} />} title="Когорта" isDark={isDark} />

        {/* Cohort selector */}
        <button
          type="button"
          onClick={() => setShowCohortDropdown(true)}
          className={cn(
            'w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left',
            isDark
              ? 'bg-white/5 border-white/10 hover:border-white/20'
              : 'bg-stone-50 border-stone-200 hover:border-stone-300'
          )}
        >
          <span className="text-xl">{selectedCohort.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-stone-900')}>
              {selectedCohort.label}
            </div>
            <div className={cn('text-[10px]', isDark ? 'text-white/40' : 'text-stone-500')}>
              {selectedCohort.description}
            </div>
          </div>
          <ChevronDown size={16} className={isDark ? 'text-white/40' : 'text-stone-400'} />
        </button>

        {/* Cohort picker — full-screen overlay */}
        <AnimatePresence>
          {showCohortDropdown && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end justify-center"
              onClick={() => setShowCohortDropdown(false)}
            >
              <div className="absolute inset-0 bg-black/50" />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                onClick={e => e.stopPropagation()}
                className={cn(
                  'relative w-full max-w-md rounded-t-2xl border-t max-h-[75vh] flex flex-col',
                  isDark ? 'bg-slate-800 border-white/10' : 'bg-white border-stone-200'
                )}
              >
                {/* Drag handle */}
                <div className="flex justify-center py-3">
                  <div className={cn('w-10 h-1 rounded-full', isDark ? 'bg-white/20' : 'bg-stone-300')} />
                </div>

                <div className={cn('px-4 pb-2 text-sm font-bold', isDark ? 'text-white' : 'text-stone-900')}>
                  Выберите когорту
                </div>

                <div className="flex-1 overflow-y-auto overscroll-contain pb-8">
                  {COHORT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setCohortType(opt.value);
                        setShowCohortDropdown(false);
                        setPreview(null);
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                        cohortType === opt.value
                          ? isDark ? 'bg-violet-500/20' : 'bg-violet-50'
                          : isDark ? 'hover:bg-white/5 active:bg-white/10' : 'hover:bg-stone-50 active:bg-stone-100'
                      )}
                    >
                      <span className="text-xl">{opt.emoji}</span>
                      <div className="flex-1">
                        <div className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-stone-900')}>
                          {opt.label}
                        </div>
                        <div className={cn('text-[10px]', isDark ? 'text-white/40' : 'text-stone-500')}>
                          {opt.description}
                        </div>
                      </div>
                      {cohortType === opt.value && (
                        <CheckCircle2 size={16} className={isDark ? 'text-violet-400' : 'text-violet-600'} />
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Conditional fields */}
        {selectedCohort.needsTelegramIds && (
          <div className="mt-3">
            <label className={labelClass}>Telegram ID (через запятую или с новой строки)</label>
            <textarea
              value={telegramIdsInput}
              onChange={e => { setTelegramIdsInput(e.target.value); setPreview(null); }}
              placeholder="1272270574, 7987208623&#10;или по одному на строку"
              rows={3}
              className={cn(inputClass, 'resize-none font-mono text-xs')}
            />
          </div>
        )}

        {selectedCohort.needsRole && (
          <div className="mt-3">
            <label className={labelClass}>Роль</label>
            <div className="flex gap-2 flex-wrap">
              {ROLE_OPTIONS.map(r => (
                <button
                  key={r.value}
                  onClick={() => { setRole(r.value); setPreview(null); }}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    role === r.value
                      ? isDark ? 'bg-violet-500/30 text-violet-300' : 'bg-violet-100 text-violet-700'
                      : isDark ? 'bg-white/5 text-white/50 hover:bg-white/10' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedCohort.needsDays && (
          <div className="mt-3">
            <label className={labelClass}>Количество дней: <span className="font-bold">{days}</span></label>
            <input
              type="range"
              min={1}
              max={90}
              value={days}
              onChange={e => { setDays(Number(e.target.value)); setPreview(null); }}
              className="w-full"
            />
            <div className={cn('flex justify-between text-[10px] mt-1', isDark ? 'text-white/30' : 'text-stone-400')}>
              <span>1 день</span>
              <span>30</span>
              <span>60</span>
              <span>90 дней</span>
            </div>
          </div>
        )}

        {/* Preview Button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handlePreview}
          disabled={previewLoading || !message.trim()}
          className={cn(
            'w-full mt-3 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all',
            isDark
              ? 'bg-white/10 text-white/80 hover:bg-white/15 disabled:opacity-30'
              : 'bg-stone-100 text-stone-700 hover:bg-stone-200 disabled:opacity-40'
          )}
        >
          {previewLoading ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
          Превью когорты
        </motion.button>

        {/* Preview Result */}
        {preview && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'mt-3 p-3 rounded-xl border',
              isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <Users size={14} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
              <span className={cn('text-sm font-bold', isDark ? 'text-blue-300' : 'text-blue-700')}>
                {preview.count} получателей
              </span>
            </div>
            {preview.sampleTelegramIds.length > 0 && (
              <div className={cn('text-[10px] font-mono', isDark ? 'text-blue-400/60' : 'text-blue-500')}>
                Примеры: {preview.sampleTelegramIds.slice(0, 5).join(', ')}
                {preview.sampleTelegramIds.length > 5 && '...'}
              </div>
            )}
          </motion.div>
        )}
      </section>

      {/* Inline Button */}
      <section className={cn(cardClass, 'p-4')}>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle icon={<Link2 size={16} />} title="Кнопка" isDark={isDark} />
          <button
            onClick={() => setShowButton(!showButton)}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              showButton
                ? isDark ? 'bg-violet-500/30 text-violet-300' : 'bg-violet-100 text-violet-700'
                : isDark ? 'bg-white/10 text-white/40' : 'bg-stone-100 text-stone-500'
            )}
          >
            {showButton ? <Trash2 size={14} /> : <Plus size={14} />}
          </button>
        </div>

        {showButton && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <div>
              <label className={labelClass}>Текст кнопки</label>
              <input
                type="text"
                value={buttonText}
                onChange={e => setButtonText(e.target.value)}
                placeholder="Открыть приложение"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>URL</label>
              <input
                type="text"
                value={buttonUrl}
                onChange={e => setButtonUrl(e.target.value)}
                placeholder="https://t.me/buryat_fillword_bot/app"
                className={inputClass}
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMiniApp(!isMiniApp)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all',
                  isMiniApp
                    ? isDark ? 'bg-violet-500/30 text-violet-300' : 'bg-violet-100 text-violet-700'
                    : isDark ? 'bg-white/5 text-white/50' : 'bg-stone-100 text-stone-500'
                )}
              >
                <AppWindow size={14} />
                {isMiniApp ? 'Mini App кнопка' : 'Обычная ссылка'}
              </button>
            </div>
          </motion.div>
        )}
      </section>

      {/* Send Button */}
      <motion.button
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          setError(null);
          if (!buildRequest()) return;
          setShowConfirm(true);
        }}
        disabled={sending || !message.trim()}
        className={cn(
          'w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all',
          'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/20',
          'disabled:opacity-40 disabled:shadow-none'
        )}
      >
        <Send size={18} />
        Отправить рассылку
      </motion.button>

      {/* Confirm Modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-5"
            onClick={() => setShowConfirm(false)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className={cn(
                'relative z-10 w-full max-w-sm rounded-2xl border p-5',
                isDark ? 'bg-slate-800 border-white/10' : 'bg-white border-stone-200'
              )}
            >
              <div className="text-center mb-4">
                <div className="text-3xl mb-2">📨</div>
                <h3 className={cn('text-lg font-bold', isDark ? 'text-white' : 'text-stone-900')}>
                  Подтвердите отправку
                </h3>
                <p className={cn('text-sm mt-1', isDark ? 'text-white/50' : 'text-stone-500')}>
                  Когорта: {selectedCohort.emoji} {selectedCohort.label}
                  {preview && <><br /><span className="font-bold">{preview.count}</span> получателей</>}
                </p>
              </div>

              {/* Message preview */}
              <div className={cn(
                'rounded-xl p-3 text-xs mb-4 max-h-32 overflow-y-auto',
                isDark ? 'bg-white/5 text-white/70' : 'bg-stone-50 text-stone-700'
              )}>
                <div className="whitespace-pre-wrap break-words">{message.substring(0, 300)}{message.length > 300 ? '...' : ''}</div>
              </div>

              {showButton && buttonText && (
                <div className={cn(
                  'rounded-lg p-2 mb-4 text-center text-xs font-medium',
                  isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-600'
                )}>
                  [{isMiniApp ? '🔲 ' : '🔗 '}{buttonText}]
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirm(false)}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors',
                    isDark ? 'bg-white/10 text-white/70 hover:bg-white/15' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  )}
                >
                  Отмена
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-colors',
                    'bg-gradient-to-r from-violet-600 to-purple-600 text-white',
                    'disabled:opacity-50'
                  )}
                >
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Отправить
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // ═════════════════════════════════════════════════════════════════
  // HISTORY VIEW
  // ═════════════════════════════════════════════════════════════════
  const renderHistory = () => (
    <div className="space-y-3">
      {historyLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className={cn('animate-spin', isDark ? 'text-white/30' : 'text-stone-400')} />
        </div>
      ) : history.length === 0 ? (
        <div className={cn('text-center py-12 rounded-2xl border', cardClass)}>
          <div className="text-3xl mb-2">📭</div>
          <div className={cn('text-sm', isDark ? 'text-white/40' : 'text-stone-500')}>
            Нет отправленных рассылок
          </div>
        </div>
      ) : (
        <>
          {history.map(item => (
            <motion.button
              key={item._id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setDetailItem(item);
                setViewMode('detail');
                if (item.status === 'in_progress' || item.status === 'pending') {
                  setPollingId(item._id);
                }
              }}
              className={cn(cardClass, 'p-4 w-full text-left flex items-start gap-3')}
            >
              <div className="text-xl shrink-0 mt-0.5">
                {getCohortEmoji(item.cohortType)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status={item.status} isDark={isDark} />
                  <span className={cn('text-[10px]', isDark ? 'text-white/30' : 'text-stone-400')}>
                    {formatDate(item.createdAt)}
                  </span>
                </div>
                <div className={cn(
                  'text-xs line-clamp-2',
                  isDark ? 'text-white/70' : 'text-stone-700'
                )}>
                  {item.message.replace(/<[^>]+>/g, '').substring(0, 100)}
                </div>
                <div className={cn(
                  'text-[10px] mt-1 flex items-center gap-3',
                  isDark ? 'text-white/30' : 'text-stone-400'
                )}>
                  <span>{getCohortLabel(item.cohortType)}</span>
                  <span>·</span>
                  <span>{item.totalRecipients} получ.</span>
                  {item.status === 'completed' && (
                    <>
                      <span>·</span>
                      <span className="text-emerald-500">{item.sentCount} ✓</span>
                      {item.failedCount > 0 && (
                        <span className="text-red-400">{item.failedCount} ✗</span>
                      )}
                    </>
                  )}
                </div>
              </div>
              <ChevronRight size={16} className={cn('shrink-0 mt-1', isDark ? 'text-white/20' : 'text-stone-300')} />
            </motion.button>
          ))}

          {/* Pagination */}
          {historyTotal > 15 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => loadHistory(historyPage - 1)}
                disabled={historyPage <= 1}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-30',
                  isDark ? 'bg-white/10 text-white/60' : 'bg-stone-100 text-stone-600'
                )}
              >
                ←
              </button>
              <span className={cn('text-xs', isDark ? 'text-white/40' : 'text-stone-500')}>
                {historyPage} / {Math.ceil(historyTotal / 15)}
              </span>
              <button
                onClick={() => loadHistory(historyPage + 1)}
                disabled={historyPage >= Math.ceil(historyTotal / 15)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-30',
                  isDark ? 'bg-white/10 text-white/60' : 'bg-stone-100 text-stone-600'
                )}
              >
                →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );

  // ═════════════════════════════════════════════════════════════════
  // DETAIL VIEW
  // ═════════════════════════════════════════════════════════════════
  const renderDetail = () => {
    if (detailLoading && !detailItem) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className={cn('animate-spin', isDark ? 'text-white/30' : 'text-stone-400')} />
        </div>
      );
    }
    if (!detailItem) return null;

    const d = detailItem;
    const successRate = d.totalRecipients > 0
      ? ((d.sentCount / d.totalRecipients) * 100).toFixed(1)
      : '0';
    const campaignIdFromButton = extractCampaignIdFromUrl(d.cohortParams?.button?.url);

    return (
      <div className="space-y-4">
        {/* Status header */}
        <div className={cn(cardClass, 'p-4')}>
          <div className="flex items-center gap-3 mb-3">
            <div className="text-2xl">{getCohortEmoji(d.cohortType)}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <StatusBadge status={d.status} isDark={isDark} />
                {(d.status === 'in_progress' || d.status === 'pending') && (
                  <Loader2 size={12} className={cn('animate-spin', isDark ? 'text-blue-400' : 'text-blue-600')} />
                )}
              </div>
              <div className={cn('text-[10px] mt-0.5', isDark ? 'text-white/30' : 'text-stone-400')}>
                {formatDate(d.createdAt)}
                {d.completedAt && ` → ${formatDate(d.completedAt)}`}
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => loadDetail(d._id)}
              className={cn(
                'p-2 rounded-xl transition-colors',
                isDark ? 'bg-white/10 hover:bg-white/15' : 'bg-stone-100 hover:bg-stone-200'
              )}
            >
              <RefreshCw size={14} className={cn(detailLoading && 'animate-spin', isDark ? 'text-white/60' : 'text-stone-500')} />
            </motion.button>
          </div>

          {/* Progress bar */}
          {d.totalRecipients > 0 && (
            <div className="mb-3">
              <div className={cn('h-2 rounded-full overflow-hidden', isDark ? 'bg-white/10' : 'bg-stone-200')}>
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${(d.sentCount / d.totalRecipients) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <div className={cn('flex justify-between text-[10px] mt-1', isDark ? 'text-white/30' : 'text-stone-400')}>
                <span>{d.sentCount} из {d.totalRecipients}</span>
                <span>{successRate}%</span>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className={cn('text-center p-2.5 rounded-xl', isDark ? 'bg-white/5' : 'bg-stone-50')}>
              <div className={cn('text-lg font-bold', isDark ? 'text-white' : 'text-stone-900')}>
                {d.totalRecipients}
              </div>
              <div className={cn('text-[10px]', isDark ? 'text-white/40' : 'text-stone-500')}>
                Всего
              </div>
            </div>
            <div className={cn('text-center p-2.5 rounded-xl', isDark ? 'bg-emerald-500/10' : 'bg-emerald-50')}>
              <div className={cn('text-lg font-bold', isDark ? 'text-emerald-400' : 'text-emerald-600')}>
                {d.sentCount}
              </div>
              <div className={cn('text-[10px]', isDark ? 'text-emerald-400/60' : 'text-emerald-600/60')}>
                Доставлено
              </div>
            </div>
            <div className={cn('text-center p-2.5 rounded-xl', isDark ? 'bg-red-500/10' : 'bg-red-50')}>
              <div className={cn('text-lg font-bold', isDark ? 'text-red-400' : 'text-red-600')}>
                {d.failedCount}
              </div>
              <div className={cn('text-[10px]', isDark ? 'text-red-400/60' : 'text-red-600/60')}>
                Ошибки
              </div>
            </div>
          </div>
        </div>

        {/* Error Breakdown */}
        {d.errorBreakdown && d.failedCount > 0 && (
          <div className={cn(cardClass, 'p-4')}>
            <SectionTitle icon={<AlertTriangle size={16} />} title="Ошибки" isDark={isDark} />
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Заблокировали бота', value: d.errorBreakdown.blocked, emoji: '🚫' },
                { label: 'Деактивированы', value: d.errorBreakdown.deactivated, emoji: '👻' },
                { label: 'Чат не найден', value: d.errorBreakdown.chatNotFound, emoji: '❓' },
                { label: 'Другие', value: d.errorBreakdown.other, emoji: '⚠️' },
              ].map(e => (
                <div
                  key={e.label}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-lg',
                    isDark ? 'bg-white/5' : 'bg-stone-50'
                  )}
                >
                  <span className="text-sm">{e.emoji}</span>
                  <div>
                    <div className={cn('text-xs font-bold', isDark ? 'text-white' : 'text-stone-900')}>
                      {e.value}
                    </div>
                    <div className={cn('text-[10px]', isDark ? 'text-white/40' : 'text-stone-500')}>
                      {e.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message content */}
        <div className={cn(cardClass, 'p-4')}>
          <SectionTitle icon={<Megaphone size={16} />} title="Текст сообщения" isDark={isDark} />
          <div className={cn(
            'rounded-xl p-3 text-xs whitespace-pre-wrap break-words',
            isDark ? 'bg-white/5 text-white/70' : 'bg-stone-50 text-stone-700'
          )}>
            {d.message}
          </div>

          {d.cohortParams?.button && (
            <div className={cn(
              'mt-2 rounded-lg p-2 text-center text-xs font-medium',
              isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-600'
            )}>
              [{d.cohortParams.button.isMiniApp ? '🔲 ' : '🔗 '}{d.cohortParams.button.text}]
              <div className={cn('text-[10px] font-normal mt-0.5', isDark ? 'text-blue-400/50' : 'text-blue-500/70')}>
                {d.cohortParams.button.url}
              </div>
            </div>
          )}
        </div>

        {/* Campaign analytics */}
        <div className={cn(cardClass, 'p-4')}>
          <SectionTitle icon={<Info size={16} />} title="Эффективность кампании" isDark={isDark} />

          <div className="space-y-2">
            <label className={labelClass}>campaign_id</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={campaignIdInput}
                onChange={(e) => setCampaignIdInput(e.target.value)}
                placeholder="reactiv_manual_20260303_1940"
                className={cn(inputClass, 'h-10')}
              />
              <button
                onClick={() => loadCampaignAnalytics()}
                disabled={campaignLoading || !campaignIdInput.trim()}
                className={cn(
                  'h-10 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap',
                  campaignLoading || !campaignIdInput.trim()
                    ? 'bg-stone-400/20 text-stone-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90'
                )}
              >
                {campaignLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                Запросить
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Окно, часов</label>
                <input
                  type="number"
                  min={1}
                  max={720}
                  value={campaignHours}
                  onChange={(e) => setCampaignHours(Math.max(1, parseInt(e.target.value || '1', 10)))}
                  className={cn(inputClass, 'h-9')}
                />
              </div>
              <div>
                <label className={labelClass}>Конверсия, часов</label>
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={campaignConversionHours}
                  onChange={(e) => setCampaignConversionHours(Math.max(1, parseInt(e.target.value || '1', 10)))}
                  className={cn(inputClass, 'h-9')}
                />
              </div>
            </div>

            {campaignIdFromButton && (
              <div className={cn(
                'text-[10px] rounded-lg px-2 py-1',
                isDark ? 'bg-white/5 text-white/40' : 'bg-stone-100 text-stone-500'
              )}>
                Из ссылки рассылки: <span className="font-semibold">{campaignIdFromButton}</span>
              </div>
            )}
          </div>

          {campaignReport && (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Sent', value: campaignReport.users.sent, color: isDark ? 'text-slate-300' : 'text-slate-700' },
                  { label: 'Open', value: campaignReport.users.opened, color: isDark ? 'text-blue-300' : 'text-blue-700' },
                  { label: 'Start', value: campaignReport.users.started, color: isDark ? 'text-violet-300' : 'text-violet-700' },
                  { label: 'Complete', value: campaignReport.users.completed, color: isDark ? 'text-emerald-300' : 'text-emerald-700' },
                ].map((item) => (
                  <div key={item.label} className={cn('rounded-xl p-2 text-center', isDark ? 'bg-white/5' : 'bg-stone-50')}>
                    <div className={cn('text-base font-bold', item.color)}>{item.value}</div>
                    <div className={cn('text-[10px]', isDark ? 'text-white/40' : 'text-stone-500')}>{item.label}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Open / Sent', value: campaignReport.rates.openFromSent },
                  { label: 'Start / Open', value: campaignReport.rates.startFromOpened },
                  { label: 'Complete / Open', value: campaignReport.rates.completeFromOpened },
                  { label: 'Complete / Sent', value: campaignReport.rates.completeFromSent },
                ].map((rate) => (
                  <div key={rate.label} className={cn('rounded-lg px-2 py-1.5', isDark ? 'bg-white/5' : 'bg-stone-50')}>
                    <div className={cn('text-[10px]', isDark ? 'text-white/40' : 'text-stone-500')}>{rate.label}</div>
                    <div className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-stone-900')}>
                      {rate.value.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className={cn(cardClass, 'p-4')}>
          <div className={cn('text-[10px] space-y-1', isDark ? 'text-white/30' : 'text-stone-400')}>
            <div>Когорта: {getCohortEmoji(d.cohortType)} {getCohortLabel(d.cohortType)}</div>
            {d.cohortParams?.role && <div>Роль: {d.cohortParams.role}</div>}
            {d.cohortParams?.days && <div>Дней: {d.cohortParams.days}</div>}
            <div>ID: {d._id}</div>
          </div>
        </div>
      </div>
    );
  };

  // ═════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════
  return (
    <div className={cn('min-h-[100dvh] flex flex-col', theme.backgrounds.primaryGradient)}>
      <StickyHeader
        title={viewMode === 'compose' ? 'Рассылка' : viewMode === 'history' ? 'История' : 'Детали'}
        onBack={() => {
          if (viewMode === 'detail') setViewMode('history');
          else if (viewMode === 'history') setViewMode('compose');
          else goBack();
        }}
      />

      {/* Header */}
      <header className="px-5 pt-14 pb-4">
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (viewMode === 'detail') setViewMode('history');
              else if (viewMode === 'history') setViewMode('compose');
              else goBack();
            }}
            className={cn(
              'p-2 rounded-xl transition-colors',
              isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'
            )}
          >
            <ArrowLeft size={22} className={theme.text.primary} />
          </motion.button>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Megaphone size={20} className={cn(isDark ? 'text-violet-400' : 'text-violet-600')} />
              <h1 className={cn('text-xl font-bold', theme.text.primary)}>
                {viewMode === 'compose' ? 'Рассылка' : viewMode === 'history' ? 'История рассылок' : 'Детали рассылки'}
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* View Tabs (compose only) */}
      {viewMode !== 'detail' && (
        <div className="px-5 mb-4 flex gap-2">
          <button
            onClick={() => setViewMode('compose')}
            className={cn(
              'flex-1 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all',
              viewMode === 'compose'
                ? isDark ? 'bg-violet-500/30 text-violet-300' : 'bg-violet-100 text-violet-700'
                : isDark ? 'bg-white/5 text-white/40 hover:bg-white/10' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
            )}
          >
            <Send size={12} />
            Новая рассылка
          </button>
          <button
            onClick={() => setViewMode('history')}
            className={cn(
              'flex-1 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all',
              viewMode === 'history'
                ? isDark ? 'bg-violet-500/30 text-violet-300' : 'bg-violet-100 text-violet-700'
                : isDark ? 'bg-white/5 text-white/40 hover:bg-white/10' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
            )}
          >
            <History size={12} />
            История
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-5 mb-3">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'p-3 rounded-xl border flex items-center gap-2',
              isDark
                ? 'bg-red-500/10 border-red-500/20 text-red-400'
                : 'bg-red-50 border-red-200 text-red-600'
            )}
          >
            <AlertTriangle size={14} />
            <span className="text-xs flex-1">{error}</span>
            <button onClick={() => setError(null)} className="opacity-60 hover:opacity-100">
              <XCircle size={14} />
            </button>
          </motion.div>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 px-5 pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, x: viewMode === 'compose' ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: viewMode === 'compose' ? 20 : -20 }}
            transition={{ duration: 0.15 }}
          >
            {viewMode === 'compose' && renderCompose()}
            {viewMode === 'history' && renderHistory()}
            {viewMode === 'detail' && renderDetail()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default BroadcastScreen;
