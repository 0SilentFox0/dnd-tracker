'use client';

import { Heart } from 'lucide-react';

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
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--ink)]">
                <Heart
                    aria-hidden
                    className="size-3 fill-current text-[#e0594e]"
                />
                <HpFigure participant={hero} wounds={hpTerm === 'wounds'} />
            </div>
            <HealthBar participant={hero} exact className="h-1.5" />
        </div>
    );
}
