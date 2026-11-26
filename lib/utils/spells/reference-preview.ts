import { describeEffect } from '@/lib/utils/abilities/registry/effects';
import { targetingFacetKey } from '@/lib/utils/spells/model/labels';
import { readSpellDefinition } from '@/lib/utils/spells/model/read';
import { spellRules } from '@/lib/utils/spells/to-book-spell';
import type { SpellForReference } from '@/types/info-reference';
import type { SpellFormData } from '@/types/spells';

export function toSpellReferencePreview(
    data: SpellFormData,
    ctx: { id?: string; groupName?: string | null }
): SpellForReference {
    const id = ctx.id ?? '';

    const def = readSpellDefinition({ id, ...data });

    return {
        id,
        name: data.name,
        level: data.level,
        targeting: def.targeting,
        facetKey: targetingFacetKey(def.targeting),
        cost: def.cost,
        resolution: def.resolution,
        dice: def.dice,
        description: data.description ?? '',
        effects: def.effects.map(describeEffect),
        appearanceDescription: data.appearanceDescription ?? null,
        groupName: ctx.groupName ?? null,
        icon: data.icon ?? null,
        fx: data.fx,
        rules: spellRules(def),
    };
}
