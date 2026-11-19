import type { Ability } from '@/lib/utils/abilities/schema';

const REGEN =
    /regains (\d+) Hit Points at the start of (?:each of )?its turns?/i;

const REGEN_GUARD =
    /If (?:the|it|its)\b[^.]*? takes ([^.]*?) damage[^.]*?, this trait doesn't function/i;

const DAMAGE_WORD =
    /\b(acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder)\b/gi;

function regenGuardTypes(description: string): string[] {
    const clause = REGEN_GUARD.exec(description)?.[1] ?? '';

    return [...clause.matchAll(DAMAGE_WORD)].map((m) => m[1].toLowerCase());
}

type TraitCore = Pick<Ability, 'trigger' | 'effects'>;

/** Engine form of the traits every monster source shares; undefined means the trait stays a note. */
export function coreTrait(
    name: string,
    description: string
): TraitCore | undefined {
    if (name.startsWith('Magic Resistance'))
        return {
            trigger: { event: 'passive' },
            effects: [
                {
                    kind: 'flag',
                    flag: 'saveAdvantage',
                    abilities: 'all',
                    vsSpells: true,
                },
            ],
        };

    const regen = name.startsWith('Regeneration')
        ? REGEN.exec(description)
        : null;

    if (regen) {
        const unlessDamagedBy = regenGuardTypes(description);

        return {
            trigger: { event: 'turnStart' },
            effects: [
                {
                    kind: 'heal',
                    amount: Number(regen[1]),
                    target: 'self',
                    ...(unlessDamagedBy.length > 0 && { unlessDamagedBy }),
                },
            ],
        };
    }
}

/** The engine reads one speed: the fastest of walk/fly, else swim, climb, burrow. */
export function battleSpeed(s: {
    walk?: number | null;
    fly?: number | null;
    swim?: number | null;
    climb?: number | null;
    burrow?: number | null;
}): number {
    return (
        Math.max(s.walk ?? 0, s.fly ?? 0) || s.swim || s.climb || s.burrow || 0
    );
}
