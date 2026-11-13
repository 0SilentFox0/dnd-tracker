import { ParticipantSourceType } from '@/lib/constants/battle';
import { joinLines, textRef } from '@/lib/i18n/text-ref';
import type { Ruleset } from '@/lib/utils/rules/schema';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import { type SpellDice, spellDice } from '@/lib/utils/spells/model/dice';
import type { SpellEffect } from '@/lib/utils/spells/model/schema';
import type { BattleParticipant } from '@/types/battle';
import type { LogLine } from '@/types/text';

export function casterSpellDice(
    caster: BattleParticipant,
    spell: {
        dice: number;
        groupId: string | null;
        level?: number;
        dieSides?: number | null;
        upcastDice?: number | null;
        fixedDice?: boolean;
    },
    rules: Pick<Ruleset, 'system'>,
    castLevel?: number
): SpellDice {
    const system = ruleSystemOf(rules).magic.casterDice?.(
        caster,
        spell,
        castLevel
    );

    if (system) return system;

    const kind =
        caster.basicInfo.sourceType === ParticipantSourceType.CHARACTER
            ? 'hero'
            : 'unit';

    const mastery = caster.battleData.schoolMastery ?? {};

    return spellDice(
        { kind, level: caster.abilities.level },
        { dice: spell.dice, groupId: spell.groupId },
        (group) => (group ? (mastery[group] ?? null) : null)
    );
}

/** «6к10»: кубики за рівнем героя і майстерністю школи, без плоских бонусів. */
export function spellFormulaLabel(
    caster: BattleParticipant,
    spell: Parameters<typeof casterSpellDice>[1],
    rules: Pick<Ruleset, 'system'>,
    castLevel?: number
): LogLine {
    const { count, sides } = casterSpellDice(caster, spell, rules, castLevel);

    return count === 0
        ? textRef('battleActions.spell.noDice')
        : textRef('battleActions.spell.formula', { count, sides });
}

const diceLabel = (dice: string): LogLine => {
    const m = /^(\d+)d(\d+)$/.exec(dice);

    return m
        ? textRef('battleActions.spell.formula', {
              count: Number(m[1]),
              sides: Number(m[2]),
          })
        : dice;
};

/** Сила заклинання без кубиків каста: діапазон byDistance або кубики лікування варіантів; "" — шкоди/лікування немає. */
export function spellEffectsFormula(effects: SpellEffect[]): LogLine {
    const list = effects.flatMap((e) =>
        e.kind === 'chooseOne' ? e.options : [e]
    );

    const ranges = list.flatMap((e) =>
        e.kind === 'dealDamage' && e.byDistance ? [e.byDistance] : []
    )[0];

    if (ranges)
        return joinLines([
            diceLabel(ranges[0].dice),
            '…',
            diceLabel(ranges[ranges.length - 1].dice),
        ]);

    const heals = [
        ...new Set(
            list.flatMap((e) =>
                e.kind === 'heal' && typeof e.amount === 'string'
                    ? [e.amount]
                    : []
            )
        ),
    ];

    if (heals.length > 0) return joinLines(heals.map(diceLabel), ' / ');

    return list.some((e) => e.kind === 'dealDamage' || e.kind === 'heal')
        ? textRef('battleActions.spell.noDice')
        : '';
}
