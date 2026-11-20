'use client';

import { useTranslations } from 'next-intl';

import { HudChipTabs } from '@/components/hud/page';
import { WORLD_NO_SESSION_COLOR } from '@/lib/constants/world';
import type { Trail } from '@/lib/utils/world/trail';
import type { WorldSession } from '@/types/world';

interface TrailLegendProps {
    trails: Trail[];
    sessions: WorldSession[];
    visible: ReadonlySet<string | null>;
    onToggle(sessionId: string | null): void;
}

export function TrailLegend({
    trails,
    sessions,
    visible,
    onToggle,
}: TrailLegendProps) {
    const t = useTranslations('world.trail');

    if (trails.length === 0) return null;

    const items = trails.map((trail) => {
        const session = sessions.find((s) => s.id === trail.sessionId);

        return {
            key: trail.sessionId ?? 'none',
            active: visible.has(trail.sessionId),
            onSelect: () => onToggle(trail.sessionId),
            label: (
                <span className="flex items-center gap-1.5">
                    <span
                        aria-hidden
                        className="size-2.5 rounded-full"
                        style={{
                            background:
                                session?.color ?? WORLD_NO_SESSION_COLOR,
                        }}
                    />
                    {session?.name ?? t('noSession')}
                </span>
            ),
        };
    });

    return (
        <div className="hud-surface max-w-full rounded-md border border-hud-rule px-2 py-1">
            <HudChipTabs ariaLabel={t('legend')} items={items} />
        </div>
    );
}
