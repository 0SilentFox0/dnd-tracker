import {
    createsPlainObject,
    isOutOfCombatBuff,
    type NarrativeReason,
    withoutObjectConditions,
    withoutRestOrTravel,
} from '../spell-narrative';
import { recognizeSpell } from '../spell-patterns';
import { hasAny, hasSignals, RESIST_KEYS, SpellInput } from './input';
import {
    BUFF,
    CHOICE,
    RIDERS,
    SELF_AND_OTHERS,
    SELF_DAMAGE,
    SLOWED,
    SPEED_UP,
    UP_TO_CREATURES,
    WEAPON,
    ZONE,
} from './patterns';
import { SpellDerivation } from './types';

import { type AbilityKey } from '@/lib/constants/abilities';
import {
    durationRounds,
    type SpellFacts,
    spellRange,
    spellTargeting,
    spellUpcast,
} from '@/lib/utils/spells/derive/mechanics';
import { numberWord } from '@/lib/utils/spells/derive/text';

export const narrative = (
    narrativeReason: NarrativeReason
): SpellDerivation => ({
    native: {
        fields: {
            targeting: { kind: 'self' },
            resolution: { kind: 'auto' },
            dice: 0,
            spellEffects: [],
        },
        narrative: true,
        narrativeReason,
        riders: [],
    },
});

/** Narrative and blocker outcomes decided from the row and text alone, in priority order. */
export function screenSpell(i: SpellInput): SpellDerivation | undefined {
    const {
        t,
        row,
        text,
        higher,
        cast,
        raw,
        misc,
        damageTypes,
        ability,
        signals,
        rowCombat,
    } = i;

    if (!rowCombat && isOutOfCombatBuff(cast, text))
        return narrative('outOfCombat');

    if (
        signals &&
        !hasSignals(rowCombat, ability, withoutRestOrTravel(text), raw)
    )
        return narrative('outOfCombat');

    if (
        signals &&
        !hasSignals(rowCombat, ability, text, withoutObjectConditions(raw))
    )
        return narrative('objectOnly');

    if (!signals && createsPlainObject(misc, text, raw))
        return narrative('createdObject');

    const recognized = recognizeSpell({
        t,
        row,
        raw,
        text,
        higher,
        cast,
        ability: ability as AbilityKey | null,
        damageTypes,
    });

    if (recognized) return recognized;

    if (misc.includes('SMN')) return { blocker: 'SUMMON' };

    if (BUFF.test(text) || hasAny(row, RESIST_KEYS))
        return { blocker: 'BUFF_OR_TRANSFORM' };

    if (signals && ZONE.test(i.triggerText))
        return { blocker: 'ZONE_OR_TRIGGER' };

    if (WEAPON.test(text)) return { blocker: 'WEAPON' };

    if (!signals) return narrative('noCombatNumbers');

    if (i.unknownConditions.length > 0)
        return {
            blocker: 'UNSUPPORTED_CONDITION',
            detail: { condition: i.unknownConditions[0] },
        };

    if (SELF_DAMAGE.test(text)) return { blocker: 'SELF_DAMAGE' };

    return undefined;
}

export function slowedSpell(i: SpellInput): SpellDerivation | undefined {
    const { text, cast } = i;

    const slowed = SLOWED.exec(text);

    if (!slowed || i.damageTypes.length > 0 || i.ability || i.spellAttack)
        return undefined;

    const range = spellRange(cast.facts);

    return {
        native: {
            narrative: false,
            riders: [],
            fields: {
                targeting: {
                    kind: 'enemy',
                    ...(range !== 'self' && { range }),
                },
                resolution: { kind: 'auto' },
                dice: 0,
                spellEffects: [
                    {
                        kind: 'modifyStat',
                        stat: 'speed',
                        flat: -Number(slowed[1]),
                        duration: {
                            rounds: durationRounds(cast.facts.duration),
                        },
                    },
                ],
            },
        },
    };
}

export function speedUpSpell(i: SpellInput): SpellDerivation | undefined {
    const { row, text, higher, cast } = i;

    const sped = SPEED_UP.exec(text);

    if (
        !sped ||
        i.damageTypes.length > 0 ||
        i.ability ||
        i.spellAttack ||
        CHOICE.test(text)
    )
        return undefined;

    const withSelf = SELF_AND_OTHERS.exec(text);

    const upTo = UP_TO_CREATURES.exec(text);

    const count = withSelf
        ? (numberWord(withSelf[1]) ?? 0) + 1
        : upTo
          ? numberWord(upTo[1])
          : null;

    const facts: SpellFacts = {
        level: row.level as number,
        desc: text,
        higher_level: higher || null,
        ...cast.facts,
        shape_type: null,
        shape_size: null,
        saving_throw_ability: null,
        damage_roll: null,
        damage_types: [],
        target_count: count,
    };

    const riders = RIDERS.filter(
        ([re, id]) => id !== 'speed' && re.test(text)
    ).map(([, id]) => i.t(`derived.rider.${id}`));

    if (i.moveTrigger) riders.push(i.t('derived.rider.reaction'));

    return {
        native: {
            narrative: false,
            riders,
            fields: {
                targeting: spellTargeting(facts, 'ally'),
                resolution: { kind: 'auto' },
                dice: 0,
                spellEffects: [
                    {
                        kind: 'modifyStat',
                        stat: 'speed',
                        flat: Number(sped[1]),
                        duration: {
                            rounds: durationRounds(cast.facts.duration),
                        },
                    },
                ],
                ...spellUpcast(facts, 'none'),
            },
        },
    };
}
