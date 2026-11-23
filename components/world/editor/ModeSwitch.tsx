'use client';

import { useTranslations } from 'next-intl';

import { HudToggleChip } from '@/components/hud';
import type { WorldMode } from '@/lib/hooks/world';

const MODES: WorldMode[] = ['build', 'play'];

export function ModeSwitch({
    value,
    onChange,
}: {
    value: WorldMode;
    onChange(mode: WorldMode): void;
}) {
    const t = useTranslations('world.mode');

    return (
        <div
            data-slot="world-mode-switch"
            role="group"
            aria-label={t('label')}
            className="flex gap-1"
        >
            {MODES.map((m) => (
                <HudToggleChip
                    key={m}
                    tall
                    active={value === m}
                    onClick={() => {
                        if (value !== m) onChange(m);
                    }}
                >
                    {t(m)}
                </HudToggleChip>
            ))}
        </div>
    );
}
