/**
 * Виконання onHit тригерів скілів (ефекти при влучанні атакою)
 */

import {
  applyInitiativeOnHit,
  applyMeleeRangedDamageOnHit,
} from "./on-hit-apply-buff";
import {
  applyArmorOnHit,
  applyArmorReductionOnHit,
  applySpeedOnHit,
} from "./on-hit-apply-debuff";
import { applyDotOnHit } from "./on-hit-apply-dot";
import {
  applyBloodSacrificeHealOnHit,
  applyRunicAttackOnHit,
} from "./on-hit-apply-runic-heal";
import type { OnHitContext } from "./on-hit-context";

import type { BattleParticipant } from "@/types/battle";

/**
 * Виконує onHit ефекти (скіли з тригером "onHit") після влучання атакою.
 */
export function executeOnHitEffects(
  attacker: BattleParticipant,
  target: BattleParticipant,
  currentRound: number,
  skillUsageCounts?: Record<string, number>,
  physicalDamageDealt?: number,
  allParticipants?: BattleParticipant[],
  currentAttackId?: string,
  currentAttackName?: string,
): {
  updatedTarget: BattleParticipant;
  updatedAttacker: BattleParticipant;
  updatedParticipants?: BattleParticipant[];
  messages: string[];
} {
  const participants = allParticipants
    ? allParticipants.map((p) => {
        if (p.basicInfo.id === attacker.basicInfo.id) return attacker;

        if (p.basicInfo.id === target.basicInfo.id) return target;

        return p;
      })
    : [attacker, target];

  const byId = new Map(participants.map((p) => [p.basicInfo.id, { ...p }]));

  const get = (id: string): BattleParticipant => {
    const p = byId.get(id);

    if (!p) throw new Error(`Participant ${id} not in map`);

    return p;
  };

  const set = (p: BattleParticipant) => byId.set(p.basicInfo.id, p);

  let updatedTarget = get(target.basicInfo.id);

  let updatedAttacker = get(attacker.basicInfo.id);

  const messages: string[] = [];

  if (
    !attacker.battleData.activeSkills ||
    attacker.battleData.activeSkills.length === 0
  ) {
    set(updatedTarget);
    set(updatedAttacker);

    const updatedParticipants = participants.map((p) => get(p.basicInfo.id));

    return {
      updatedTarget: get(target.basicInfo.id),
      updatedAttacker: get(attacker.basicInfo.id),
      updatedParticipants,
      messages,
    };
  }

  for (const skill of attacker.battleData.activeSkills) {
    if (!skill.skillTriggers || skill.skillTriggers.length === 0) continue;

    const onHitTrigger = skill.skillTriggers.find(
      (t) => t.type === "simple" && t.trigger === "onHit",
    );

    if (!onHitTrigger) continue;

    const mods = onHitTrigger.modifiers;

    if (
      mods?.oncePerBattle &&
      skillUsageCounts &&
      (skillUsageCounts[skill.skillId] ?? 0) >= 1
    )
      continue;

    if (
      mods?.twicePerBattle &&
      skillUsageCounts &&
      (skillUsageCounts[skill.skillId] ?? 0) >= 2
    )
      continue;

    if (mods?.probability !== undefined && Math.random() >= mods.probability)
      continue;

    if (
      mods?.attackId != null &&
      mods.attackId !== "" &&
      currentAttackId !== mods.attackId &&
      currentAttackName !== mods.attackId
    )
      continue;

    if (skillUsageCounts) {
      skillUsageCounts[skill.skillId] =
        (skillUsageCounts[skill.skillId] ?? 0) + 1;
    }

    console.info("[тригер] onHit", {
      skill: skill.name,
      skillId: skill.skillId,
      attacker: attacker.basicInfo.name,
    });

    const ctx: OnHitContext = {
      updatedTarget,
      updatedAttacker,
      set,
      get,
      skill,
      currentRound,
      target,
      attacker,
      allParticipants,
      byId,
      messages,
      physicalDamageDealt,
      currentAttackId,
      currentAttackName,
    };

    for (const effect of skill.effects) {
      switch (effect.stat) {
        case "bleed_damage":
        case "poison_damage":
        case "burn_damage":
        case "fire_damage":
          applyDotOnHit(ctx, effect);
          break;
        case "initiative":
          applyInitiativeOnHit(ctx, effect);
          break;
        case "melee_damage":
        case "ranged_damage":
          applyMeleeRangedDamageOnHit(ctx, effect);
          break;
        case "armor":
          applyArmorOnHit(ctx, effect);
          break;
        case "speed":
          applySpeedOnHit(ctx, effect);
          break;
        case "armor_reduction":
          applyArmorReductionOnHit(ctx, effect);
          break;
        case "runic_attack":
          applyRunicAttackOnHit(ctx);
          break;
        case "blood_sacrifice_heal":
          applyBloodSacrificeHealOnHit(ctx, effect);
          break;
        case "damage_resistance":
          if (effect.type === "ignore") messages.push(`⚔️ ${skill.name}: ігнорує резист`);

          break;
        case "damage":
          if (effect.type === "stack") messages.push(`💥 ${skill.name}: ×${effect.value} урону`);

          break;
        case "guaranteed_hit":
          messages.push(`🎯 ${skill.name}: автовлучання`);
          break;
        case "area_damage":
          messages.push(
            `💨 ${skill.name}: area ${effect.value}${effect.isPercentage ? "%" : ""}`,
          );
          break;
        case "area_cells":
          messages.push(`📐 ${skill.name}: зона ${effect.value} клітинок`);
          break;
        default:
          break;
      }

      updatedTarget = ctx.get(target.basicInfo.id);
      updatedAttacker = ctx.get(attacker.basicInfo.id);
      ctx.updatedTarget = updatedTarget;
      ctx.updatedAttacker = updatedAttacker;
    }
  }

  const updatedParticipants = participants.map((p) => get(p.basicInfo.id));

  return {
    updatedTarget: get(target.basicInfo.id),
    updatedAttacker: get(attacker.basicInfo.id),
    updatedParticipants,
    messages,
  };
}
