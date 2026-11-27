'use client';

import { useMemo } from 'react';

import { ParticipantSide, ParticipantSourceType } from '@/lib/constants/battle';
import { useCharacters } from '@/lib/hooks/characters';
import { useUnits } from '@/lib/hooks/units';
import type { BattlePreparationParticipant } from '@/types/battle';

export interface PrepRosterEntry {
    id: string;
    name: string;
    avatar: string | null;
    quantity: number;
}

export type PrepRoster = Record<ParticipantSide, PrepRosterEntry[]>;

export function usePrepRoster(
    campaignId: string,
    participants: BattlePreparationParticipant[],
    enabled: boolean
): PrepRoster | null {
    const characters = useCharacters(campaignId, { compact: true, enabled });

    const units = useUnits(campaignId, undefined, { enabled });

    return useMemo(() => {
        if (!enabled || !characters.data || !units.data) return null;

        const byId = {
            [ParticipantSourceType.CHARACTER]: new Map<string, PrepRosterEntry>(
                characters.data.map((c) => [
                    c.id,
                    {
                        id: c.id,
                        name: c.name,
                        avatar: c.avatar ?? null,
                        quantity: 1,
                    },
                ])
            ),
            [ParticipantSourceType.UNIT]: new Map<string, PrepRosterEntry>(
                units.data.map((u) => [
                    u.id,
                    {
                        id: u.id,
                        name: u.name,
                        avatar: u.avatar ?? null,
                        quantity: 1,
                    },
                ])
            ),
        };

        const roster: PrepRoster = {
            [ParticipantSide.ALLY]: [],
            [ParticipantSide.ENEMY]: [],
        };

        for (const p of participants) {
            const entity = byId[p.type as keyof typeof byId]?.get(p.id);

            if (entity)
                roster[p.side].push({ ...entity, quantity: p.quantity ?? 1 });
        }

        return roster;
    }, [enabled, characters.data, units.data, participants]);
}
