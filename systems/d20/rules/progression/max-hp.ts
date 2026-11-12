import { classHp } from './class-hp';
import { heroHpFallback } from './hero-hp';

import { hitDiceLabel } from '@/lib/utils/characters/classes';
import { sheetLineKey } from '@/lib/utils/characters/sheet/line-key';
import type { RuleSystemDefinition } from '@/lib/utils/rules/systems/types';

export const d20MaxHp: RuleSystemDefinition['progression']['maxHp'] = ({
    character,
    entries,
    rules,
}) => {
    const withClass = entries?.some((e) => e.class) ? [...entries] : null;

    if (withClass)
        return {
            total: classHp(withClass, character.constitution),
            breakdown: [
                {
                    label: sheetLineKey('hitDice'),
                    params: { dice: hitDiceLabel(withClass) },
                },
            ],
        };

    return heroHpFallback(character, rules.heroScaling);
};
