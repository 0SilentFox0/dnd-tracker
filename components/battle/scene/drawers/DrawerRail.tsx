'use client';

import { useTranslations } from 'next-intl';

import { type DrawerKey, railKeys } from './rail-items';

import { HUD_GLASS, HudButton } from '@/components/hud';
import { actionIcon } from '@/components/hud/icons/battle';
import { useBattleScene } from '@/lib/hooks/battle';
import { cn } from '@/lib/utils';

const ICON = {
    log: actionIcon.railLog,
    dm: actionIcon.railDm,
    reserve: actionIcon.railReserve,
    tools: actionIcon.railTools,
} as const;

const TOUR = {
    log: 'battle.log',
    dm: 'battle.dm-open',
    reserve: 'battle.reserve',
    tools: 'battle.map-tools',
} as const;

export function DrawerRail({
    active,
    onToggle,
}: {
    active: DrawerKey | null;
    onToggle: (key: DrawerKey) => void;
}) {
    const t = useTranslations('battle.drawers');

    const {
        battle,
        viewer: { isDM, readOnly },
        roster: { reserve },
    } = useBattleScene();

    const keys = railKeys({
        isDM,
        readOnly,
        hasMap: !!battle.map,
        reserveCount: reserve.length,
    });

    return (
        <div
            data-drawer-rail
            role="toolbar"
            aria-label={t('rail')}
            className="pointer-events-auto flex flex-row gap-1.5"
        >
            {keys.map((key) => {
                const Icon = ICON[key];

                return (
                    <HudButton
                        key={key}
                        type="button"
                        data-tour={TOUR[key]}
                        aria-label={t(key)}
                        title={t(key)}
                        aria-pressed={active === key}
                        onClick={() => onToggle(key)}
                        className={cn(
                            HUD_GLASS,
                            'flex size-11 items-center justify-center rounded-xl focus-visible:ring-2 focus-visible:outline-none',
                            active === key
                                ? 'border-[var(--gold)] text-[var(--gold)]!'
                                : ''
                        )}
                    >
                        <Icon className="size-6" aria-hidden />
                    </HudButton>
                );
            })}
        </div>
    );
}
