import { z } from 'zod';

import { AttackType } from '@/lib/constants/battle';
import { MAX_CLASS_LEVEL } from '@/lib/constants/classes';
import { getHeroDamageDiceForLevel } from '@/lib/constants/hero-scaling';
import {
    itemsFromShape,
    type SectionsContribution,
} from '@/lib/utils/rules/sections';

const level = z.string().regex(/^([1-9]|1\d|20)$/);

const DiceTable = z.record(level, z.string().regex(/^\d+d\d+([+-]\d+d\d+)*$/));

export const HeroScalingRulesSchema = z.strictObject({
    meleeDiceByLevel: DiceTable.nullable(),
    rangedDiceByLevel: DiceTable.nullable(),
    hpBaseLevels: z.number().int().min(0).max(10),
    hpConCoefficient: z.number().min(0).max(5),
});

export type HeroScalingRules = z.output<typeof HeroScalingRulesSchema>;

export const DEFAULT_HERO_SCALING_RULES: HeroScalingRules = {
    meleeDiceByLevel: null,
    rangedDiceByLevel: null,
    hpBaseLevels: 3,
    hpConCoefficient: 1.5,
};

declare module '@/lib/utils/rules/section-shapes' {
    interface RulesetExtensions {
        heroScaling: HeroScalingRules;
    }
}

type DiceTableValue = Record<string, string> | null;

const fillDiceTable = (
    table: DiceTableValue,
    type: AttackType
): DiceTableValue =>
    table &&
    Object.fromEntries(
        Array.from({ length: MAX_CLASS_LEVEL }, (_, i) => i + 1).map((l) => [
            l,
            table[l]?.trim() || getHeroDamageDiceForLevel(l, type),
        ])
    );

export const HEROSCALING_SECTIONS: SectionsContribution = {
    sections: {
        heroScaling: {
            owner: 'heroscaling',
            mechanic: true,
            labels: 'rulesHeroScaling',
            items: itemsFromShape(
                HeroScalingRulesSchema.shape as never,
                DEFAULT_HERO_SCALING_RULES
            ),
            prepareSave: (value) => ({
                ...value,
                meleeDiceByLevel: fillDiceTable(
                    value.meleeDiceByLevel as DiceTableValue,
                    AttackType.MELEE
                ),
                rangedDiceByLevel: fillDiceTable(
                    value.rangedDiceByLevel as DiceTableValue,
                    AttackType.RANGED
                ),
            }),
        },
    },
};
