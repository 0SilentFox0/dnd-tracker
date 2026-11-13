'use client';

import { useTranslations } from 'next-intl';

import type { BattleBadgeProps } from '@/components/systems/types';
import { d20State } from '@/systems/d20/rules/state';

function Pips({
    count,
    filled,
    color,
}: {
    count: number;
    filled: number;
    color: string;
}) {
    return (
        <span className="flex gap-0.5">
            {Array.from({ length: count }, (_, i) => (
                <span
                    key={i}
                    className="size-2 rounded-full border"
                    style={{
                        borderColor: color,
                        background: i < filled ? color : 'transparent',
                    }}
                />
            ))}
        </span>
    );
}

export function DeathSaveBadge({ participant, place }: BattleBadgeProps) {
    const t = useTranslations('battle.participant');

    const saves = d20State(participant).deathSaves;

    if (place !== 'row' || !saves) return null;

    return (
        <div className="mt-1 flex items-center gap-2 text-xs text-[var(--hud-muted)]">
            <span>{t('deathSaves')}</span>
            <Pips
                count={3}
                filled={saves.successes}
                color="var(--hud-good, #5fae5f)"
            />
            <Pips
                count={3}
                filled={saves.failures}
                color="var(--hud-bad, #e04a35)"
            />
            {saves.stable && <span>{t('stable')}</span>}
        </div>
    );
}
