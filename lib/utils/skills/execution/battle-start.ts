/**
 * Виконання onBattleStart тригерів скілів (ефекти на початку бою)
 */

import {
  evaluateFormulaSimple,
  getEffectTargets,
} from "./helpers";

import { addActiveEffect } from "@/lib/utils/battle/battle-effects";
import type { BattleParticipant } from "@/types/battle";

/**
 * Виконує onBattleStart ефекти з підтримкою цілей (Союзники/Вороги/Усі).
 */
export function executeOnBattleStartEffects(
  participant: BattleParticipant,
  currentRound: number,
  allParticipants?: BattleParticipant[],
): { updatedParticipant: BattleParticipant; messages: string[] } {
  const participants = allParticipants ?? [participant];

  const byId = new Map(participants.map((p) => [p.basicInfo.id, { ...p }]));

  const get = (id: string): BattleParticipant => {
    const p = byId.get(id);

    if (!p) throw new Error(`Participant not found: ${id}`);

    return p;
  };

  const set = (p: BattleParticipant) => byId.set(p.basicInfo.id, p);

  const messages: string[] = [];

  for (const skill of participant.battleData.activeSkills) {
    if (!skill.skillTriggers) continue;

    const trigger = skill.skillTriggers.find(
      (t) => t.type === "simple" && t.trigger === "onBattleStart",
    );

    if (!trigger) continue;

    console.info("[тригер] onBattleStart", {
      skill: skill.name,
      skillId: skill.skillId,
      participant: participant.basicInfo.name,
    });

    for (const effect of skill.effects) {
      const numValue = typeof effect.value === "number" ? effect.value : 0;

      const targets = getEffectTargets(
        participant,
        effect.target,
        Array.from(byId.values()),
      );

      const applyEffect = (
        target: BattleParticipant,
        effectConfig: {
          id: string;
          name: string;
          type: "buff";
          duration: number;
          icon?: string;
          effects: Array<{ type: string; value: number }>;
        },
      ) => {
        const ne = addActiveEffect(target, effectConfig, currentRound);

        set({ ...target, battleData: { ...target.battleData, activeEffects: ne } });
      };

      switch (effect.stat) {
        case "initiative": {
          for (const target of targets) {
            applyEffect(target, {
              id: `skill-${skill.skillId}-battle-start-initiative-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              name: `${skill.name} — ініціатива`,
              type: "buff",
              icon: skill.icon ?? undefined,
              duration: 999,
              effects: [{ type: "initiative_bonus", value: numValue }],
            });
          }

          const targetNames = targets.map((t) => t.basicInfo.name).join(", ");

          messages.push(
            `🏃 ${skill.name}: ${participant.basicInfo.name} → ${targetNames} +${numValue} ініціатива`,
          );
          break;
        }
        case "damage": {
          for (const target of targets) {
            applyEffect(target, {
              id: `skill-${skill.skillId}-battle-start-dmg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              name: `${skill.name} — бонус урону`,
              type: "buff",
              icon: skill.icon ?? undefined,
              duration: 1,
              effects: [{ type: "damage_bonus", value: numValue }],
            });
          }

          const targetNames = targets.map((t) => t.basicInfo.name).join(", ");

          messages.push(
            `⚔️ ${skill.name}: ${participant.basicInfo.name} → ${targetNames} +${effect.value} урону на першу атаку`,
          );
          break;
        }
        case "advantage": {
          for (const target of targets) {
            applyEffect(target, {
              id: `skill-${skill.skillId}-battle-start-adv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              name: `${skill.name} — advantage`,
              type: "buff",
              icon: skill.icon ?? undefined,
              duration: 1,
              effects: [{ type: "advantage_attack", value: 1 }],
            });
          }

          const targetNames = targets.map((t) => t.basicInfo.name).join(", ");

          messages.push(
            `🎲 ${skill.name}: ${participant.basicInfo.name} → ${targetNames} advantage на першу атаку`,
          );
          break;
        }
        default:
          break;
      }
    }
  }

  const updatedParticipant = get(participant.basicInfo.id);

  return { updatedParticipant, messages };
}

/**
 * Застосовує onBattleStart ефекти для всіх учасників з підтримкою цілей.
 */
export function executeOnBattleStartEffectsForAll(
  initiativeOrder: BattleParticipant[],
  currentRound: number,
): { updatedParticipants: BattleParticipant[]; messages: string[] } {
  const byId = new Map(initiativeOrder.map((p) => [p.basicInfo.id, { ...p }]));

  const get = (id: string): BattleParticipant => {
    const p = byId.get(id);

    if (!p) throw new Error(`Participant not found: ${id}`);

    return p;
  };

  const set = (p: BattleParticipant) => byId.set(p.basicInfo.id, p);

  const all = () => initiativeOrder.map((p) => get(p.basicInfo.id));

  const messages: string[] = [];

  const buffStats = [
    "initiative",
    "damage",
    "melee_damage",
    "ranged_damage",
    "all_damage",
    "advantage",
  ];

  for (const participant of initiativeOrder) {
    const current = get(participant.basicInfo.id);

    for (const skill of current.battleData.activeSkills) {
      if (!skill.skillTriggers) continue;

      const trigger = skill.skillTriggers.find(
        (t) => t.type === "simple" && t.trigger === "onBattleStart",
      );

      if (!trigger) continue;

      console.info("[тригер] onBattleStart (ForAll)", {
        skill: skill.name,
        skillId: skill.skillId,
        participant: current.basicInfo.name,
      });

      for (const effect of skill.effects) {
        const numValue = typeof effect.value === "number" ? effect.value : 0;

        const effectiveTarget =
          effect.target ??
          (buffStats.includes(effect.stat) ? "all_allies" : undefined);

        const targets = getEffectTargets(current, effectiveTarget, all());

        const applyEffect = (
          target: BattleParticipant,
          effectConfig: {
            id: string;
            name: string;
            type: "buff";
            duration: number;
            icon?: string;
            effects: Array<{ type: string; value: number }>;
          },
        ) => {
          const ne = addActiveEffect(target, effectConfig, currentRound);

          set({ ...target, battleData: { ...target.battleData, activeEffects: ne } });
        };

        switch (effect.stat) {
          case "initiative":
            for (const target of targets) {
              applyEffect(target, {
                id: `skill-${skill.skillId}-battle-start-initiative-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                name: `${skill.name} — ініціатива`,
                type: "buff",
                icon: skill.icon ?? undefined,
                duration: 999,
                effects: [{ type: "initiative_bonus", value: numValue }],
              });
            }

            if (targets.length > 0) {
              const targetNames = targets
                .map((t) => t.basicInfo.name)
                .join(", ");

              messages.push(
                `🏃 ${skill.name}: ${current.basicInfo.name} → ${targetNames} +${numValue} ініціатива`,
              );
            }

            break;
          case "damage":
            for (const target of targets) {
              applyEffect(target, {
                id: `skill-${skill.skillId}-battle-start-dmg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                name: `${skill.name} — бонус урону`,
                type: "buff",
                icon: skill.icon ?? undefined,
                duration: 1,
                effects: [{ type: "damage_bonus", value: numValue }],
              });
            }

            if (targets.length > 0) {
              const targetNames = targets
                .map((t) => t.basicInfo.name)
                .join(", ");

              messages.push(
                `⚔️ ${skill.name}: ${current.basicInfo.name} → ${targetNames} +${effect.value} урону на першу атаку`,
              );
            }

            break;
          case "advantage":
            for (const target of targets) {
              applyEffect(target, {
                id: `skill-${skill.skillId}-battle-start-adv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                name: `${skill.name} — advantage`,
                type: "buff",
                icon: skill.icon ?? undefined,
                duration: 1,
                effects: [{ type: "advantage_attack", value: 1 }],
              });
            }

            if (targets.length > 0) {
              const targetNames = targets
                .map((t) => t.basicInfo.name)
                .join(", ");

              messages.push(
                `🎲 ${skill.name}: ${current.basicInfo.name} → ${targetNames} advantage на першу атаку`,
              );
            }

            break;
          case "melee_damage":
          case "ranged_damage":
          case "all_damage": {
            const dur = effect.duration ?? 2;

            const effectType =
              effect.stat === "all_damage" ? "all_damage" : effect.stat;

            for (const target of targets) {
              const val =
                effect.type === "formula" && typeof effect.value === "string"
                  ? evaluateFormulaSimple(effect.value, target)
                  : numValue;

              applyEffect(target, {
                id: `skill-${skill.skillId}-battle-start-${effectType}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                name: `${skill.name} — бонус урону`,
                type: "buff",
                duration: dur,
                effects: [{ type: effectType, value: val }],
              });
            }

            if (targets.length > 0) {
              const targetNames = targets
                .map((t) => t.basicInfo.name)
                .join(", ");

              messages.push(
                `⚔️ ${skill.name}: ${current.basicInfo.name} → ${targetNames} +${effectType} (${dur} р.)`,
              );
            }

            break;
          }
          default:
            break;
        }
      }
    }
  }

  const updatedParticipants = initiativeOrder.map((p) => get(p.basicInfo.id));

  return { updatedParticipants, messages };
}

/**
 * Застосовує onBattleStart ефекти (all_allies) від усіх союзників до нових учасників.
 */
export function applyOnBattleStartEffectsToNewAllies(
  initiativeOrder: BattleParticipant[],
  newParticipantIds: Set<string>,
  currentRound: number,
): BattleParticipant[] {
  if (newParticipantIds.size === 0) return initiativeOrder;

  const byId = new Map(initiativeOrder.map((p) => [p.basicInfo.id, { ...p }]));

  const get = (id: string): BattleParticipant => {
    const p = byId.get(id);

    if (!p) throw new Error(`Participant not found: ${id}`);

    return p;
  };

  const set = (p: BattleParticipant) => byId.set(p.basicInfo.id, p);

  const all = () => Array.from(byId.values());

  for (const newId of newParticipantIds) {
    const targetParticipant = get(newId);

    const allies = all().filter(
      (p) =>
        p.basicInfo.side === targetParticipant.basicInfo.side &&
        p.basicInfo.id !== newId,
    );

    for (const ally of allies) {
      for (const skill of ally.battleData.activeSkills) {
        if (
          !skill.skillTriggers?.some(
            (t) => t.type === "simple" && t.trigger === "onBattleStart",
          )
        )
          continue;

        for (const effect of skill.effects) {
          if (effect.target !== "all_allies") continue;

          const numValue = typeof effect.value === "number" ? effect.value : 0;

          const applyEffect = (
            target: BattleParticipant,
            effectConfig: {
              id: string;
              name: string;
              type: "buff";
              duration: number;
              icon?: string;
              effects: Array<{ type: string; value: number }>;
            },
          ) => {
            const ne = addActiveEffect(target, effectConfig, currentRound);

            set({
              ...target,
              battleData: { ...target.battleData, activeEffects: ne },
            });
          };

          switch (effect.stat) {
            case "initiative":
              applyEffect(get(newId), {
                id: `skill-${skill.skillId}-battle-start-initiative-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                name: `${skill.name} — ініціатива`,
                type: "buff",
                icon: skill.icon ?? undefined,
                duration: 999,
                effects: [{ type: "initiative_bonus", value: numValue }],
              });
              break;
            case "damage":
              applyEffect(get(newId), {
                id: `skill-${skill.skillId}-battle-start-dmg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                name: `${skill.name} — бонус урону`,
                type: "buff",
                icon: skill.icon ?? undefined,
                duration: 1,
                effects: [{ type: "damage_bonus", value: numValue }],
              });
              break;
            case "advantage":
              applyEffect(get(newId), {
                id: `skill-${skill.skillId}-battle-start-adv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                name: `${skill.name} — advantage`,
                type: "buff",
                icon: skill.icon ?? undefined,
                duration: 1,
                effects: [{ type: "advantage_attack", value: 1 }],
              });
              break;
            default:
              break;
          }
        }
      }
    }
  }

  return initiativeOrder.map((p) => get(p.basicInfo.id));
}
