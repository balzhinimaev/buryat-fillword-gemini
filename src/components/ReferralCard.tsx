// Карточка «Пригласи друга»: реферальные ссылки (VK/TG/системный шаринг),
// список приглашённых, прогресс до ачивки. Показывается в профиле авторизованного игрока.
import React, { useEffect, useState } from 'react';
import { Camera, Check, Copy, Gift, Send, Share2, Users } from 'lucide-react';
import { cn } from './ui';
import { useTheme } from '../theme/ThemeContext';
import { api, type MyReferralsResponse } from '../services/api';
import { buildReferralLinks, canShareReferral, shareReferral } from '../services/referral';
import { IS_VK_MINIAPP } from '../services/vkMiniApp';
import { canShareStory, shareInviteStory } from '../services/telegramStory';

/** прогресс к следующей реферальной ачивке (цели 1 и 5 — как в каталоге) */
function nextGoalHint(count: number): string | null {
  if (count < 1) return 'Первый друг откроет ачивку «Позвал друга» 🤝';
  if (count < 5) return `Ещё ${5 - count} до ачивки «Амбассадор» 📣`;
  return 'Ачивка «Амбассадор» получена — вы легенда 📣';
}

export const ReferralCard: React.FC = () => {
  const { theme, isDark } = useTheme();
  const [data, setData] = useState<MyReferralsResponse | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    api.getMyReferrals()
      .then((d) => { if (alive) setData(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!data) return null;
  const links = buildReferralLinks(data.code);
  const tgShare = `https://t.me/share/url?url=${encodeURIComponent(links.telegram)}&text=${encodeURIComponent(links.shareText)}`;
  const invitees = data.invitees ?? [];
  const hint = nextGoalHint(data.invitedCount);

  const copyWebLink = async () => {
    try {
      await navigator.clipboard.writeText(links.web);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Скопируйте ссылку:', links.web);
    }
  };

  const secondaryBtn = cn(
    'px-3 py-2.5 rounded-xl border text-sm font-semibold flex items-center justify-center gap-1.5',
    isDark ? 'border-white/15 text-white' : 'border-stone-300 text-stone-700',
  );

  return (
    <div className={cn(
      'rounded-2xl border p-4 space-y-3',
      isDark ? 'bg-amber-500/10 border-amber-500/25' : 'bg-amber-50 border-amber-200',
    )}>
      <div className="flex items-center gap-3">
        <span className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
          isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600',
        )}>
          <Gift size={17} />
        </span>
        <div className="flex-1 min-w-0">
          <div className={cn('text-sm font-bold', theme.text.primary)}>Пригласи друга</div>
          <div className={cn('text-[11px]', theme.text.dimmed)}>
            +{data.inviterXp} XP тебе и +{data.inviteeXp} XP другу за вход по ссылке
          </div>
        </div>
        <span className={cn(
          'flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full',
          isDark ? 'bg-white/10 text-white/80' : 'bg-white text-stone-600',
        )}>
          <Users size={12} /> {data.invitedCount}
        </span>
      </div>

      {/* Приглашённые друзья */}
      {invitees.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {invitees.slice(0, 5).map((f, i) => (
            <span
              key={`${f.name}-${i}`}
              className={cn(
                'flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full text-[11px] font-semibold max-w-[130px]',
                isDark ? 'bg-white/10 text-white/85' : 'bg-white text-stone-700',
              )}
            >
              {f.photoUrl ? (
                <img src={f.photoUrl} alt="" className="w-[18px] h-[18px] rounded-full object-cover" />
              ) : (
                <span className={cn(
                  'w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold',
                  isDark ? 'bg-amber-500/25 text-amber-300' : 'bg-amber-100 text-amber-600',
                )}>
                  {(f.name || '?').slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="truncate">{f.name}</span>
            </span>
          ))}
          {invitees.length > 5 && (
            <span className={cn('text-[11px] font-semibold', theme.text.dimmed)}>
              +{invitees.length - 5}
            </span>
          )}
        </div>
      )}

      <div className="flex gap-2">
        {IS_VK_MINIAPP ? (
          <button
            type="button"
            onClick={() => void shareReferral(data.code)}
            className="flex-1 px-3 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold flex items-center justify-center gap-1.5 active:bg-amber-600"
          >
            <Share2 size={15} /> Поделиться в VK
          </button>
        ) : (
          <a
            href={tgShare}
            target="_blank"
            rel="noreferrer"
            className="flex-1 px-3 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold flex items-center justify-center gap-1.5 active:bg-amber-600"
          >
            <Send size={15} /> Позвать в Telegram
          </a>
        )}
        {!IS_VK_MINIAPP && canShareReferral() && (
          <button type="button" onClick={() => void shareReferral(data.code)} className={secondaryBtn} aria-label="Поделиться">
            <Share2 size={15} />
          </button>
        )}
        {canShareStory() && (
          <button
            type="button"
            onClick={() => shareInviteStory(data.code)}
            className={secondaryBtn}
            aria-label="Опубликовать историю"
          >
            <Camera size={15} /> История
          </button>
        )}
        <button
          type="button"
          onClick={() => void copyWebLink()}
          className={cn(secondaryBtn, copied && 'border-emerald-500 text-emerald-500')}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Скопировано' : 'Ссылка'}
        </button>
      </div>

      {hint && <div className={cn('text-[11px]', theme.text.dimmed)}>{hint}</div>}
    </div>
  );
};
