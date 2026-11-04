import { skillTarget, value } from "../characteristics/derive";
import { readCharacteristics } from "../characteristics/keys";
import { BALANCE_REF_AP, BALANCE_REF_TARGET, BALANCE_REF_TB, MIN_DAMAGE } from "./constants";
import { winChance } from "./win-chance";

import { diceAverage } from "@/lib/utils/common/dice";
import type { RuleSystemCombat } from "@/lib/utils/rules/systems/types";
import type { BattleParticipant } from "@/types/battle";

const charsOf = (p: BattleParticipant) => readCharacteristics({ characteristics: p.abilities.characteristics });

function bestWeaponAverage(p: BattleParticipant): number {
  return (p.battleData.attacks ?? []).reduce((best, a) => Math.max(best, diceAverage(a.damageDice || "0") + (a.damageBonus ?? 0)), 0);
}

export const wfrpHitModel: NonNullable<RuleSystemCombat["hitModel"]> = {
  offense: (p) => value(charsOf(p), "ws"),
  defense: (p) => {
    const c = charsOf(p);

    return Math.max(value(c, "ws"), skillTarget(c, "dodge")?.target ?? value(c, "ag"));
  },
  winChance,
  damage: (p) => Math.max(MIN_DAMAGE, (p.abilities.wfrp?.sb ?? 0) + bestWeaponAverage(p) - BALANCE_REF_TB - BALANCE_REF_AP),
  refHit: winChance(BALANCE_REF_TARGET, BALANCE_REF_TARGET),
};
