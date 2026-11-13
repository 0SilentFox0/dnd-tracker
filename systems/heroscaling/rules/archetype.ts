import { heroArchetype } from '@/lib/constants/hero-archetypes';
import type { ParticipantPart } from '@/lib/utils/rules/systems/types';

export const heroArchetypePart: ParticipantPart<{
    archetype?: string | null;
}> = (p, { row }) => {
    const archetype = heroArchetype(
        p.abilities.damageModel === '5e' ? null : row.archetype
    );

    return {
        ...p,
        abilities: {
            ...p.abilities,
            meleeMultiplier: archetype.melee,
            rangedMultiplier: archetype.ranged,
            magicMultiplier: archetype.magic,
            archetypeKey: archetype.key ?? 'universal',
        },
    };
};
