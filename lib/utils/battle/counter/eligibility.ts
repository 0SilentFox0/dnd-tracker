import type { CounterOffer, InterruptSpell } from './types';

import { CONTROLLED_BY_DM } from '@/lib/constants/characters';
import { isActive } from '@/lib/utils/abilities/engine/core/participants';
import { poolLeft } from '@/lib/utils/abilities/engine/core/usage';
import { reactionsOf } from '@/lib/utils/battle/actions/access';
import { cellsOf, footprintDistance, isOnMap } from '@/lib/utils/battle/grid';
import { cellFeetOf } from '@/lib/utils/battle/grid/cell-feet';
import { wallsAllowSight } from '@/lib/utils/battle/grid/sight';
import { isGrantLive } from '@/lib/utils/battle/spell/inline-grant';
import { resolveChosenSlot } from '@/lib/utils/battle/spell/slot';
import type { Ruleset } from '@/lib/utils/rules';
import { slotRestoreOrder } from '@/lib/utils/spells/slot-keys';
import type { BattleParticipant, SpellGrant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';

export interface CounterReactorsArgs {
    caster: BattleParticipant;
    castSpell: {
        level: number;
        components?: { v: boolean; s: boolean; m: boolean };
    };
    participants: BattleParticipant[];
    interruptSpells: InterruptSpell[];
    rules: Ruleset;
    map: BattleMapConfig | null | undefined;
    round: number;
}

const hasComponents = (c: CounterReactorsArgs['castSpell']['components']) =>
    !c || c.v || c.s || c.m;

function slotLevelsFor(p: BattleParticipant, level: number): number[] {
    const slots = p.spellcasting?.spellSlots ?? {};

    const levels = slotRestoreOrder(slots).flatMap((key) => {
        const chosen = resolveChosenSlot(p, level, key);

        return chosen.ok ? [chosen.castLevel] : [];
    });

    return [...new Set(levels)].sort((a, b) => a - b);
}

function usableGrant(
    p: BattleParticipant,
    spell: InterruptSpell,
    args: CounterReactorsArgs
): SpellGrant | undefined {
    return (p.spellcasting.grants ?? []).find(
        (g) =>
            g.spellId === spell.id &&
            !g.inline &&
            !g.legendaryOnly &&
            (g.castLevel === undefined || g.castLevel >= spell.level) &&
            (!g.pool || (poolLeft(p, g.pool) ?? -1) >= (g.cost ?? 1)) &&
            isGrantLive(g, args.round, args.participants, args.rules)
    );
}

function offerFor(
    p: BattleParticipant,
    spell: InterruptSpell,
    args: CounterReactorsArgs
): CounterOffer | null {
    const base = {
        reactorId: p.basicInfo.id,
        spellId: spell.id,
        dm: p.basicInfo.controlledBy === CONTROLLED_BY_DM,
    };

    const hasGrant = (p.spellcasting.grants ?? []).some(
        (g) => g.spellId === spell.id && !g.inline
    );

    if (hasGrant) {
        const grant = usableGrant(p, spell, args);

        return grant
            ? {
                  ...base,
                  ...(grant.key && { grantKey: grant.key }),
                  slotLevels: [],
              }
            : null;
    }

    if (!p.spellcasting.knownSpells.includes(spell.id)) return null;

    const slotLevels = slotLevelsFor(p, spell.level);

    return slotLevels.length > 0 ? { ...base, slotLevels } : null;
}

export function counterReactors(args: CounterReactorsArgs): CounterOffer[] {
    const { caster, castSpell, participants, interruptSpells, rules, map } =
        args;

    // Monster actions are level-0 rows without component flags; real cantrips always carry them
    const pseudoCast = castSpell.level === 0 && !castSpell.components;

    if (
        pseudoCast ||
        !hasComponents(castSpell.components) ||
        interruptSpells.length === 0
    )
        return [];

    const blocker = reactionsOf(rules).blocker;

    return participants.flatMap((p) => {
        if (
            p.basicInfo.side === caster.basicInfo.side ||
            !isActive(p) ||
            blocker(p) !== null ||
            (map && !wallsAllowSight(map, p, caster))
        )
            return [];

        for (const spell of interruptSpells) {
            if (
                map &&
                isOnMap(p) &&
                isOnMap(caster) &&
                footprintDistance(cellsOf(p), cellsOf(caster)) *
                    cellFeetOf(rules) >
                    spell.range
            )
                continue;

            const offer = offerFor(p, spell, args);

            if (offer) return [offer];
        }

        return [];
    });
}
