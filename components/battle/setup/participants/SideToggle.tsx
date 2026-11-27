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
    fill?: boolean;
}

export function SideToggle({
    side,
    onChange,
    label,
    size = 'md',
    fill = false,
}: SideToggleProps) {
    const t = useTranslations('battleSetup.participants');

    const id = useId();

    return (
        <div
            className={cn(
                size === 'sm' && '[&_button]:h-8 [&_button]:px-2',
                fill && 'w-full [&_button]:flex-1 [&>*]:w-full'
            )}
        >
            <HudSegmented
                id={id}
                label={label}
                value={side}
                onValueChange={onChange}
                options={[
                    {
                        value: ParticipantSide.ALLY,
                        label: (
                            <>
                                <span className="sr-only">{t('ally')}</span>
                                <Shield
                                    className="size-4 text-hud-accent-fg"
                                    aria-hidden
                                />
                            </>
                        ),
                    },
                    {
                        value: ParticipantSide.ENEMY,
                        label: (
                            <>
                                <span className="sr-only">{t('enemy')}</span>
                                <Swords
                                    className="size-4 text-hud-crimson-fg"
                                    aria-hidden
                                />
                            </>
                        ),
                    },
                ]}
            />
        </div>
    );
}
