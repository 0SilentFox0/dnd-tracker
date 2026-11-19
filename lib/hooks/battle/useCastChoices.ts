'use client';

import { useMemo } from 'react';

import { useBattleScene } from './useBattleScene';

import { useSpells } from '@/lib/hooks/spells';
import { useUnits } from '@/lib/hooks/units';
import { choiceNeeded, type SpellFlowState } from '@/lib/utils/battle/flows';
import type { BattleParticipant } from '@/types/battle';

export interface CastChoice {
    id: string;
    label: string;
}

export function useCastChoices(
    state: SpellFlowState,
    targets: BattleParticipant[]
): { kind: 'unit' | 'spell'; options: CastChoice[] } | null {
    const { campaignId } = useBattleScene();

    const choice = state.pick?.choice;

    const needed = choiceNeeded(state);

    const { data: units = [] } = useUnits(campaignId, undefined, {
        enabled: needed && choice?.kind === 'unit',
    });

    const { data: spells = [] } = useSpells(campaignId, {
        enabled: needed && choice?.kind === 'spell',
    });

    return useMemo(() => {
        if (!choice || !needed) return null;

        if (choice.kind === 'spell')
            return {
                kind: 'spell',
                options: spells
                    .filter(
                        (s) =>
                            s.level <= choice.maxLevel &&
                            s.id !== state.pick?.spellId
                    )
                    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
                    .map((s) => ({ id: s.id, label: `${s.level} · ${s.name}` })),
            };

        const target = targets.find((t) => state.targetIds.includes(t.basicInfo.id));

        const limit = target
            ? (target.abilities.cr ?? target.abilities.level)
            : Infinity;

        return {
            kind: 'unit',
            options: units
                .filter(
                    (u) =>
                        u.statblock?.creatureType?.toLowerCase() ===
                            choice.creatureType.toLowerCase() &&
                        (u.cr ?? 0) <= limit
                )
                .sort((a, b) => (a.cr ?? 0) - (b.cr ?? 0) || a.name.localeCompare(b.name))
                .map((u) => ({ id: u.id, label: `CR ${u.cr ?? 0} · ${u.name}` })),
        };
    }, [choice, needed, spells, units, targets, state.targetIds, state.pick?.spellId]);
}
