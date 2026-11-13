'use client';

import { SlotGrid } from './SlotGrid';

import type { HeroPanelProps } from '@/components/systems/types';
import { useBattleRules } from '@/lib/hooks/battle';

export function SpellSlotsPanel({ hero }: HeroPanelProps) {
    const { spells } = useBattleRules();

    return spells ? <SlotGrid participant={hero} /> : null;
}
