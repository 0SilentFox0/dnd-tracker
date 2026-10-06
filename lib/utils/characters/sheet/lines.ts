import { CORE_ABILITY_SCORES } from "@/lib/constants/abilities";
import { AttackType } from "@/lib/constants/battle";
import { bakedStatSources } from "@/lib/utils/abilities/build/bake";
import { collectModifiers, statWithModifiers } from "@/lib/utils/abilities/engine/collect-modifiers";
import { calculateAttackBonus } from "@/lib/utils/battle/attack";
import { averageAttackDamage } from "@/lib/utils/battle/damage/average";
import { getAbilityModifier, getAttackAbilityModifier } from "@/lib/utils/common/calculations";
import { signed } from "@/lib/utils/format";
import type { BattleAttack, BattleParticipant } from "@/types/battle";
import type { AbilityKey, SheetAttack, SheetLine, SheetLineSource, SheetTotal } from "@/types/characters";

export const abilityLabel = (key: AbilityKey) => CORE_ABILITY_SCORES.find((a) => a.key === key)?.label ?? key;


const asSource = (t: string): SheetLineSource => t as SheetLineSource;

export function abilityLines(p: BattleParticipant, key: AbilityKey, base: number): SheetLine[] {
  return [{ label: "База", value: String(base), source: "base" }, ...bakedStatSources(p, key).map((s) => ({ label: s.label, value: signed(s.value), source: asSource(s.sourceType) }))];
}

export function armorTotal(p: BattleParticipant): SheetTotal {
  const mods = collectModifiers([p], p.basicInfo.id, { stat: "armor" });

  return {
    total: statWithModifiers([p], p.basicInfo.id, "armor", p.combatStats.armorClass),
    lines: [
      { label: "База", value: String(p.combatStats.armorClass), source: "base" },
      ...mods.entries.flatMap((e) => [
        ...(e.flat ? [{ label: e.label, value: signed(e.flat), source: asSource(e.sourceType) }] : []),
        ...(e.percent ? [{ label: e.label, value: `${signed(e.percent)}%`, source: asSource(e.sourceType) }] : []),
      ]),
    ],
  };
}

export function attackSheet(p: BattleParticipant, attack: BattleAttack): SheetAttack {
  const type = attack.type === AttackType.RANGED ? AttackType.RANGED : AttackType.MELEE;

  const statMod = getAttackAbilityModifier(p.abilities, type);

  const avg = averageAttackDamage(p, attack, [p]);

  const star = p.abilities.primaryAbility ? " ★" : "";

  const hitMods = collectModifiers([p], p.basicInfo.id, { stat: "attackBonus", attackKind: type === AttackType.RANGED ? "ranged" : "melee" });

  const toHitLines: SheetLine[] = [
    { label: `${avg.statLabel}${star}`, value: signed(statMod), source: "ability" },
    { label: "Майстерність", value: signed(p.abilities.proficiencyBonus), source: "proficiency" },
    ...(attack.attackBonus ? [{ label: "Зброя", value: signed(attack.attackBonus), source: "weapon" as const }] : []),
    ...hitMods.entries.filter((e) => e.flat).map((e) => ({ label: e.label, value: signed(e.flat), source: asSource(e.sourceType) })),
  ];

  const damageSources = new Map(collectModifiers([p], p.basicInfo.id, { damage: { kind: type === AttackType.RANGED ? "ranged" : "melee" } }).entries.map((e) => [e.label, asSource(e.sourceType)]));

  const damageLines: SheetLine[] = [
    ...(attack.damageDice ? [{ label: `Зброя ${attack.damageDice}`, value: avg.weaponAvg.toFixed(1), source: "dice" as const }] : []),
    ...(avg.heroPart ? [{ label: `Рівень + ${avg.heroDice}`, value: avg.heroPart.toFixed(1), source: "level" as const }] : []),
    { label: avg.statLabel, value: signed(statMod), source: "ability" },
    ...avg.steps
      .filter((s) => s.kind === "percent" || (s.kind === "flat" && s.label !== avg.statLabel && s.label !== "Рівень героя"))
      .map((s) => ({ label: s.label, value: s.kind === "percent" ? `${signed(s.value)}%` : signed(s.value), source: damageSources.get(s.label) ?? ("skill" as const) })),
    ...(avg.multiplier !== 1 ? [{ label: "Коеф. ДМа", value: `×${avg.multiplier}`, source: "multiplier" as const }] : []),
  ];

  return {
    id: attack.id ?? attack.name,
    name: attack.name,
    kind: type === AttackType.RANGED ? "ranged" : "melee",
    toHit: { total: calculateAttackBonus(p, attack), lines: toHitLines },
    avgDamage: { total: avg.total, lines: damageLines },
  };
}

export const checkBonus = (score: number, proficient: boolean, prof: number) => getAbilityModifier(score) + (proficient ? prof : 0);
