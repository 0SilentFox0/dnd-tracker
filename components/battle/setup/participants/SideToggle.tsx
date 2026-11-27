'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { Shield, Swords } from 'lucide-react';

import { HudSegmented } from '@/components/hud';
import { ParticipantSide } from '@/lib/constants/battle';
import { cn } from '@/lib/utils';

const SIDES = [
    {
        side: ParticipantSide.ALLY,
        key: 'ally',
        Icon: Shield,
        tone: 'text-hud-accent-fg',
    },
    {
        side: ParticipantSide.ENEMY,
        key: 'enemy',
        Icon: Swords,
        tone: 'text-hud-crimson-fg',
    },
] as const;

interface SideToggleProps {
    side: ParticipantSide;
    onChange: (side: ParticipantSide) => void;
    label: string;
    size?: 'sm' | 'md';
    layout?: 'fill' | 'compact';
}

export function SideToggle({
    side,
    onChange,
    label,
    size = 'md',
    layout,
}: SideToggleProps) {
    const t = useTranslations('battleSetup.participants');

    const id = useId();

    return (
        <div
            className={cn(
                size === 'sm' && '[&_button]:h-8 [&_button]:px-2',
                layout &&
                    'w-full [&_button]:h-9 [&_button]:justify-center [&_button]:rounded-none [&_button]:border-0 [&_button]:shadow-none [&_button[aria-checked=true]]:bg-white/10 [&>*]:w-full [&>*]:gap-0',
                layout === 'fill' && '[&_button]:flex-1',
                layout === 'compact' &&
                    'w-auto shrink-0 [&_button]:w-9 [&_button]:px-0 [&>*]:w-auto'
            )}
        >
            <HudSegmented
                id={id}
                label={label}
                value={side}
                onValueChange={onChange}
                options={SIDES.map(({ side: value, key, Icon, tone }) => ({
                    value,
                    label: (
                        <>
                            <Icon className={cn('size-4', tone)} aria-hidden />
                            <span
                                className={cn(
                                    'text-[11px]',
                                    layout === 'compact' ? 'sr-only' : 'ml-1'
                                )}
                            >
                                {t(key)}
                            </span>
                        </>
                    ),
                }))}
            />
        </div>
    );
}
