import { AbilitySchema } from '@/lib/utils/abilities/schema';
import { summarizeAbility } from '@/lib/utils/abilities/summary';
import type { ArtifactFormState } from '@/lib/utils/artifacts/artifact-form';
import type { ArtifactForReference } from '@/types/info-reference';

export function toArtifactReferencePreview(
    data: ArtifactFormState,
    ctx: { id?: string; setName?: string | null }
): ArtifactForReference {
    return {
        id: ctx.id ?? '',
        name: data.name,
        icon: data.icon || null,
        rarity: data.rarity || null,
        slot: data.slot,
        description: data.description || null,
        effects: data.abilities
            .filter((a) => AbilitySchema.safeParse(a).success)
            .map(summarizeAbility),
        setName: ctx.setName ?? null,
        holderName: null,
    };
}
