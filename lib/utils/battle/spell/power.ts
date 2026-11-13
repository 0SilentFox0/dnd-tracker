import { textRef } from '@/lib/i18n/text-ref';
import { collectModifiers } from '@/lib/utils/abilities/engine/core/collect-modifiers';
import { withSelf } from '@/lib/utils/abilities/engine/core/participants';
import type { StaticEffect } from '@/lib/utils/abilities/schema';
import {
    archetypeRef,
    heroMagicMultiplier,
} from '@/lib/utils/battle/damage/hero-dm-multiplier';
import { multiplierRow, stepRow } from '@/lib/utils/battle/damage/rows';
import {
    spellcastingModifier,
    weaponModifier,
} from '@/lib/utils/battle/spell/ability-modifier';
import { signed } from '@/lib/utils/common/format';
import { type Ruleset } from '@/lib/utils/rules';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { BattleParticipant, DamageRow } from '@/types/battle';

export function spellAttackBonus(
    caster: BattleParticipant,
    weapon = false
): number {
    if (weapon && !caster.spellcasting.spellcastingAbility)
        return caster.abilities.proficiencyBonus + weaponModifier(caster).mod;

    return (
        caster.spellcasting.spellAttackBonus ??
        caster.abilities.proficiencyBonus + spellcastingModifier(caster).mod
    );
}

export interface SpellPower {
    heal: number;
    damage: number;
    breakdown: DamageRow[];
}

export function computeSpellPower(input: {
    caster: BattleParticipant;
    rules: Ruleset;
    groupId: string | null;
    rolls: number[];
    participants: BattleParticipant[];
    extra?: StaticEffect[];
    addAbilityMod?: boolean;
    damageBonus?: number;
}): SpellPower {
    const { caster, rolls } = input;

    if (rolls.length === 0) return { heal: 0, damage: 0, breakdown: [] };

    const sum = rolls.reduce((a, b) => a + b, 0);

    const breakdown: DamageRow[] = [
        stepRow(textRef('battleLog.damage.rows.dice'), sum),
    ];

    const heal = sum + (input.damageBonus ?? 0);

    const mods = collectModifiers(
        withSelf(input.participants, caster),
        caster.basicInfo.id,
        { damage: { kind: 'magic', school: input.groupId } },
        input.extra
    );

    const percentBonus = Math.floor((sum * mods.percent) / 100);

    for (const e of mods.entries) {
        if (e.flat) breakdown.push(stepRow(e.label, signed(e.flat)));

        if (e.percent)
            breakdown.push(
                stepRow(
                    e.label,
                    `+${e.percent}% (${signed(Math.floor((sum * e.percent) / 100))})`
                )
            );
    }

    const abilityMod = input.addAbilityMod
        ? (ruleSystemOf(input.rules).magic.spellAbilityMod?.(caster) ?? null)
        : null;

    if (abilityMod)
        breakdown.push(
            stepRow(
                textRef('battleLog.damage.rows.spellMod', {
                    label: abilityMod.label,
                }),
                signed(abilityMod.mod)
            )
        );

    if (input.damageBonus)
        breakdown.push(
            stepRow(
                textRef('battleLog.damage.rows.spellBonus'),
                signed(input.damageBonus)
            )
        );

    const raw = heal + mods.flat + percentBonus + (abilityMod?.mod ?? 0);

    const mult = heroMagicMultiplier(caster);

    const damage = mult === 1 ? raw : Math.floor(raw * mult);

    if (mult !== 1)
        breakdown.push(multiplierRow(archetypeRef(caster), mult, damage));

    return { heal: heal + (abilityMod?.mod ?? 0), damage, breakdown };
}
