/**
 * Форматування, конвертація spell→BattleSpell та статистика учасників для run-spells-testing
 */

import { calculateInitiative } from "@/lib/utils/battle/battle-start";
import { getEffectiveArmorClass } from "@/lib/utils/battle/participant";
import type { BattleSpell } from "@/lib/utils/battle/spell";
import {
  parseAssertionsToEffectDetails,
  type SpellTestCase,
} from "@/lib/utils/spells/spells-testing-parser";
import type { BattleParticipant } from "@/types/battle";

export const ABILITY_LABELS: Record<string, string> = {
  strength: "Сила",
  dexterity: "Спритність",
  constitution: "Витримка",
  intelligence: "Інтелект",
  wisdom: "Мудрість",
  charisma: "Харизма",
};

export function expandAbbreviations(text: string): string {
  return text
    .replace(/\bTE\b/gi, "ціль-ворог (target enemy)")
    .replace(/\bTA\b/gi, "ціль-союзник (target ally)")
    .replace(/\bD(\d+)\b/g, "дебаф на $1 раунд(ів)")
    .replace(/\bB(\d+)\b/g, "баф на $1 раунд(ів)")
    .replace(/\bAoE\b/gi, "область (can be applied to many units)")
    .replace(/\bTargeted\b/gi, "цільований (1 ціль)")
    .replace(/No Target/gi, "без цілі")
    .replace(/\bST\b(?!\s*-\s*no)/gi, "кидок рятунку (Saving Throw)")
    .replace(/\bHT\b(?!\s*NO)/gi, "перевірка попадання (Hit Check)");
}

export function buildDescriptionFromTestCase(tc: SpellTestCase): string {
  const lines: string[] = [];

  if (tc.assertions.length > 0) {
    lines.push("Ефекти:");
    for (const a of tc.assertions) {
      lines.push(`• ${expandAbbreviations(a.trim())}`);
    }
  }

  if (tc.savingThrow !== "no") {
    const ab = ABILITY_LABELS[tc.savingThrow.ability] ?? tc.savingThrow.ability;

    lines.push(
      `Перевірка: кидок рятунку (${ab}) >= ${tc.savingThrow.dc} для зменшення або уникнення ефекту.`,
    );
  }

  if (tc.hitCheck !== "no") {
    const ab = ABILITY_LABELS[tc.hitCheck.ability] ?? tc.hitCheck.ability;

    lines.push(
      `Перевірка попадання: ${ab} + кидок d20 >= ${tc.hitCheck.dc} для застосування заклинання.`,
    );
  }

  return lines.join("\n\n") || "";
}

export function formatEffect(e: {
  type: string;
  value: number;
  isPercentage?: boolean;
}): string {
  const pct = e.isPercentage ? "%" : "";

  return `${e.type}=${e.value > 0 ? "+" : ""}${e.value}${pct}`;
}

export function formatTestCase(tc: SpellTestCase): string {
  const parts: string[] = [];

  if (tc.assertions.length > 0) {
    parts.push(tc.assertions.slice(0, 3).join("; "));

    if (tc.assertions.length > 3) parts.push("…");
  }

  if (tc.savingThrow !== "no") {
    parts.push(`ST ${tc.savingThrow.ability.toUpperCase()}>=${tc.savingThrow.dc}`);
  }

  if (tc.hitCheck !== "no") {
    parts.push(`HT ${tc.hitCheck.ability.toUpperCase()}>=${tc.hitCheck.dc}`);
  }

  return parts.join(" | ") || "—";
}

export const spellRowFields = {
  id: true,
  name: true,
  level: true,
  type: true,
  target: true,
  damageType: true,
  savingThrow: true,
  hitCheck: true,
  duration: true,
  diceCount: true,
  diceType: true,
  damageElement: true,
  damageModifier: true,
  healModifier: true,
  castingTime: true,
  description: true,
  effectDetails: true,
} as const;

export type SpellRowSelect = {
  id: string;
  name: string;
  level: number;
  type: string;
  target: string | null;
  damageType: string;
  savingThrow: unknown;
  hitCheck: unknown;
  duration: string | null;
  diceCount: number | null;
  diceType: string | null;
  damageElement: string | null;
  damageModifier: string | null;
  healModifier: string | null;
  castingTime: string | null;
  description: string | null;
  effectDetails: unknown;
};

