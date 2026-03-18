/**
 * Виконання onKill тригерів скілів (ефекти після вбивства)
 */

import type { BattleParticipant } from "@/types/battle";

/**
 * Виконує onKill ефекти після вбивства (наприклад «Додаткова дія»).
 * Ефект actions накопичувальний: value — кількість додаткових дій за спрацювання.
 */
export function executeOnKillEffects(
  killer: BattleParticipant,
  skillUsageCounts?: Record<string, number>,
): { updatedKiller: BattleParticipant; messages: string[] } {
  let updatedKiller = { ...killer };

  const messages: string[] = [];

  for (const skill of killer.battleData.activeSkills) {
    if (!skill.skillTriggers) continue;

    const trigger = skill.skillTriggers.find(
      (t) => t.type === "simple" && t.trigger === "onKill",
    );

    if (!trigger) continue;

    console.info("[тригер] onKill", {
      skill: skill.name,
      skillId: skill.skillId,
      killer: killer.basicInfo.name,
    });

    if (
      trigger.modifiers?.oncePerBattle &&
      skillUsageCounts &&
      (skillUsageCounts[skill.skillId] ?? 0) >= 1
    )
      continue;

    if (
      trigger.modifiers?.probability !== undefined &&
      Math.random() >= trigger.modifiers.probability
    )
      continue;

    if (skillUsageCounts) {
      skillUsageCounts[skill.skillId] =
        (skillUsageCounts[skill.skillId] ?? 0) + 1;
    }

    for (const effect of skill.effects) {
      if (effect.stat === "actions" && typeof effect.value === "number") {
        const addActions = Math.max(0, Math.floor(effect.value));

        if (addActions <= 0) continue;

        const prev = updatedKiller.battleData.pendingExtraActions ?? 0;

        updatedKiller = {
          ...updatedKiller,
          battleData: {
            ...updatedKiller.battleData,
            pendingExtraActions: prev + addActions,
          },
          actionFlags: { ...updatedKiller.actionFlags, hasUsedAction: false },
        };
        messages.push(
          `⚔️ ${skill.name}: ${killer.basicInfo.name} отримує +${addActions} додаткових дій!`,
        );
      }
    }
  }

  return { updatedKiller, messages };
}
