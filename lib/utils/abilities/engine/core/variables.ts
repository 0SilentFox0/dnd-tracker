import { type Owned, ownedIn } from '@/lib/utils/abilities/registry/owned';
import { SYSTEM_ABILITY_VARIABLES } from '@/lib/utils/abilities/registry/system-variables';
import type { Composition } from '@/lib/utils/rules/systems/catalog';
import type { BattleParticipant } from '@/types/battle';

export type AbilityVariables = Readonly<
    Record<string, (p: BattleParticipant) => number>
>;

const CORE_VARIABLES: AbilityVariables = {
    hero_level: (p) => p.abilities.level,
    // class_level is already substituted into class abilities at collection time (applyClassScale)
    class_level: (p) => p.abilities.level,
    lost_hp_percent: ({ combatStats: { maxHp, currentHp } }) =>
        maxHp > 0 ? ((maxHp - currentHp) / maxHp) * 100 : 0,
    cells_moved: (p) => p.battleData.movementUsed ?? 0,
};

const OWNERS: readonly Owned<AbilityVariables>[] = [
    { system: '', items: CORE_VARIABLES },
    ...SYSTEM_ABILITY_VARIABLES,
];

function merge(lists: readonly AbilityVariables[]): AbilityVariables {
    const out: Record<string, (p: BattleParticipant) => number> = {};

    for (const list of lists) {
        for (const [name, read] of Object.entries(list)) {
            if (Object.hasOwn(out, name))
                throw new Error(`Formula variable collision: ${name}`);

            out[name] = read;
        }
    }

    return out;
}

/** Every variable any module provides; stored formulas of an inactive module still evaluate. */
export const ABILITY_VARIABLES: AbilityVariables = merge(
    OWNERS.map((o) => o.items)
);

/** Variable names offered to the editor for a composition. */
export const variableNamesOf = (c: Composition): string[] =>
    Object.keys(
        merge([CORE_VARIABLES, ...ownedIn(SYSTEM_ABILITY_VARIABLES, c)])
    );
