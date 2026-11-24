import { useTranslations } from 'next-intl';

import { xpProgress } from '@/lib/utils/characters/xp';

export function SheetPortraitStrip({
    level,
    xp,
}: {
    level: number | null;
    xp: number | null;
}) {
    const t = useTranslations('characterProfile.hero');

    const progress =
        xp !== null && level !== null ? xpProgress(xp, level) : null;

    if (level === null) return null;

    const label = progress
        ? progress.next === null
            ? t('xpMax', { value: progress.current })
            : t('xp', { value: progress.current, next: progress.next })
        : null;

    return (
        <div className="pointer-events-none absolute inset-x-1.5 bottom-1.5 flex items-end gap-1.5 rounded-b-lg bg-gradient-to-t from-black/75 to-transparent p-1.5 pt-8">
            <span className="hud-sc grid size-8 shrink-0 place-items-center rounded-lg bg-hud-gold-strong text-base leading-none text-(--palette-primary-foreground,#2a1d05)">
                <span className="sr-only">{t('level', { level })}</span>
                <span aria-hidden>{level}</span>
            </span>
            {progress && (
                <div className="min-w-0 flex-1 pb-0.5">
                    <p className="mb-1 hidden truncate text-[11px] leading-none text-white tabular-nums lg:block">
                        {label}
                    </p>
                    <div
                        role="progressbar"
                        aria-label={label ?? undefined}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(progress.ratio * 100)}
                        className="h-1.5 overflow-hidden rounded-full bg-white/25"
                    >
                        <div
                            className="h-full rounded-full bg-hud-gold-strong"
                            style={{ width: `${progress.ratio * 100}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
