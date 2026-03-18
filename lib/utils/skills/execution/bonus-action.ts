/**
 * Виконання бонусної дії скіла (тригер bonusAction)
 */

import {
  evaluateFormulaSimple,
  getEffectTargets,
} from "./helpers";

import { addActiveEffect } from "@/lib/utils/battle/battle-effects";
import type { ActiveSkill, BattleParticipant } from "@/types/battle";

/**
 * Виконує ефект бонусної дії для конкретного скіла.
 */
export function executeBonusActionSkill(
  participant: BattleParticipant,
  skill: ActiveSkill,
  allParticipants: BattleParticipant[],
  currentRound: number,
  targetParticipantId?: string,
  skillUsageCounts?: Record<string, number>,
): {
  updatedParticipant: BattleParticipant;
  updatedParticipants: BattleParticipant[];
  messages: string[];
} {
  let updatedParticipant = { ...participant };

  let updatedParticipants = [...allParticipants];

  const messages: string[] = [];

  const trigger = skill.skillTriggers?.find(
    (t) => t.type === "simple" && t.trigger === "bonusAction",
  );

  if (!trigger) return { updatedParticipant, updatedParticipants, messages };

  console.info("[тригер] bonusAction", {
    skill: skill.name,
    skillId: skill.skillId,
    participant: participant.basicInfo.name,
  });

  const mods = trigger.modifiers;

  if (
    mods?.oncePerBattle &&
    skillUsageCounts &&
    (skillUsageCounts[skill.skillId] ?? 0) >= 1
  ) {
    messages.push(`${skill.name}: вже використано в цьому бою`);

    return { updatedParticipant, updatedParticipants, messages };
  }

  if (
    mods?.twicePerBattle &&
    skillUsageCounts &&
    (skillUsageCounts[skill.skillId] ?? 0) >= 2
  ) {
    messages.push(`${skill.name}: вже використано двічі в цьому бою`);

    return { updatedParticipant, updatedParticipants, messages };
  }

  if (mods?.probability !== undefined && Math.random() >= mods.probability) {
    messages.push(
      `${skill.name}: не спрацювало (шанс ${Math.round(mods.probability * 100)}%)`,
    );

    return { updatedParticipant, updatedParticipants, messages };
  }

  if (skillUsageCounts) {
    skillUsageCounts[skill.skillId] =
      (skillUsageCounts[skill.skillId] ?? 0) + 1;
  }

  const byId = new Map(
    updatedParticipants.map((p) => [p.basicInfo.id, { ...p }]),
  );

  const get = (id: string): BattleParticipant => {
    const p = byId.get(id);

    if (!p) throw new Error(`Participant not found: ${id}`);

    return p;
  };

  const set = (p: BattleParticipant) => byId.set(p.basicInfo.id, p);

  const all = () => updatedParticipants.map((p) => get(p.basicInfo.id));

  for (const effect of skill.effects) {
    const numValue = typeof effect.value === "number" ? effect.value : 0;

    const targets =
      effect.target === "all_allies" || effect.target === "all_enemies"
        ? getEffectTargets(updatedParticipant, effect.target, all())
        : targetParticipantId
          ? [get(targetParticipantId)].filter(Boolean)
          : [get(updatedParticipant.basicInfo.id)];

    switch (effect.stat) {
      case "redirect_physical_damage": {
        if (targetParticipantId) {
          messages.push(
            `🛡 ${skill.name}: ${participant.basicInfo.name} перенаправляє ${numValue}% фізичного урону на союзника`,
          );
        }

        break;
      }
      case "summon_tier": {
        messages.push(
          `👹 ${skill.name}: ${participant.basicInfo.name} призиває демона tier ${numValue}`,
        );
        break;
      }
      case "marked_targets": {
        messages.push(
          `🎯 ${skill.name}: ${participant.basicInfo.name} позначає ${numValue} цілей`,
        );
        break;
      }
      case "extra_casts": {
        messages.push(
          `✨ ${skill.name}: ${participant.basicInfo.name} отримує ${numValue} додаткових кастів`,
        );

        const p = get(updatedParticipant.basicInfo.id);

        set({ ...p, actionFlags: { ...p.actionFlags, hasUsedAction: false } });
        break;
      }
      case "morale": {
        for (const t of targets) {
          if (!t) continue;

          set({
            ...t,
            combatStats: {
              ...t.combatStats,
              morale: Math.min(3, t.combatStats.morale + numValue),
            },
          });
        }

        const targetNames = targets
          .filter(Boolean)
          .map((t) => (t ? t.basicInfo.name : ""))
          .join(", ");

        messages.push(
          `📢 ${skill.name}: ${participant.basicInfo.name} → ${targetNames} мораль +${numValue}`,
        );
        break;
      }
      case "initiative": {
        for (const t of targets) {
          if (!t) continue;

          const val =
            effect.type === "formula" && typeof effect.value === "string"
              ? evaluateFormulaSimple(effect.value, t)
              : numValue;

          const ne = addActiveEffect(
            t,
            {
              id: `skill-${skill.skillId}-bonus-init-${t.basicInfo.id}`,
              name: `${skill.name} — ініціатива`,
              type: "buff",
              icon: skill.icon ?? undefined,
              duration: effect.duration ?? 999,
              effects: [{ type: "initiative_bonus", value: val }],
            },
            currentRound,
          );

          set({ ...t, battleData: { ...t.battleData, activeEffects: ne } });
        }

        const targetNames = targets
          .filter(Boolean)
          .map((t) => (t ? t.basicInfo.name : ""))
          .join(", ");

        messages.push(
          `🏃 ${skill.name}: ${participant.basicInfo.name} → ${targetNames} +ініціатива`,
        );
        break;
      }
      case "armor": {
        for (const t of targets) {
          if (!t) continue;

          const ne = addActiveEffect(
            t,
            {
              id: `skill-${skill.skillId}-bonus-ac-${t.basicInfo.id}`,
              name: `${skill.name} — AC`,
              type: "buff",
              icon: skill.icon ?? undefined,
              duration: 999,
              effects: [{ type: "armor_bonus", value: numValue }],
            },
            currentRound,
          );

          set({ ...t, battleData: { ...t.battleData, activeEffects: ne } });
        }

        const targetNames = targets
          .filter(Boolean)
          .map((t) => (t ? t.basicInfo.name : ""))
          .join(", ");

        messages.push(
          `🛡 ${skill.name}: ${participant.basicInfo.name} → ${targetNames} +${numValue} AC`,
        );
        break;
      }
      case "advantage": {
        for (const t of targets) {
          if (!t) continue;

          const ne = addActiveEffect(
            t,
            {
              id: `skill-${skill.skillId}-bonus-adv-${t.basicInfo.id}`,
              name: `${skill.name} — advantage`,
              type: "buff",
              icon: skill.icon ?? undefined,
              duration: 1,
              effects: [{ type: "advantage_attack", value: 1 }],
            },
            currentRound,
          );

          set({ ...t, battleData: { ...t.battleData, activeEffects: ne } });
        }

        const targetNames = targets
          .filter(Boolean)
          .map((t) => (t ? t.basicInfo.name : ""))
          .join(", ");

        messages.push(
          `🎲 ${skill.name}: ${participant.basicInfo.name} → ${targetNames} advantage на першу атаку`,
        );
        break;
      }
      case "damage":
      case "melee_damage":
      case "ranged_damage":
      case "all_damage": {
        const dmgDuration = effect.duration ?? 1;

        const effectType =
          effect.stat === "melee_damage" ||
          effect.stat === "ranged_damage" ||
          effect.stat === "all_damage"
            ? effect.stat
            : effect.stat === "damage"
              ? "all_damage"
              : "damage_bonus";

        for (const t of targets) {
          if (!t) continue;

          const val =
            effect.type === "formula" && typeof effect.value === "string"
              ? evaluateFormulaSimple(effect.value, t)
              : numValue;

          const ne = addActiveEffect(
            t,
            {
              id: `skill-${skill.skillId}-bonus-dmg-${t.basicInfo.id}`,
              name: `${skill.name} — бонус урону`,
              type: "buff",
              duration: dmgDuration,
              effects: [{ type: effectType, value: val }],
            },
            currentRound,
          );

          set({ ...t, battleData: { ...t.battleData, activeEffects: ne } });
        }

        const targetNames = targets
          .filter(Boolean)
          .map((t) => (t ? t.basicInfo.name : ""))
          .join(", ");

        messages.push(
          `⚔️ ${skill.name}: ${participant.basicInfo.name} → ${targetNames} бонус урону (${dmgDuration} р.)`,
        );
        break;
      }
      case "restore_spell_slot": {
        const p = get(updatedParticipant.basicInfo.id);

        for (const lvl of ["1", "2", "3", "4", "5"]) {
          const slot = p.spellcasting.spellSlots[lvl];

          if (slot && slot.current < slot.max) {
            slot.current = Math.min(slot.max, slot.current + numValue);
            set(p);
            messages.push(
              `🔮 ${skill.name}: відновлено ${numValue} слот рівня ${lvl}`,
            );
            break;
          }
        }
        break;
      }
      case "field_damage": {
        const dmgValue =
          typeof effect.value === "string"
            ? evaluateFormulaSimple(effect.value, participant)
            : numValue;

        const duration = 3;

        const enemies = allParticipants.filter(
          (p) =>
            p.basicInfo.side !== participant.basicInfo.side &&
            p.combatStats.status === "active",
        );

        updatedParticipants = updatedParticipants.map((p) => {
          if (enemies.some((e) => e.basicInfo.id === p.basicInfo.id)) {
            const ne = addActiveEffect(
              p,
              {
                id: `skill-${skill.skillId}-field-dmg-${p.basicInfo.id}`,
                name: `${skill.name} — поле бою`,
                type: "debuff",
                duration,
                effects: [],
                dotDamage: { damagePerRound: dmgValue, damageType: "fire" },
              },
              currentRound,
            );

            return { ...p, battleData: { ...p.battleData, activeEffects: ne } };
          }

          return p;
        });
        updatedParticipants.forEach((p) => set(p));
        messages.push(
          `🔥 ${skill.name}: поле бою — ${dmgValue} урону/раунд на ${duration} раундів`,
        );
        break;
      }
      case "revive_hp": {
        if (targetParticipantId) {
          updatedParticipants = updatedParticipants.map((p) => {
            if (
              p.basicInfo.id === targetParticipantId &&
              p.combatStats.status === "dead"
            ) {
              const reviveHp = effect.isPercentage
                ? Math.floor(p.combatStats.maxHp * (numValue / 100))
                : numValue;

              return {
                ...p,
                combatStats: {
                  ...p.combatStats,
                  currentHp: reviveHp,
                  status: "active" as const,
                },
              };
            }

            return p;
          });
          messages.push(
            `✝️ ${skill.name}: союзник воскрешений з ${numValue}${effect.isPercentage ? "%" : ""} HP`,
          );
          updatedParticipants.forEach((p) => set(p));
        }

        break;
      }
      case "morale_restore": {
        const enemies = allParticipants.filter(
          (p) =>
            p.basicInfo.side !== participant.basicInfo.side &&
            p.combatStats.status === "active",
        );

        updatedParticipants = updatedParticipants.map((p) => {
          if (enemies.some((e) => e.basicInfo.id === p.basicInfo.id)) {
            return {
              ...p,
              combatStats: {
                ...p.combatStats,
                morale: Math.max(-3, p.combatStats.morale + numValue),
              },
            };
          }

          return p;
        });
        updatedParticipants.forEach((p) => set(p));
        messages.push(`😱 ${skill.name}: мораль ворогів ${numValue}`);
        break;
      }
      case "clear_negative_effects": {
        if (targetParticipantId) {
          updatedParticipants = updatedParticipants.map((p) => {
            if (p.basicInfo.id === targetParticipantId) {
              return {
                ...p,
                battleData: {
                  ...p.battleData,
                  activeEffects: p.battleData.activeEffects.filter(
                    (e) => e.type !== "debuff",
                  ),
                },
              };
            }

            return p;
          });
          updatedParticipants.forEach((p) => set(p));
          messages.push(`✨ ${skill.name}: знято дебафи з союзника`);
        }

        break;
      }
      default:
        messages.push(`${skill.name}: ${effect.stat} ${effect.value}`);
        break;
    }
  }

  updatedParticipants = all();
  updatedParticipant = get(participant.basicInfo.id);
  updatedParticipant = {
    ...updatedParticipant,
    actionFlags: {
      ...updatedParticipant.actionFlags,
      hasUsedBonusAction: true,
    },
  };
  set(updatedParticipant);

  return {
    updatedParticipant,
    updatedParticipants: all(),
    messages,
  };
}
