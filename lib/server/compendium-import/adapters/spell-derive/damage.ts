import { lineTerrainEffect } from '../spell-patterns/zone-terrain';
import { shape, SpellInput, tags } from './input';
import {
    DEALS,
    LEADING_COUNT,
    PUSH,
    RIDERS,
    UP_TO_CREATURES,
} from './patterns';

import {
    type SpellFacts,
    spellKind,
    spellRange,
} from '@/lib/utils/spells/derive/mechanics';
import { numberWord } from '@/lib/utils/spells/derive/text';

export function damageSpellFacts(
    i: SpellInput,
    roll: string | null,
    condition: SpellFacts['condition'],
    beneficial: SpellFacts['beneficial']
): SpellFacts {
    const { row, text, higher, cast, damageTypes, ability, spellAttack } = i;

    const upTo = UP_TO_CREATURES.exec(text);

    return {
        level: row.level as number,
        desc: text,
        higher_level: higher || null,
        ...cast.facts,
        duration:
            condition === 'immobilized' &&
            cast.facts.duration === 'instantaneous'
                ? 'until dispelled'
                : cast.facts.duration,
        ...shape(text, cast),
        saving_throw_ability: ability,
        damage_roll: roll,
        damage_types: damageTypes,
        target_count: upTo
            ? numberWord(upTo[1])
            : numberWord(LEADING_COUNT.exec(text)?.[1] ?? ''),
        spellAttack,
        immediateDamage: DEALS.test(text),
        condition,
        beneficial,
    };
}

export function damageSpellRiders(
    i: SpellInput,
    facts: SpellFacts,
    kind: ReturnType<typeof spellKind>,
    applied: SpellFacts['condition'] | null
) {
    const { t, text, cast, raw, customConditions } = i;

    const pushed = PUSH.exec(text);

    const pushFeet = pushed ? Number(pushed[1]) : 0;

    const push =
        pushFeet >= 5 &&
        pushFeet <= 30 &&
        pushFeet % 5 === 0 &&
        (kind === 'damage' || kind === 'condition')
            ? pushFeet
            : 0;

    const lineTerrain = lineTerrainEffect(text, spellRange(cast.facts));

    const riders = RIDERS.filter(
        ([re, id]) =>
            re.test(text) &&
            !(push && id === 'push') &&
            !(lineTerrain && id === 'terrain')
    ).map(([, id]) => t(`derived.rider.${id}`));

    if (applied === 'immobilized') riders.push(t('derived.rider.hold'));

    const otherConditions = tags(raw, 'condition').filter(
        (c) =>
            c.toLowerCase() !== applied &&
            customConditions.get(c.toLowerCase()) !== applied
    );

    if (otherConditions.length > 0)
        riders.push(
            t('derived.rider.conditions', { list: otherConditions.join(', ') })
        );

    return { push, lineTerrain, riders };
}
