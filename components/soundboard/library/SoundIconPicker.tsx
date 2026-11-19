'use client';

import { soundIcon } from '../sound-icon';

import { HudButton } from '@/components/hud';
import { SOUND_ICONS } from '@/lib/constants/soundboard';
import { cn } from '@/lib/utils';

export function SoundIconPicker({
    value,
    onChange,
    label,
}: {
    value: string;
    onChange: (icon: string) => void;
    label: string;
}) {
    return (
        <div role="group" aria-label={label} className="grid grid-cols-8 gap-1">
            {SOUND_ICONS.map((name) => {
                const Icon = soundIcon(name);

                return (
                    <HudButton
                        key={name}
                        aria-label={name}
                        aria-pressed={value === name}
                        className={cn(
                            'flex items-center justify-center rounded-md p-1.5 text-hud-muted hover:text-hud-ink',
                            value === name && 'bg-hud-gold/20 text-hud-ink'
                        )}
                        onClick={() => onChange(name)}
                    >
                        <Icon className="size-4" />
                    </HudButton>
                );
            })}
        </div>
    );
}
