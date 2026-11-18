import { damageSpellFacts, damageSpellRiders } from './spell-derive/damage';
import {
    conditionOf,
    CustomKeys,
    readSpellInput,
    SpellInput,
    tags,
} from './spell-derive/input';
import {
    EXTRA_FILTERED_TARGETS,
    REST,
    VARIABLE,
    withSaveEnds,
} from './spell-derive/patterns';
import { screenSpell, slowedSpell, speedUpSpell } from './spell-derive/screens';
import { SpellDerivation } from './spell-derive/types';
import { withTargetFilter } from './spell-patterns/target-filter';
import type { SpellCast } from './spell-cast';

import { type AbilityKey } from '@/lib/constants/abilities';
import type { Translator } from '@/lib/i18n/translator';
import { isCustomConditionKey } from '@/lib/utils/abilities/schema/kinds';
import {
    ADDS_MOD,
    spellEffects,
    spellKind,
    spellResolution,
    spellSide,
    spellTargeting,
    spellUpcast,
    validDice,
} from '@/lib/utils/spells/derive/mechanics';

function damageOrConditionSpell(i: SpellInput): SpellDerivation {
    const {
        t,
        row,
        text,
        higher,
        cast,
        raw,
        damageTypes,
        ability,
        spellAttack,
        customConditions,
    } = i;

    const damageDice = tags(raw, 'damage');

    const diceTags = tags(raw, 'dice');

    const roll =
        REST.test(text) && damageTypes.length === 0
            ? null
            : damageDice.length === 1
              ? damageDice[0]
              : damageDice.length === 0 && diceTags.length === 1
                ? diceTags[0]
                : null;

    if (
        VARIABLE.test(text) ||
        (damageTypes.length > 0 && damageDice.length > 1)
    )
        return { blocker: 'VARIABLE_DAMAGE' };

    const { condition, beneficial } = conditionOf(
        row,
        raw,
        text,
        ability !== null,
        customConditions
    );

    const facts = damageSpellFacts(i, roll, condition, beneficial);

    const kind = spellKind(facts);

    if (kind === 'none') {
        return {
            blocker: 'UNMODELED_EFFECT',
            detail: {
                save: ability ?? 'none',
                attack: spellAttack ? 'yes' : 'no',
                damage: damageTypes.length > 0 ? 'yes' : 'no',
            },
        };
    }

    const side = spellSide(facts, kind);

    const targeting = spellTargeting(facts, side, kind);

    const dice = kind === 'damage' || kind === 'heal' ? validDice(facts) : null;

    const applied = kind === 'condition' ? condition : null;

    const { push, lineTerrain, riders } = damageSpellRiders(
        i,
        facts,
        kind,
        applied
    );

    return {
        native: {
            narrative: false,
            riders,
            fields: {
                targeting: withTargetFilter(targeting, text, higher),
                resolution: spellResolution(facts, kind, targeting),
                spellEffects: [
                    ...withSaveEnds(
                        spellEffects(facts, kind),
                        ability as AbilityKey | null,
                        text,
                        applied
                    ),
                    ...(push
                        ? [{ kind: 'push', feet: push, from: 'caster' }]
                        : []),
                    ...(lineTerrain ? [lineTerrain] : []),
                ],
                dice: dice?.count ?? 0,
                ...(dice && { dieSides: dice.sides }),
                ...spellUpcast(facts, kind),
                ...(isCustomConditionKey(applied) &&
                    EXTRA_FILTERED_TARGETS.test(higher) && {
                        upcastTargets: 1,
                    }),
                ...(kind === 'heal' &&
                    ADDS_MOD.test(text) && { addAbilityMod: true }),
            },
        },
    };
}

export function deriveSpell(
    row: Record<string, unknown>,
    text: string,
    higher: string,
    cast: SpellCast,
    t: Translator,
    customConditions: CustomKeys = new Map()
): SpellDerivation {
    const input = readSpellInput(row, text, higher, cast, t, customConditions);

    return (
        screenSpell(input) ??
        slowedSpell(input) ??
        speedUpSpell(input) ??
        damageOrConditionSpell(input)
    );
}

export {
    type DerivedSpell,
    type SpellBlocker,
    type SpellDerivation,
} from './spell-derive/types';
