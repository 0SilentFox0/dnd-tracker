import { useTranslations } from 'next-intl';

import { actionIcon } from '@/components/hud/icons/battle';

export function MoveBar({ used, max }: { used: number; max: number }) {
    const t = useTranslations('battle.dock');

    const Icon = actionIcon.move;

    const left = Math.max(0, max - used);

    return (
        <div
            role="meter"
            aria-label={t('move')}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-valuenow={left}
            className="flex min-w-16 flex-col gap-1 text-[11px] text-[var(--ink)]"
        >
            <span className="flex items-center gap-1">
                <Icon className="size-3.5 text-[var(--gold)]" aria-hidden />
                <span className="hud-sc tracking-[.06em]">
                    {t('moveLeft', { left, max })}
                </span>
            </span>
            <span className="h-1 overflow-hidden rounded-full bg-white/15">
                <span
                    className="block h-full bg-[var(--gold)]"
                    style={{ width: `${max ? (left / max) * 100 : 0}%` }}
                />
            </span>
        </div>
    );
}
