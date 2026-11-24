import { useTranslations } from 'next-intl';

import { ScaleFill } from './SheetBar';

import { xpProgress } from '@/lib/utils/characters/xp';

export function SheetLevelPlate({ level }: { level: number }) {
    const t = useTranslations('characterProfile.hero');

    return (
        <div className="pointer-events-none absolute bottom-2 left-2 flex h-8 items-baseline gap-1.5 rounded-lg bg-black/80 px-2.5 text-white lg:bottom-3 lg:left-3 lg:h-10 lg:px-3">
            <span className="text-xs leading-8 tracking-[.08em] text-white/75 uppercase max-lg:sr-only lg:leading-10">
                {t('levelLabel')}
            </span>
            <b className="text-lg leading-8 lg:text-[22px] lg:leading-10">
                {level}
            </b>
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
                aria-valuenow={Math.round(progress.ratio * 100)}
                className="relative h-1.5 overflow-hidden rounded-full bg-(--sheet-track)"
            >
                <ScaleFill ratio={progress.ratio} className="bg-hud-muted" />
            </div>
        </div>
    );
}
