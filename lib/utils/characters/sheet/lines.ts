import { ABILITY_KEYS, ABILITY_LABELS } from "@/lib/constants/abilities";
import { bakedStatSources } from "@/lib/utils/abilities/build/bake";
import { collectModifiers, statWithModifiers } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { calculateAttackBonus } from "@/lib/utils/battle/attack";
import { attackDamageModifier, attackRollModifier } from "@/lib/utils/battle/attack/ability";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { averageAttackDamage } from "@/lib/utils/battle/damage/average";
import { classArmorBase, isClassModeHero } from "@/lib/utils/characters/classes/armor-class";
import { sheetLineKey } from "@/lib/utils/characters/sheet/line-key";
import { getAbilityModifier } from "@/lib/utils/common/calculations";
import { signed } from "@/lib/utils/common/format";
import type { BattleAttack, BattleParticipant } from "@/types/battle";
import type { AbilityKey, SheetAttack, SheetLine, SheetLineSource, SheetTotal } from "@/types/characters";

export const abilityLabel = (key: AbilityKey) => ABILITY_LABELS[key];

const abilityKeyOf = (label: string) => ABILITY_KEYS.find((k) => ABILITY_LABELS[k] === label);

const statLabelKey = (label: string) => {
  const key = abilityKeyOf(label);

  return key ? `common.abilities.${key}.label` : label;
};

// the battle damage engine names this step in Ukrainian
// eslint-disable-next-line no-restricted-syntax -- data convention
const HERO_LEVEL_STEP = "Рівень героя";

const asSource = (t: string): SheetLineSource => t as SheetLineSource;

export function abilityLines(p: BattleParticipant, key: AbilityKey, base: number): SheetLine[] {
  return [{ label: sheetLineKey("base"), value: String(base), source: "base" }, ...bakedStatSources(p, key).map((s) => ({ label: s.label, value: signed(s.value), source: asSource(s.sourceType) }))];
}

export function armorTotal(p: BattleParticipant): SheetTotal {
  const mods = collectModifiers([p], p.basicInfo.id, { stat: "armor" });

  const base: SheetLine[] = isClassModeHero(p) ? classArmorBase(p).lines : [{ label: sheetLineKey("base"), value: String(p.combatStats.armorClass), source: "base" }];

  return {
    total: statWithModifiers([p], p.basicInfo.id, "armor", p.combatStats.armorClass),
    lines: [
      ...base,
      ...mods.entries.flatMap((e) => [
        ...(e.flat ? [{ label: e.label, value: signed(e.flat), source: asSource(e.sourceType) }] : []),
        ...(e.percent ? [{ label: e.label, value: `${signed(e.percent)}%`, source: asSource(e.sourceType) }] : []),
      ]),
    ],
  };
}

export function attackSheet(p: BattleParticipant, attack: BattleAttack): SheetAttack {
  const type = attackKindOf(attack.type);

  const statMod = attackDamageModifier(p, attack);

  const hitMod = attackRollModifier(p, attack);

  const avg = averageAttackDamage(p, attack, [p]);

  const star = p.abilities.primaryAbility ? " ★" : undefined;

  const hitMods = collectModifiers([p], p.basicInfo.id, { stat: "attackBonus", attackKind: type });

  const toHitLines: SheetLine[] = [
    { label: statLabelKey(avg.statLabel), suffix: star, value: signed(hitMod), source: "ability" },
    { label: sheetLineKey("proficiency"), value: signed(p.abilities.proficiencyBonus), source: "proficiency" },
    ...(attack.attackBonus ? [{ label: sheetLineKey("weapon"), value: signed(attack.attackBonus), source: "weapon" as const }] : []),
    ...hitMods.entries.filter((e) => e.flat).map((e) => ({ label: e.label, value: signed(e.flat), source: asSource(e.sourceType) })),
  ];

  const damageSources = new Map(collectModifiers([p], p.basicInfo.id, { damage: { kind: type } }).entries.map((e) => [e.label, asSource(e.sourceType)]));

  const damageLines: SheetLine[] = [
    ...(attack.damageDice ? [{ label: sheetLineKey("weaponDice"), params: { dice: attack.damageDice }, value: avg.weaponAvg.toFixed(1), source: "dice" as const }] : []),
    ...(avg.heroPart ? [{ label: sheetLineKey("levelDice"), params: { dice: avg.heroDice }, value: avg.heroPart.toFixed(1), source: "level" as const }] : []),
    { label: statLabelKey(avg.statLabel), value: signed(statMod), source: "ability" },
    ...avg.steps
      .filter((s) => s.kind === "percent" || (s.kind === "flat" && s.label !== avg.statLabel && s.label !== HERO_LEVEL_STEP))
      .map((s) => ({ label: s.label, value: s.kind === "percent" ? `${signed(s.value)}%` : signed(s.value), source: damageSources.get(s.label) ?? ("skill" as const) })),
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

export const checkBonus = (score: number, proficient: boolean, prof: number) => getAbilityModifier(score) + (proficient ? prof : 0);
