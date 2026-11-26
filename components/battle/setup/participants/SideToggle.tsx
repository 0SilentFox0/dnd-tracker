'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { Shield, Swords } from 'lucide-react';

import { HudSegmented } from '@/components/hud';
import { ParticipantSide } from '@/lib/constants/battle';
import { cn } from '@/lib/utils';

interface SideToggleProps {
    side: ParticipantSide;
    onChange: (side: ParticipantSide) => void;
    label: string;
    size?: 'sm' | 'md';
}

export function SideToggle({
    side,
    onChange,
    label,
    size = 'md',
}: SideToggleProps) {
    const t = useTranslations('battleSetup.participants');

    const id = useId();

    return (
        <div className={cn(size === 'sm' && '[&_button]:h-8 [&_button]:px-2')}>
            <HudSegmented
                id={id}
                label={label}
                value={side}
                onValueChange={onChange}
                options={[
                    {
                        value: ParticipantSide.ALLY,
                        ariaLabel: t('ally'),
                        label: (
                            <Shield
                                className="size-4 text-hud-accent-fg"
                                aria-hidden
                            />
                        ),
                    },
                    {
                        value: ParticipantSide.ENEMY,
                        ariaLabel: t('enemy'),
                        label: (
                            <Swords
                                className="size-4 text-hud-crimson-fg"
                                aria-hidden
                            />
                        ),
                    },
                ]}
            />
        </div>
    );
}
