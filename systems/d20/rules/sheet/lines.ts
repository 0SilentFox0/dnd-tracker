import { bakedStatSources } from '@/lib/utils/abilities/build/bake';
import {
    collectModifiers,
    statWithModifiers,
} from '@/lib/utils/abilities/engine/core/collect-modifiers';
import {
    classArmorBase,
    isClassModeHero,
} from '@/lib/utils/characters/classes/armor-class';
import { sheetLineKey } from '@/lib/utils/characters/sheet/line-key';
import { asSource, labelParts } from '@/lib/utils/characters/sheet/line-parts';
import { getAbilityModifier } from '@/lib/utils/common/calculations';
import { signed } from '@/lib/utils/common/format';
import type { BattleParticipant } from '@/types/battle';
import type { AbilityKey, SheetLine, SheetTotal } from '@/types/characters';

export function abilityLines(
    p: BattleParticipant,
    key: AbilityKey,
    base: number
): SheetLine[] {
    return [
        { label: sheetLineKey('base'), value: String(base), source: 'base' },
        ...bakedStatSources(p, key).map((s) => ({
            ...labelParts(s.label),
            value: signed(s.value),
            source: asSource(s.sourceType),
        })),
    ];
}

export function armorTotal(p: BattleParticipant): SheetTotal {
    const mods = collectModifiers([p], p.basicInfo.id, { stat: 'armor' });

    const base: SheetLine[] = isClassModeHero(p)
        ? classArmorBase(p).lines
        : [
              {
                  label: sheetLineKey('base'),
                  value: String(p.combatStats.armorClass),
                  source: 'base',
              },
          ];

    return {
        total: statWithModifiers(
            [p],
            p.basicInfo.id,
            'armor',
            p.combatStats.armorClass
        ),
        lines: [
            ...base,
            ...mods.entries.flatMap((e) => [
                ...(e.flat
                    ? [
                          {
                              ...labelParts(e.label),
                              value: signed(e.flat),
                              source: asSource(e.sourceType),
                          },
                      ]
                    : []),
                ...(e.percent
                    ? [
                          {
                              ...labelParts(e.label),
                              value: `${signed(e.percent)}%`,
                              source: asSource(e.sourceType),
                          },
                      ]
                    : []),
            ]),
        ],
    };
}

export const checkBonus = (score: number, proficient: boolean, prof: number) =>
    getAbilityModifier(score) + (proficient ? prof : 0);
