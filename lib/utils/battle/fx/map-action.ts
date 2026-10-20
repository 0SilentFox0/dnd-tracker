import { diceThrowsOf } from "./dice/from-action";
import { elementOf } from "./element";
import { spellFx } from "./spells";
import type { FxArchetype, FxElement, FxSpec } from "./types";

import type { BattleAction } from "@/types/battle";

const AREA_TARGETING = new Set(["area", "template", "allEnemies", "allAllies", "everyone"]);

const DAMAGE_KINDS = new Set(["dealDamage", "dot"]);

const HEAL_KINDS = new Set(["heal", "hot"]);

const SUMMON_KINDS = new Set(["summon", "raiseDead"]);

function spellRules(action: BattleAction): { archetype: FxArchetype; element: FxElement } {
  const d = action.actionDetails;

  const kinds = new Set(d.spellEffectKinds ?? []);

  const many = action.targets.length > 1 || AREA_TARGETING.has(d.spellTargeting ?? "");

  if ([...kinds].some((k) => SUMMON_KINDS.has(k))) return { archetype: "summon", element: "radiant" };

  if (kinds.has("berserk")) return { archetype: "debuff", element: "fury" };

  if ((d.totalDamage ?? 0) > 0 || [...kinds].some((k) => DAMAGE_KINDS.has(k))) return { archetype: many ? "area" : "bolt", element: elementOf(d.spellDamageType, "arcane") };

  if ((d.totalHealing ?? 0) > 0 || [...kinds].some((k) => HEAL_KINDS.has(k))) return { archetype: "heal", element: "nature" };

  if ((d.appliedEffects ?? []).some((e) => e.type === "debuff" || e.type === "condition") || kinds.has("applyCondition") || kinds.has("charm")) return { archetype: "debuff", element: "necrotic" };

  return { archetype: "buff", element: "radiant" };
}

function spellArchetype(action: BattleAction): { archetype: FxArchetype; element: FxElement } {
  const computed = spellRules(action);

  const signature = spellFx(action.actionDetails.spellName);

  return { archetype: signature?.archetype ?? computed.archetype, element: signature?.element ?? computed.element };
}

function primary(action: BattleAction): FxSpec | null {
  const d = action.actionDetails;

  const base = { key: `${action.id}:0`, actionId: action.id, actorId: action.actorId, actorSide: action.actorSide, targetIds: action.targets.map((t) => t.participantId), critical: d.isCritical === true };

  if (action.actionType === "attack" || action.actionType === "retaliation") {
    return { ...base, archetype: d.attackKind === "ranged" ? "ranged" : "melee", element: elementOf(d.damageRolls?.[0]?.damageType, "physical"), hit: d.isHit !== false && d.isCriticalFail !== true };
  }

  if (action.actionType === "spell") return { ...base, ...spellArchetype(action), hit: true, ...(d.aimCell && { at: d.aimCell }) };

  return null;
}

export function mapAction(action: BattleAction): FxSpec[] {
  if (action.isCancelled) return [];

  const main = primary(action);

  const dice: FxSpec[] = diceThrowsOf(action).map((spec, i) => ({ key: `${action.id}:dice:${i}`, actionId: action.id, archetype: "dice", element: "arcane", actorId: action.actorId, actorSide: action.actorSide, targetIds: [], hit: true, critical: false, dice: spec }));

  const deaths: FxSpec[] = action.hpChanges
    .filter((h) => h.oldHp > 0 && h.newHp <= 0)
    .map((h) => ({ key: `${action.id}:death:${h.participantId}`, actionId: action.id, archetype: "death", element: "necrotic", actorId: action.actorId, actorSide: action.actorSide, targetIds: [h.participantId], hit: true, critical: false }));

  return [...dice, ...(main ? [main] : []), ...deaths];
}
