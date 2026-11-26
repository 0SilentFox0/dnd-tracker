'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

export const TILE_GRID =
    'grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';

export const TILE_GRID_TALENTS =
    'grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

export interface AdvanceRowProps {
    label: ReactNode;
    value: ReactNode;
    hint?: ReactNode;
    price: {
        cost: number | null;
        limitLabel?: string;
        outOfCareer?: number | null;
    };
    available: number;
    pending: boolean;
    onBuy: () => void;
}

export function AdvanceRow({
    label,
    value,
    hint,
    price,
    available,
    pending,
    onBuy,
}: AdvanceRowProps) {
    const { cost, limitLabel, outOfCareer } = price;

    const t = useTranslations('wfrpAdvancement.ui');

    const short = cost !== null && cost > available;

    return (
        <li className="ds-inset flex min-w-0 flex-col justify-between gap-1.5 rounded-xl p-2">
            <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate" title={String(label)}>
                        {label}
                    </span>
                    <b className="shrink-0 text-hud-accent-fg tabular-nums">
                        {value}
                    </b>
                </div>
                {outOfCareer ? (
                    <p className="text-xs text-hud-muted">
                        {t('outOfCareer', { multiplier: outOfCareer })}
                    </p>
                ) : null}
                {hint && (
                    <p className="line-clamp-2 text-xs text-hud-muted">
                        {hint}
                    </p>
                )}
            </div>
            <Button
                type="button"
                size="sm"
                variant="outline"
                className="ds-interactive min-h-9 w-full rounded-lg"
                disabled={cost === null || short || pending}
                title={short ? t('needXp') : undefined}
                onClick={onBuy}
            >
                {cost === null
                    ? (limitLabel ?? t('atLimit'))
                    : t('buy', { cost })}
            </Button>
        </li>
    );
}
