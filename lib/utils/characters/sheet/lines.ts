import { collectModifiers } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { calculateAttackBonus } from "@/lib/utils/battle/attack";
import { attackDamageModifier, attackRollModifier } from "@/lib/utils/battle/attack/ability";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { averageAttackDamage } from "@/lib/utils/battle/damage/average";
import { sheetLineKey } from "@/lib/utils/characters/sheet/line-key";
import { abilityLabel, asSource, labelParts } from "@/lib/utils/characters/sheet/line-parts";
import { signed } from "@/lib/utils/common/format";
import type { BattleAttack, BattleParticipant } from "@/types/battle";
import type { SheetAttack, SheetLine } from "@/types/characters";
import type { LogLine } from "@/types/text";

const plainLabel = (label: LogLine) => (typeof label === "string" ? label : label.message);

const HERO_LEVEL_STEP = "battleLog.damage.steps.heroLevel";

export function attackSheet(p: BattleParticipant, attack: BattleAttack): SheetAttack {
  const type = attackKindOf(attack.type);

  const statMod = attackDamageModifier(p, attack);

  const hitMod = attackRollModifier(p, attack);

  const avg = averageAttackDamage(p, attack, [p]);

  const star = p.abilities.primaryAbility ? " ★" : undefined;

  const hitMods = collectModifiers([p], p.basicInfo.id, { stat: "attackBonus", attackKind: type });

  const toHitLines: SheetLine[] = [
    { label: abilityLabel(avg.statKey), suffix: star, value: signed(hitMod), source: "ability" },
    { label: sheetLineKey("proficiency"), value: signed(p.abilities.proficiencyBonus), source: "proficiency" },
    ...(attack.attackBonus ? [{ label: sheetLineKey("weapon"), value: signed(attack.attackBonus), source: "weapon" as const }] : []),
    ...hitMods.entries.filter((e) => e.flat).map((e) => ({ ...labelParts(e.label), value: signed(e.flat), source: asSource(e.sourceType) })),
  ];

  const damageSources = new Map(collectModifiers([p], p.basicInfo.id, { damage: { kind: type } }).entries.map((e) => [plainLabel(e.label), asSource(e.sourceType)]));

  const damageLines: SheetLine[] = [
    ...(attack.damageDice ? [{ label: sheetLineKey("weaponDice"), params: { dice: attack.damageDice }, value: avg.weaponAvg.toFixed(1), source: "dice" as const }] : []),
    ...(avg.heroPart ? [{ label: sheetLineKey("levelDice"), params: { dice: avg.heroDice }, value: avg.heroPart.toFixed(1), source: "level" as const }] : []),
    { label: abilityLabel(avg.statKey), value: signed(statMod), source: "ability" },
    ...avg.steps
      .filter((s) => s.kind === "percent" || (s.kind === "flat" && plainLabel(s.label) !== abilityLabel(avg.statKey) && plainLabel(s.label) !== HERO_LEVEL_STEP))
      .map((s) => ({ ...labelParts(s.label), value: s.kind === "percent" ? `${signed(s.value)}%` : signed(s.value), source: damageSources.get(plainLabel(s.label)) ?? ("skill" as const) })),
    ...(avg.multiplier !== 1 ? [{ label: sheetLineKey("dmMultiplier"), value: `×${avg.multiplier}`, source: "multiplier" as const }] : []),
  ];

  return {
    id: attack.id ?? attack.name,
    name: attack.name,
    kind: type,
    toHit: { total: calculateAttackBonus(p, attack), lines: toHitLines },
    avgDamage: { total: avg.total, lines: damageLines },
  };
}
