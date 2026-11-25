'use client';

import { Heart } from 'lucide-react';

import { HpFigure } from '@/components/battle/hud';
import { useBattleRules, useBattleScene } from '@/lib/hooks/battle';
import { hpRatio } from '@/lib/utils/battle/view';

export function DockHp() {
    const {
        roster: { hero },
    } = useBattleScene();

    const { hpTerm } = useBattleRules();

    if (!hero) return null;

    return (
        <div data-slot="dock-hp" className="flex min-w-0 flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-hud-bone">
                <Heart
                    aria-hidden
                    className="size-3 fill-current text-[#e0594e]"
                />
                <HpFigure participant={hero} wounds={hpTerm === 'wounds'} />
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-black/45 ring-1 ring-black/30">
                <i
                    className="block h-full rounded-full bg-[#d2453a] transition-[width] duration-500"
                    style={{ width: `${hpRatio(hero) * 100}%` }}
                />
            </div>
        </div>
    );
}
