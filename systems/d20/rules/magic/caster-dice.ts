import { isFiveE } from '../damage-model';

import type { RuleSystemMagic } from '@/lib/utils/rules/systems/types';
import { spellDice5e } from '@/lib/utils/spells/model/dice';

export const d20CasterDice: NonNullable<RuleSystemMagic['casterDice']> = (
    caster,
    spell,
    castLevel
) =>
    isFiveE(caster)
        ? spellDice5e(
              {
                  dice: spell.dice,
                  level: spell.level ?? 0,
                  dieSides: spell.dieSides ?? undefined,
                  upcastDice: spell.fixedDice
                      ? 0
                      : (spell.upcastDice ?? undefined),
              },
              spell.fixedDice ? 1 : caster.abilities.level,
              castLevel ?? spell.level ?? 0
          )
        : null;
