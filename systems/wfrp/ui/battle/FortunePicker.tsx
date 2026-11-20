'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { LOCATIONS } from '../../rules/combat/constants';
import type { FortuneChoice, FortuneExtras } from './fortune-controls';

import { HudButton } from '@/components/hud';
import { cn } from '@/lib/utils';

const toggle = (on: boolean) =>
    cn(
        'flex-1 border-l border-white/20 text-sm first:border-l-0',
        on ? 'bg-white/10 font-bold text-[var(--ink)]' : 'text-hud-soft'
    );

function ToggleRow({
    label,
    className = 'mt-1',
    children,
}: {
    label: string;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div
            role="group"
            aria-label={label}
            className={cn('flex h-9 border border-white/20', className)}
        >
            {children}
        </div>
    );
}

function ToggleButton({
    on,
    onClick,
    children,
}: {
    on: boolean;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <HudButton
            type="button"
            aria-pressed={on}
            onClick={onClick}
            className={toggle(on)}
        >
            {children}
        </HudButton>
    );
}

interface FortunePickerProps extends FortuneExtras {
    left: number;
    fateLeft?: number;
    value: FortuneChoice;
    onChange: (value: FortuneChoice) => void;
}

export function FortunePicker({
    left,
    fateLeft,
    value,
    onChange,
    advantageLabel,
    rerolls,
    notFail,
}: FortunePickerProps) {
    const tf = useTranslations('battleWfrp.ui.fortune');

    const options: FortuneChoice[] = [
        null,
        ...(left >= 1 ? (['reroll', 'sl'] as const) : []),
        ...((fateLeft ?? 0) >= 1 ? (['notFail'] as const) : []),
    ];

    return (
        <div className="mt-3">
            <div className="text-sm text-[var(--hud-muted)]">
                {tf('left', { count: left })}
                {fateLeft !== undefined &&
                    ` · ${tf('fateLeft', { count: fateLeft })}`}
            </div>
            <ToggleRow label={tf('label')}>
                {options.map((m) => (
                    <ToggleButton
                        key={m ?? 'off'}
                        on={value === m}
                        onClick={() => onChange(m)}
                    >
                        {tf(
                            m === 'sl' && advantageLabel
                                ? 'advantage'
                                : (m ?? 'off')
                        )}
                    </ToggleButton>
                ))}
            </ToggleRow>
            {value === 'reroll' && rerolls && left > 1 && (
                <ToggleRow label={tf('rerolls')}>
                    {Array.from(
                        { length: Math.min(left, 9) },
                        (_, i) => i + 1
                    ).map((n) => (
                        <ToggleButton
                            key={n}
                            on={rerolls.value === n}
                            onClick={() => rerolls.set(n)}
                        >
                            {n}
                        </ToggleButton>
                    ))}
                </ToggleRow>
            )}
            {value === 'notFail' && notFail && (
                <div className="mt-1 space-y-1">
                    <ToggleRow label={tf('critical')} className="">
                        <ToggleButton
                            on={notFail.critical}
                            onClick={() =>
                                notFail.set(!notFail.critical, notFail.location)
                            }
                        >
                            {tf('critical')}
                        </ToggleButton>
                    </ToggleRow>
                    {notFail.critical && (
                        <ToggleRow label={tf('location')} className="">
                            {LOCATIONS.map((loc) => (
                                <ToggleButton
                                    key={loc}
                                    on={notFail.location === loc}
                                    onClick={() => notFail.set(true, loc)}
                                >
                                    {tf(`locations.${loc}`)}
                                </ToggleButton>
                            ))}
                        </ToggleRow>
                    )}
                </div>
            )}
        </div>
    );
}
