import { describeEffect } from '@/lib/utils/abilities/registry/effects';
import { targetingFacetKey } from '@/lib/utils/spells/model/labels';
import type { SpellForReference } from '@/types/info-reference';
import type { SpellFormData, SpellRules } from '@/types/spells';

function rulesOf(data: SpellFormData): SpellRules {
    return {
        ...(data.executionMode && { executionMode: data.executionMode }),
        dice: data.dice,
        cost: data.cost,
        casting: data.casting,
        targeting: data.targeting,
        resolution: data.resolution,
        spellEffects: data.spellEffects,
        ...(data.stackable && {
            stackable: true,
            maxStacks: data.maxStacks,
        }),
        ...(data.dieSides && {
            dieSides: data.dieSides as SpellRules['dieSides'],
        }),
        ...(data.upcastDice != null && { upcastDice: data.upcastDice }),
        ...(data.upcastTargets != null && {
            upcastTargets: data.upcastTargets,
        }),
        ...(data.addAbilityMod && { addAbilityMod: true }),
        ...(data.fixedDice && { fixedDice: true }),
        ...(data.damageBonus != null && { damageBonus: data.damageBonus }),
    };
}

export function toSpellReferencePreview(
    data: SpellFormData,
    ctx: { id?: string; groupName?: string | null }
): SpellForReference {
    return {
        id: ctx.id ?? '',
        name: data.name,
        level: data.level,
        targeting: data.targeting,
        facetKey: targetingFacetKey(data.targeting),
        cost: data.cost,
        resolution: data.resolution,
        dice: data.dice,
        description: data.description || null,
        effects: data.spellEffects.map(describeEffect),
        appearanceDescription: data.appearanceDescription || null,
        groupName: ctx.groupName ?? null,
        icon: data.icon || null,
        fx: Object.values(data.fx).some(Boolean) ? data.fx : null,
        rules: rulesOf(data),
    };
}
