import { LOCATIONS } from '../combat/constants';
import { wfrpAttackFromProfile } from '../combat/extract-attacks';
import { wfrpParticipantFields } from '../combat/participant';
import { editionOf } from '../edition';
import { AP_CAP } from '../equipment/constants';
import type { WeaponProfile } from '../equipment/weapon-profile';
import { PARTICIPANT_SLOT, type WfrpParticipantSlot } from '../slots';
import { breathBlastCells, breathRangeFt } from './breath';
import {
    BREATH_BLAST,
    BREATH_DEFAULT_RANGE_FT,
    RANGED_DEFAULT_RANGE_FT,
    TRAIT_MELEE_CELLS,
} from './constants';
import { sizeStep, traitEntries } from './read';

import type { ExtractedAttack } from '@/lib/utils/battle/types/participant';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { SystemSlot } from '@/lib/utils/rules/systems/slot';
import type { WfrpEffect } from '@/systems/wfrp/rules/ability-effects';
import type { TraitSize } from '@/systems/wfrp/rules/trait-kinds';
import type { ResolvedAbility } from '@/types/abilities';

type AttackEffect = Extract<WfrpEffect, { kind: 'wfrpAttack' }>;

function attackProfile(
    e: AttackEffect,
    breather?: { sb: number; tb: number }
): WeaponProfile {
    if (e.attack === 'breath') {
        if (e.breath && breather)
            return {
                range: 'ranged',
                rangeFt: breathRangeFt(breather.tb),
                damageFlat: e.damage,
                addSb: false,
                qualities: [
                    { key: 'blast', value: breathBlastCells(breather.sb) },
                ],
                flaws: [],
                twoHanded: false,
            };

        return {
            range: 'ranged',
            rangeFt: e.rangeFt ?? BREATH_DEFAULT_RANGE_FT,
            damageFlat: e.damage,
            addSb: false,
            qualities: [{ key: 'blast', value: BREATH_BLAST }],
            flaws: [],
            twoHanded: false,
        };
    }

    if (e.attack === 'ranged')
        return {
            range: 'ranged',
            rangeFt: e.rangeFt ?? RANGED_DEFAULT_RANGE_FT,
            damageFlat: e.damage,
            addSb: true,
            qualities: [],
            flaws: [],
            twoHanded: false,
        };

    return {
        range: 'melee',
        cells: TRAIT_MELEE_CELLS,
        damageFlat: e.damage,
        addSb: true,
        qualities: [],
        flaws: [],
        twoHanded: false,
    };
}

export function wfrpUnitBuild(
    row: { id: string; characteristics?: unknown },
    abilities: readonly ResolvedAbility[],
    rules?: Ruleset
): { fields: SystemSlot; attacks: ExtractedAttack[] } {
    const baseSlot = wfrpParticipantFields(row);

    const canonTraits = editionOf(rules).traitModel === 'canon';

    const entries = traitEntries(abilities);

    if (entries.length === 0) return { fields: baseSlot, attacks: [] };

    const base = PARTICIPANT_SLOT.read(baseSlot) as WfrpParticipantSlot;

    const ap = { ...base.stats.ap };

    let armoured = false;

    let ward: number | undefined;

    let size: TraitSize | undefined;

    const attacks: ExtractedAttack[] = [];

    for (const { ability, effect, index } of entries) {
        switch (effect.kind) {
            case 'wfrpArmour':
                armoured = true;
                for (const l of LOCATIONS)
                    ap[l] = Math.min(AP_CAP, Math.max(ap[l], effect[l]));
                break;
            case 'wfrpWard':
                ward = Math.min(ward ?? effect.value, effect.value);
                break;
            case 'wfrpSize':
                if (
                    size === undefined ||
                    sizeStep(effect.size) > sizeStep(size)
                )
                    size = effect.size;

                break;
            case 'wfrpAttack':
                attacks.push(
                    wfrpAttackFromProfile(
                        `${row.id}-trait-${ability.key}-${index}`,
                        ability.name,
                        attackProfile(
                            effect,
                            canonTraits ? base.stats : undefined
                        ),
                        effect.magical ||
                            effect.free ||
                            (canonTraits && effect.breath)
                            ? {
                                  ...(effect.magical && { magical: true }),
                                  ...(effect.free && { free: true }),
                                  ...(canonTraits &&
                                      effect.breath && {
                                          breath: effect.breath,
                                      }),
                              }
                            : undefined
                    )
                );
                break;
        }
    }

    return {
        fields: PARTICIPANT_SLOT.write(
            {
                ...base,
                stats: {
                    ...base.stats,
                    ...(armoured && { ap }),
                    ...(ward !== undefined && { ward }),
                    ...(size !== undefined && { size }),
                },
            },
            baseSlot
        ),
        attacks,
    };
}
