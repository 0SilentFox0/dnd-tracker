import { heroArchetype } from '@/lib/constants/hero-archetypes';
import type { HpBreakdownLine } from '@/lib/utils/characters/hero-hp';
import { getAbilityModifier } from '@/lib/utils/common/calculations';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { CharacterHpInput } from '@/lib/utils/rules/systems/types';
import type { TextRef } from '@/types/choices';

export interface HeroHpFormula {
    baseLevels: number;
    conCoefficient: number;
}

export function getHeroMaxHpBreakdown(
    level: number,
    constitution: number,
    archetype: string | null | undefined,
    hp: HeroHpFormula
): { total: number; breakdown: TextRef[] } {
    const a = heroArchetype(archetype);

    const conMod = getAbilityModifier(constitution);

    const base = hp.baseLevels * a.hpPerLevel;

    const perLevel = a.hpPerLevel + conMod * hp.conCoefficient;

    const total = Math.max(1, Math.floor(base + level * perLevel));

    return {
        total,
        breakdown: [
            {
                message: 'characterProfile.sheet.heroHp.formula',
                params: {
                    archetype: a.key ?? 'universal',
                    baseLevels: String(hp.baseLevels),
                    hpPerLevel: String(a.hpPerLevel),
                    conMod: String(conMod),
                    conCoefficient: String(hp.conCoefficient),
                },
            },
            {
                message: 'characterProfile.sheet.heroHp.total',
                params: {
                    base: String(base),
                    level: String(level),
                    perLevel: String(perLevel),
                    total: String(total),
                },
            },
        ],
    };
}

export const heroBaseHp = (
    c: CharacterHpInput,
    scaling: Ruleset['heroScaling']
) =>
    getHeroMaxHpBreakdown(c.level, c.constitution, c.archetype, {
        baseLevels: scaling.hpBaseLevels,
        conCoefficient: scaling.hpConCoefficient,
    });

export function heroHpFallback(
    c: CharacterHpInput,
    scaling: Ruleset['heroScaling']
): { total: number; breakdown: HpBreakdownLine[] } {
    const hero = heroBaseHp(c, scaling);

    return {
        total: hero.total,
        breakdown: hero.breakdown.map((line) => ({
            label: line.message,
            params: line.params,
        })),
    };
}
