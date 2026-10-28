import { ParticipantSourceType } from "@/lib/constants/battle";
import type { Effect } from "@/lib/utils/abilities/schema";
import { armorDexCap } from "@/lib/utils/artifacts/armor-row";
import { wornArmor } from "@/lib/utils/artifacts/worn-armor";
import { signed } from "@/lib/utils/common/format";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";
import type { SheetLine } from "@/types/characters";

export const ARMOR_STRENGTH_SPEED_PENALTY = 10;

const PENALTY_ID = "armor-penalties";

export const isClassModeHero = (p: BattleParticipant): boolean => p.basicInfo.sourceType === ParticipantSourceType.CHARACTER && p.abilities.damageModel === "5e";

export function classArmorBase(p: BattleParticipant): { base: number; lines: SheetLine[] } {
  const dex = p.abilities.modifiers.dexterity;

  const worn = wornArmor(p);

  if (!worn) return { base: 10 + dex, lines: [{ label: "Без броні", value: "10", source: "base" }, { label: "Спритність", value: signed(dex), source: "ability" }] };

  const cap = armorDexCap(worn.stats);

  const dexPart = cap === 0 ? 0 : cap === null ? dex : Math.min(dex, cap);

  return {
    base: worn.stats.base + dexPart,
    lines: [
      { label: worn.artifact.name, value: String(worn.stats.base), source: "artifact" },
      ...(cap === 0 ? [] : [{ label: cap === null ? "Спритність" : `Спритність (межа ${cap})`, value: signed(dexPart), source: "ability" as const }]),
    ],
  };
}

export function armorPenalties(p: BattleParticipant): ResolvedAbility | null {
  const worn = wornArmor(p);

  if (!worn) return null;

  const { strength, stealthDisadvantage } = worn.stats;

  const slowed = !!strength && p.abilities.strength < strength;

  const effects: Effect[] = [];

  if (stealthDisadvantage) effects.push({ kind: "flag", flag: "checkDisadvantage", skills: ["stealth"] });

  if (slowed) effects.push({ kind: "modifyStat", stat: "speed", flat: -ARMOR_STRENGTH_SPEED_PENALTY });

  if (effects.length === 0) return null;

  const { artifactId, name } = worn.artifact;

  const description = [stealthDisadvantage ? "Перешкода на Скритність" : null, slowed ? `Сила нижче ${strength}: швидкість −${ARMOR_STRENGTH_SPEED_PENALTY}` : null].filter(Boolean).join("; ");

  return { id: PENALTY_ID, name, description, trigger: { event: "passive" }, effects, source: { type: "artifact", id: artifactId, name }, key: `artifact:${artifactId}:${PENALTY_ID}` };
}

// запікання вже минуло, тож −10 швидкості пишемо одразу, а вміння лише показує джерело
export function applyClassArmor(p: BattleParticipant): BattleParticipant {
  const penalty = armorPenalties(p);

  const slowed = penalty?.effects.some((e) => e.kind === "modifyStat" && e.stat === "speed") ?? false;

  return {
    ...p,
    combatStats: { ...p.combatStats, armorClass: classArmorBase(p).base, speed: p.combatStats.speed - (slowed ? ARMOR_STRENGTH_SPEED_PENALTY : 0) },
    battleData: { ...p.battleData, resolvedAbilities: penalty ? [...p.battleData.resolvedAbilities, penalty] : p.battleData.resolvedAbilities },
  };
}
