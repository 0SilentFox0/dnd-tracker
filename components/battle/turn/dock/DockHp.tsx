'use client';

import { HealthBar, HpFigure } from '@/components/battle/hud';
import { useBattleRules, useBattleScene } from '@/lib/hooks/battle';

export function DockHp() {
    const {
        roster: { hero },
    } = useBattleScene();

    const { hpTerm } = useBattleRules();

    if (!hero) return null;

    return (
        <div data-slot="dock-hp" className="flex min-w-0 flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2 text-sm text-[var(--ink)]">
                <HpFigure participant={hero} wounds={hpTerm === 'wounds'} />
            </div>
            <HealthBar participant={hero} exact className="h-2" />
        </div>
    );
}
