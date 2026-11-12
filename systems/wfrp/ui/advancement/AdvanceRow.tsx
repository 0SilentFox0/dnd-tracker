'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

export interface AdvanceRowProps {
    label: ReactNode;
    value: ReactNode;
    hint?: ReactNode;
    cost: number | null;
    available: number;
    pending: boolean;
    limitLabel?: string;
    outOfCareer?: number | null;
    onBuy: () => void;
}

export function AdvanceRow({
    label,
    value,
    hint,
    cost,
    available,
    pending,
    limitLabel,
    outOfCareer,
    onBuy,
}: AdvanceRowProps) {
    const t = useTranslations('wfrpAdvancement.ui');

    const short = cost !== null && cost > available;

    return (
        <li className="flex items-center gap-2 border-b border-hud-line py-1.5 last:border-b-0">
            <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate">{label}</span>
                    <b className="shrink-0 text-hud-ink tabular-nums">
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
                className="min-h-11 min-w-24 shrink-0"
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
