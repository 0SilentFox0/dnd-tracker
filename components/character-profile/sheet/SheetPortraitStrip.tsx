import { useTranslations } from 'next-intl';

import { ScaleFill } from './SheetBar';

import { xpProgress } from '@/lib/utils/characters/xp';

export function SheetLevelPlate({ level }: { level: number }) {
    const t = useTranslations('characterProfile.hero');

    return (
        <div className="pointer-events-none absolute -bottom-[13px] left-1/2 z-10 flex h-[26px] -translate-x-1/2 items-baseline gap-1.5 rounded-sm bg-hud-surface px-2 whitespace-nowrap text-hud-ink shadow-[0_0_0_1px_var(--color-hud-line),0_6px_14px_-4px_rgba(0,0,0,.7)] lg:-bottom-[18px] lg:h-9 lg:px-3.5">
            <b className="hud-num text-base leading-[26px] lg:text-[22px] lg:leading-9">
                {level}
            </b>
            <span className="hud-title text-xs text-hud-muted lg:text-[15px]">
                {t('levelLabel')}
            </span>
        </div>
    );
}

export function SheetXpBar({
    level,
    xp,
    ready,
}: {
    level: number;
    xp: number;
    ready: boolean;
}) {
    const t = useTranslations('characterProfile.hero');

    const progress = xpProgress(xp, level);

    const fill =
        progress.next === null
            ? 1
            : Math.min(1, progress.current / progress.next);

    const value =
        progress.next === null
            ? t('xpMax', { value: progress.current })
            : t('xp', { value: progress.current, next: progress.next });

    const note = ready
        ? t('xpReady')
        : progress.next !== null
          ? t('xpToNext', { left: progress.next - progress.current })
          : null;

    return (
        <div className="grid gap-2">
            <div className="flex items-baseline justify-between gap-3">
                <span className="text-[15px] font-bold text-hud-ink tabular-nums">
                    {value}
                </span>
                {note && (
                    <span className="text-sm text-hud-muted tabular-nums">
                        {note}
                    </span>
                )}
            </div>
            <div
                role="progressbar"
                aria-label={value}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(fill * 100)}
                aria-valuetext={note ? `${value} · ${note}` : value}
                className="relative h-2.5 overflow-hidden rounded-full bg-(--sheet-track)"
            >
                <ScaleFill ratio={fill} className="bg-hud-gold" />
            </div>
            <div
                aria-hidden
                className="flex justify-between text-xs text-hud-muted tabular-nums"
            >
                <span>0</span>
                {progress.next !== null && (
                    <span>{`${t('levelLabel')} ${level + 1}`}</span>
                )}
            </div>
        </div>
    );
}