export function spellToBattleSpell(
  row: SpellRowSelect,
  overrides: {
    savingThrow?: SpellTestCase["savingThrow"];
    hitCheck?: SpellTestCase["hitCheck"];
    effectDetails?: BattleSpell["effectDetails"];
  },
): BattleSpell {
  const st =
    overrides.savingThrow !== undefined
      ? overrides.savingThrow === "no"
        ? null
        : overrides.savingThrow
          ? {
              ability: overrides.savingThrow.ability,
              onSuccess: "half" as const,
              dc: overrides.savingThrow.dc,
            }
          : null
      : ((row.savingThrow as BattleSpell["savingThrow"]) ?? null);

  const ht =
    overrides.hitCheck !== undefined
      ? overrides.hitCheck === "no"
        ? null
        : overrides.hitCheck
      : ((row.hitCheck as BattleSpell["hitCheck"]) ?? undefined);

  const effectDetails =
    overrides.effectDetails !== undefined
      ? overrides.effectDetails
      : ((row.effectDetails as BattleSpell["effectDetails"]) ?? undefined);

  return {
    id: row.id,
    name: row.name,
    level: row.level,
    type: (row.type || "target") as "target" | "aoe" | "no_target",
    target: (row.target as "enemies" | "allies" | "all") || undefined,
    damageType: (row.damageType || "damage") as "damage" | "heal" | "all",
    damageElement: row.damageElement,
    damageModifier: row.damageModifier,
    healModifier: row.healModifier,
    diceCount: row.diceCount,
    diceType: row.diceType,
    savingThrow: st,
    hitCheck: ht ?? undefined,
    description: row.description ?? "",
    duration: row.duration,
    castingTime: row.castingTime,
    effectDetails: effectDetails ?? undefined,
  };
}

export interface ParticipantFullStats {
  hp: number;
  maxHp: number;
  speed: number;
  initiative: number;
  ac: number;
  bonusAction: boolean;
  morale: number;
  buffs: string[];
  debuffs: string[];
  effects: string[];
}

export interface TargetStats {
  participantId: string;
  name: string;
  before: ParticipantFullStats;
  after: ParticipantFullStats;
  hpChange: number;
  effectsRemoved?: string[];
}

export interface RunResult {
  spellId: string;
  name: string;
  passed: boolean;
  reason?: string;
  expectedEffects?: ReturnType<typeof parseAssertionsToEffectDetails>["effects"];
  expectedDuration?: number;
  appliedEffects?: Array<{
    type: string;
    value: number;
    isPercentage?: boolean;
  }>;
  appliedDuration?: number;
  targetStats?: TargetStats[];
}

function getEffectiveSpeed(p: BattleParticipant): number {
  const speed = p.combatStats.speed;

  let percentMod = 0;

  for (const ae of p.battleData?.activeEffects ?? []) {
    for (const d of ae.effects ?? []) {
      if (d.type === "speed" && typeof d.value === "number" && d.isPercentage) {
        percentMod += d.value;
      }
    }
  }

  return Math.max(0, Math.floor(speed * (1 + percentMod / 100)));
}

function getEffectiveMorale(p: BattleParticipant): number {
  let morale = p.combatStats.morale ?? 0;

  for (const ae of p.battleData?.activeEffects ?? []) {
    for (const d of ae.effects ?? []) {
      if (d.type === "morale" && typeof d.value === "number") {
        morale += d.value;
      }
    }
  }

  return morale;
}

export function getParticipantStats(p: BattleParticipant): ParticipantFullStats {
  const buffs: string[] = [];

  const debuffs: string[] = [];

  const effects: string[] = [];

  for (const e of p.battleData?.activeEffects ?? []) {
    const label = e.name;

    if (e.type === "buff") buffs.push(label);
    else debuffs.push(label);

    effects.push(`${label}(${e.type},D${e.duration ?? 0})`);
  }

  return {
    hp: p.combatStats.currentHp,
    maxHp: p.combatStats.maxHp,
    speed: getEffectiveSpeed(p),
    initiative: calculateInitiative(p),
    ac: getEffectiveArmorClass(p),
    bonusAction: !p.actionFlags.hasUsedBonusAction,
    morale: getEffectiveMorale(p),
    buffs,
    debuffs,
    effects,
  };
}
