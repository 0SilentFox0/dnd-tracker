import { useTranslations } from 'next-intl';

import { bonus } from '../../rules/characteristics/derive';
import { participantChars } from '../../rules/combat/participant';
import { overcastTotal, overcastValue } from '../../rules/magic/overcast';
import {
    OVERCAST_DIMENSIONS,
    type OvercastDimension,
    type WfrpOvercast,
} from '../../rules/percentile/fortune';

import { HudButton } from '@/components/hud';
import type { BattleParticipant } from '@/types/battle';

interface OvercastPickerProps {
    caster: BattleParticipant;
    value: WfrpOvercast | undefined;
    missile: boolean;
    onChange: (next: WfrpOvercast | undefined) => void;
}

const shown = (dim: OvercastDimension, spent: number) => {
    const v = overcastValue(dim, spent);

    return dim === 'damage' || dim === 'targets' ? `+${v}` : `×${v}`;
};

export function OvercastPicker({
    caster,
    value,
    missile,
    onChange,
}: OvercastPickerProps) {
    const t = useTranslations('wfrpMagic.ui.cast');

    const chars = participantChars(caster);

    const cap = bonus(chars, 'int') + bonus(chars, 'wp');

    const spread = value ?? {};

    const spent = overcastTotal(spread);

    const step = (dim: OvercastDimension, by: 1 | -1) => {
        const next = Math.max(0, (spread[dim] ?? 0) + by);

        const { [dim]: _dropped, ...rest } = spread;

        const merged = next > 0 ? { ...rest, [dim]: next } : rest;

        onChange(Object.keys(merged).length > 0 ? merged : undefined);
    };

    return (
        <div
            role="group"
            aria-label={t('overcastTitle', { cap })}
            className="mt-2"
        >
            <div className="text-sm text-hud-gold">
                {t('overcastTitle', { cap })}
            </div>
            {OVERCAST_DIMENSIONS.filter((d) => missile || d !== 'damage').map(
                (dim) => {
                    const dimName = t(`overcastDim.${dim}`);

                    return (
                        <div
                            key={dim}
                            className="mt-1 flex items-center gap-2 text-sm"
                        >
                            <span className="w-24 text-hud-soft">
                                {dimName}
                            </span>
                            <HudButton
                                type="button"
                                aria-label={t('overcastLess', { dim: dimName })}
                                disabled={!spread[dim]}
                                onClick={() => step(dim, -1)}
                            >
                                −
                            </HudButton>
                            <span className="w-16 text-center text-[var(--ink)]">
                                {spread[dim] ?? 0} SL →{' '}
                                {shown(dim, spread[dim] ?? 0)}
                            </span>
                            <HudButton
                                type="button"
                                aria-label={t('overcastMore', { dim: dimName })}
                                disabled={spent >= cap}
                                onClick={() => step(dim, 1)}
                            >
                                +
                            </HudButton>
                        </div>
                    );
                }
            )}
            <div className="mt-1 text-xs text-hud-soft">
                {t('overcastSpent', { spent, cap })}
            </div>
        </div>
    );
}
