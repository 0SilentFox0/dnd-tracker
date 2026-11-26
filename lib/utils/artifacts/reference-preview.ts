import { AbilitySchema } from '@/lib/utils/abilities/schema';
import { type AbilityFlowSummary, summarizeAbility } from '@/lib/utils/abilities/summary';
import type { ArtifactFormState } from '@/lib/utils/artifacts/artifact-form';
import type { ArtifactForReference } from '@/types/info-reference';

export function toArtifactReferencePreview(
    data: Pick<
        ArtifactFormState,
        'name' | 'description' | 'rarity' | 'slot' | 'icon' | 'abilities'
    >,
    ctx: { id?: string; setName?: string | null }
): ArtifactForReference {
    const effects: AbilityFlowSummary[] = data.abilities
        .filter((a) => AbilitySchema.safeParse(a).success)
        .map(summarizeAbility);

    return {
        id: ctx.id ?? '',
        name: data.name,
        icon: data.icon || null,
        rarity: data.rarity || null,
        slot: data.slot,
        description: data.description,
        effects,
        setName: ctx.setName ?? null,
        holderName: null,
    };
}
