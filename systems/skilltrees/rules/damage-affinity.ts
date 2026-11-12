import { AttackType } from '@/lib/constants/battle';
import type { Ability } from '@/lib/utils/abilities/schema';
import { unconditionalPassives } from '@/lib/utils/abilities/sheet-bonuses';

export type DamageAffinityType = AttackType | 'magic';

export function damageAffinity(abilities: Ability[]): {
    affectsDamage: boolean;
    damageType: DamageAffinityType | null;
} {
    const kinds = new Set<string>();

    for (const a of unconditionalPassives(abilities)) {
        for (const e of a.effects)
            if (e.kind === 'damageBonus') kinds.add(e.filter.kind);
    }

    if (kinds.size === 0) return { affectsDamage: false, damageType: null };

    const [only] = [...kinds];

    return {
        affectsDamage: true,
        damageType:
            kinds.size === 1 &&
            (only === AttackType.MELEE ||
                only === AttackType.RANGED ||
                only === 'magic')
                ? only
                : null,
    };
}
