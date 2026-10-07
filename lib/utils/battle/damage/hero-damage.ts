import { ParticipantSourceType } from "@/lib/constants/battle";
import { getHeroDamageDiceForLevel } from "@/lib/constants/hero-scaling";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { diceAverage, diceCount, mergeDiceFormulas } from "@/lib/utils/common/dice";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

export interface HeroAttackDamageParts {
  weaponDice: string;
  heroDice: string;
  formula: string;
}

export function heroAttackDamageParts(p: BattleParticipant, attack: BattleAttack): HeroAttackDamageParts {
  const weaponDice = attack.damageDice ?? "";

  if (p.basicInfo.sourceType !== ParticipantSourceType.CHARACTER) return { weaponDice, heroDice: "", formula: weaponDice };

  const type = attackKindOf(attack.type);

  const heroDice = getHeroDamageDiceForLevel(p.abilities.level, type);

  return { weaponDice, heroDice, formula: mergeDiceFormulas(weaponDice, heroDice) };
}

export interface HeroDamageContext {
  heroLevelPart: number;
  heroDicePart: number;
  heroDiceNotation: string;
  weaponDiceNotation: string | undefined;
}

/** Клієнт героя кидає зброю разом із кубиками рівня; якщо кидків менше — кубики рівня йдуть середнім. */
export function heroDamageContext(p: BattleParticipant, attack: BattleAttack, damageRolls: number[]): HeroDamageContext {
  const { weaponDice, heroDice, formula } = heroAttackDamageParts(p, attack);

  const isHero = p.basicInfo.sourceType === ParticipantSourceType.CHARACTER;

  const fullDiceCount = diceCount(weaponDice) + diceCount(heroDice);

  const fullRolls = isHero && fullDiceCount > 0 && damageRolls.length === fullDiceCount;

  return {
    heroLevelPart: isHero ? p.abilities.level : 0,
    heroDicePart: heroDice && !fullRolls ? diceAverage(heroDice) : 0,
    heroDiceNotation: fullRolls ? "" : heroDice,
    weaponDiceNotation: (fullRolls ? formula : "") || weaponDice || undefined,
  };
}
