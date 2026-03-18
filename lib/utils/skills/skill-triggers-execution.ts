/**
 * Утиліти для виконання ефектів скілів з тригерів
 */

import { evaluateSkillTrigger, getSkillsByTrigger } from "./skill-triggers";

import { addActiveEffect } from "@/lib/utils/battle/battle-effects";
import { evaluateFormula } from "@/lib/utils/battle/formula-evaluator";
import type { SkillTriggerContext } from "@/lib/utils/battle/trigger-context";
import type { BattleParticipant } from "@/types/battle";
import type { ActiveSkill } from "@/types/battle";
import type { SimpleSkillTrigger } from "@/types/skill-triggers";

/**
 * Парсить dice-нотацію (наприклад "1d4", "2d6") і повертає середнє значення
 */
function parseDiceAverage(dice: string): number {
  const match = dice.match(/^(\d+)d(\d+)$/);

  if (!match) return 0;

  const count = parseInt(match[1], 10);

  const sides = parseInt(match[2], 10);

  return Math.ceil((count * (sides + 1)) / 2);
}

/**
 * Результат виконання тригера скіла
 */
export interface SkillTriggerExecutionResult {
  participant: BattleParticipant;
  executedSkills: Array<{
    skillId: string;
    skillName: string;
    effects: string[];
  }>;
  messages: string[];
}

/**
 * Виконує ефекти скіла
 */
function executeSkillEffects(
  skill: ActiveSkill,
  participant: BattleParticipant,
  allParticipants: BattleParticipant[],
  currentRound: number,
): {
  updatedParticipant: BattleParticipant;
  effects: string[];
  messages: string[];
} {
  let updatedParticipant = { ...participant };

  const effects: string[] = [];

  const messages: string[] = [];

  // Застосовуємо ефекти зі скіла
  for (const effect of skill.effects) {
    const numValue = typeof effect.value === "number" ? effect.value : 0;

    // Різні типи ефектів обробляються по-різному (за stat)
    switch (effect.stat) {
      // --- Пасивні % бонуси до урону — застосовуються при розрахунку урону, тут лише логуємо ---
      case "melee_damage":
      case "ranged_damage":
      case "counter_damage":
      case "physical_damage":
      case "dark_spell_damage":
      case "chaos_spell_damage":
      case "spell_damage":
        effects.push(
          `${effect.stat}: +${effect.value}${effect.isPercentage ? "%" : ""}`,
        );
        break;

      // --- Пасивні резисти — також логуємо, застосовуються в damage calc ---
      case "physical_resistance":
      case "spell_resistance":
      case "all_resistance":
        effects.push(`${effect.stat}: ${effect.value}%`);
        break;

      // --- Бонуси до характеристик — додаємо як activeEffect ---
      case "hp_bonus":
      case "armor":
      case "speed":
      case "initiative":
      case "morale": {
        const effectName = `${skill.name} — ${effect.stat}`;

        const dur = effect.duration ?? 1;

        const newEffects = addActiveEffect(
          updatedParticipant,
          {
            id: `skill-${skill.skillId}-${effect.stat}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            name: effectName,
            type: numValue > 0 ? "buff" : "debuff",
            icon: skill.icon ?? undefined,
            duration: dur,
            effects: [
              {
                type: effect.stat,
                value: numValue,
                isPercentage: effect.isPercentage,
              },
            ],
          },
          currentRound,
        );

        updatedParticipant = {
          ...updatedParticipant,
          battleData: {
            ...updatedParticipant.battleData,
            activeEffects: newEffects,
          },
        };
        effects.push(
          `${effect.stat}: ${numValue > 0 ? "+" : ""}${effect.value}`,
        );
        messages.push(
          `✨ ${skill.name}: ${effect.stat} ${numValue > 0 ? "+" : ""}${effect.value}`,
        );
        break;
      }

      // --- DOT ефекти (bleed, poison, burn, fire) ---
      case "bleed_damage":
      case "poison_damage":
      case "burn_damage":
      case "fire_damage": {
        const dotDmg =
          typeof effect.value === "string"
            ? parseDiceAverage(effect.value)
            : numValue;

        const dotDur = effect.duration ?? 1;

        const dmgType = effect.stat.replace("_damage", "");

        const dotEffects = addActiveEffect(
          updatedParticipant,
          {
            id: `skill-${skill.skillId}-${effect.stat}-${Date.now()}`,
            name: `${skill.name} — ${dmgType}`,
            type: "debuff",
            icon: skill.icon ?? undefined,
            duration: dotDur,
            effects: [],
            dotDamage: {
              damagePerRound: dotDmg,
              damageType: dmgType,
            },
          },
          currentRound,
        );

        updatedParticipant = {
          ...updatedParticipant,
          battleData: {
            ...updatedParticipant.battleData,
            activeEffects: dotEffects,
          },
        };
        effects.push(`${dmgType} DOT: ${effect.value} (${dotDur} раундів)`);
        messages.push(
          `🔥 ${skill.name}: ${dmgType} ${effect.value} на ${dotDur} раундів`,
        );
        break;
      }

      // --- Прапорці (flags) ---
      case "attack_before_enemy":
      case "guaranteed_hit":
      case "damage_resistance":
      case "enemy_attack_disadvantage":
      case "light_spells_target_all_allies":
      case "new_spell":
      case "spell_area":
      case "area_damage":
      case "advantage":
        effects.push(`${effect.stat}: ${effect.value}`);
        break;

      // --- Спеціальні ефекти ---
      case "survive_lethal":
      case "actions":
      case "extra_casts":
      case "redirect_physical_damage":
      case "summon_tier":
      case "marked_targets":
      case "field_damage":
      case "revive_hp":
      case "crit_threshold":
      case "spell_levels":
      case "spell_slots_lvl4_5":
      case "spell_targets_lvl4_5":
      case "max_targets":
      case "morale_per_kill":
      case "morale_per_ally_death":
      case "damage":
      case "heal":
      case "control_units":
      case "summon_count":
      case "summon_hp":
      case "summon_damage":
      case "spell_hp":
      case "enemy_summon_damage":
      case "armor_reduction":
      case "area_cells":
      case "caster_self_damage":
      case "exp_gain":
      case "magic_schools":
      case "morale_restore":
      case "clear_negative_effects":
      case "resurrect_count":
      case "resurrect_hp":
      case "restore_spell_slot":
        effects.push(`${effect.stat}: ${effect.value}`);
        break;

      default:
        // Невідомий ефект — логуємо для дебагу
        effects.push(`${effect.stat}: ${effect.value}`);
        break;
    }
  }

  return {
    updatedParticipant,
    effects,
    messages,
  };
}

/**
 * Виконує всі скіли з певним тригером для учасника
 */
export function executeSkillsByTrigger(
  participant: BattleParticipant,
  triggerType: SimpleSkillTrigger,
  allParticipants: BattleParticipant[],
  context?: Pick<
    SkillTriggerContext,
    "target" | "currentRound" | "isOwnerAction"
  >,
): SkillTriggerExecutionResult {
  let updatedParticipant = { ...participant };

  const executedSkills: Array<{
    skillId: string;
    skillName: string;
    effects: string[];
  }> = [];

  const messages: string[] = [];

  if (
    !updatedParticipant.battleData.activeSkills ||
    updatedParticipant.battleData.activeSkills.length === 0
  ) {
    return {
      participant: updatedParticipant,
      executedSkills: [],
      messages: [],
    };
  }

  // Отримуємо всі скіли з потрібним тригером
  const skillsToExecute = getSkillsByTrigger(
    updatedParticipant.battleData.activeSkills,
    triggerType,
    updatedParticipant,
    allParticipants,
    context,
  );

  // Виконуємо кожен скіл
  for (const skill of skillsToExecute) {
    console.info("[тригер]", triggerType, {
      skill: skill.name,
      skillId: skill.skillId,
      participant: updatedParticipant.basicInfo.name,
    });

    const executionResult = executeSkillEffects(
      skill,
      updatedParticipant,
      allParticipants,
      context?.currentRound || 1,
    );

    updatedParticipant = executionResult.updatedParticipant;
    executedSkills.push({
      skillId: skill.skillId,
      skillName: skill.name,
      effects: executionResult.effects,
    });
    messages.push(...executionResult.messages);
  }

  return {
    participant: updatedParticipant,
    executedSkills,
    messages,
  };
}

/**
 * Виконує лише complex-тригери, які стали істинними через зміну стану
 * конкретного учасника (наприклад ручну зміну HP DM'ом).
 */
export function executeComplexTriggersForChangedParticipant(
  allParticipants: BattleParticipant[],
  changedParticipantId: string,
  currentRound: number,
): {
  updatedParticipants: BattleParticipant[];
  messages: string[];
} {
  const byId = new Map(allParticipants.map((p) => [p.basicInfo.id, { ...p }]));

  const changedParticipant = byId.get(changedParticipantId);

  if (!changedParticipant) {
    return {
      updatedParticipants: allParticipants,
      messages: [],
    };
  }

  const messages: string[] = [];

  for (const participant of allParticipants) {
    const existingParticipant = byId.get(participant.basicInfo.id);

    if (!existingParticipant) continue;

    let currentParticipant = existingParticipant;

    const activeSkills = currentParticipant.battleData.activeSkills ?? [];

    for (const skill of activeSkills) {
      if (!skill.skillTriggers || skill.skillTriggers.length === 0) continue;

      const shouldExecute = skill.skillTriggers.some(
        (trigger) =>
          trigger.type === "complex" &&
          evaluateSkillTrigger(trigger, currentParticipant, {
            currentRound,
            allParticipants: [currentParticipant, changedParticipant],
          }),
      );

      if (!shouldExecute) continue;

      console.info("[тригер] complex", {
        skill: skill.name,
        skillId: skill.skillId,
        participant: currentParticipant.basicInfo.name,
        changedParticipant: changedParticipant.basicInfo.name,
      });

      const executionResult = executeSkillEffects(
        skill,
        currentParticipant,
        Array.from(byId.values()),
        currentRound,
      );

      currentParticipant = executionResult.updatedParticipant;
      byId.set(currentParticipant.basicInfo.id, currentParticipant);
      messages.push(...executionResult.messages);
    }
  }

  return {
    updatedParticipants: allParticipants.map(
      (p) => byId.get(p.basicInfo.id) ?? p,
    ),
    messages,
  };
}

/**
 * Виконує тригери для всіх учасників на початку раунду
 */
export function executeStartOfRoundTriggers(
  allParticipants: BattleParticipant[],
  currentRound: number,
): {
  updatedParticipants: BattleParticipant[];
  messages: string[];
} {
  const updatedParticipants: BattleParticipant[] = [];

  const allMessages: string[] = [];

  for (const participant of allParticipants) {
    const result = executeSkillsByTrigger(
      participant,
      "startRound",
      allParticipants,
      {
        currentRound,
      },
    );

    updatedParticipants.push(result.participant);
    allMessages.push(...result.messages);
  }

  return {
    updatedParticipants,
    messages: allMessages,
  };
}

/**
 * Виконує тригери перед атакою
 */
export function executeBeforeAttackTriggers(
  attacker: BattleParticipant,
  target: BattleParticipant,
  allParticipants: BattleParticipant[],
  isOwnerAction: boolean,
): {
  updatedAttacker: BattleParticipant;
  messages: string[];
} {
  const triggerType = isOwnerAction ? "beforeOwnerAttack" : "beforeEnemyAttack";

  const result = executeSkillsByTrigger(
    attacker,
    triggerType,
    allParticipants,
    {
      target,
      isOwnerAction,
    },
  );

  return {
    updatedAttacker: result.participant,
    messages: result.messages,
  };
}

/**
 * Виконує тригери після атаки
 */
export function executeAfterAttackTriggers(
  attacker: BattleParticipant,
  target: BattleParticipant,
  allParticipants: BattleParticipant[],
  isOwnerAction: boolean,
): {
  updatedAttacker: BattleParticipant;
  messages: string[];
} {
  const triggerType = isOwnerAction ? "afterOwnerAttack" : "afterEnemyAttack";

  const result = executeSkillsByTrigger(
    attacker,
    triggerType,
    allParticipants,
    {
      target,
      isOwnerAction,
    },
  );

  return {
    updatedAttacker: result.participant,
    messages: result.messages,
  };
}

/**
 * Виконує тригери перед кастом заклинання
 */
export function executeBeforeSpellCastTriggers(
  caster: BattleParticipant,
  target: BattleParticipant | undefined,
  allParticipants: BattleParticipant[],
  isOwnerAction: boolean,
): {
  updatedCaster: BattleParticipant;
  messages: string[];
} {
  const triggerType = isOwnerAction
    ? "beforeOwnerSpellCast"
    : "beforeEnemySpellCast";

  const result = executeSkillsByTrigger(caster, triggerType, allParticipants, {
    target,
    isOwnerAction,
  });

  return {
    updatedCaster: result.participant,
    messages: result.messages,
  };
}

/**
 * Виконує тригери після касту заклинання
 */
export function executeAfterSpellCastTriggers(
  caster: BattleParticipant,
  target: BattleParticipant | undefined,
  allParticipants: BattleParticipant[],
  isOwnerAction: boolean,
): {
  updatedCaster: BattleParticipant;
  messages: string[];
} {
  const triggerType = isOwnerAction
    ? "afterOwnerSpellCast"
    : "afterEnemySpellCast";

  const result = executeSkillsByTrigger(caster, triggerType, allParticipants, {
    target,
    isOwnerAction,
  });

  return {
    updatedCaster: result.participant,
    messages: result.messages,
  };
}

// ============================================================================
// onHit, onKill, onLethalDamage, onBattleStart, onAttack — Event-Based Skills
// ============================================================================

/** 4 руни для Рунічної атаки: +1 ініціатива, +1 AC, +10 HP, +1 мораль */
const RUNIC_ATTACK_RUNES = [
  { type: "initiative", value: 1, label: "ініціатива +1" },
  { type: "armor", value: 1, label: "AC +1" },
  { type: "heal", value: 10, label: "HP +10" },
  { type: "morale", value: 1, label: "мораль +1" },
] as const;

/**
 * Виконує onHit ефекти (скіли з тригером "onHit") після влучання атакою.
 * Ефекти застосовуються до ЦІЛІ (дебафи/DOT, напр. кровотеча) або до АТАКУЮЧОГО (руни, лікування).
 * Для effect.target === "all_allies" застосовує ефекти до всіх союзників і повертає updatedParticipants.
 * Перевіряє ймовірність спрацювання (modifiers.probability).
 * Якщо у тригера вказано modifiers.attackId — скіл спрацьовує лише при атаці з таким id/назвою.
 * @param physicalDamageDealt - фізична шкода завдана цілі (для blood_sacrifice_heal)
 * @param currentAttackId - id атаки, якою влучили (для прив'язки onHit до конкретної атаки)
 * @param currentAttackName - назва атаки
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
    ? allParticipants.map((participant) => {
        if (participant.basicInfo.id === attacker.basicInfo.id) return attacker;

        if (participant.basicInfo.id === target.basicInfo.id) return target;

        return participant;
      })
    : [attacker, target];

  const byId = new Map(
    participants.map((p) => [p.basicInfo.id, { ...p }]),
  );

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

    for (const effect of skill.effects) {
      const numValue = typeof effect.value === "number" ? effect.value : 0;

      switch (effect.stat) {
        case "bleed_damage":
        case "poison_damage":
        case "burn_damage":
        case "fire_damage": {
          const dotDmg =
            typeof effect.value === "string"
              ? parseDiceAverage(effect.value)
              : numValue;

          const dotDur = effect.duration ?? 1;

          const dmgType = effect.stat.replace("_damage", "");

          const newEffects = addActiveEffect(
            updatedTarget,
            {
              id: `skill-${skill.skillId}-${effect.stat}-${Date.now()}`,
              name: `${skill.name} — ${dmgType}`,
              type: "debuff",
              icon: skill.icon ?? undefined,
              duration: dotDur,
              effects: [],
              dotDamage: { damagePerRound: dotDmg, damageType: dmgType },
            },
            currentRound,
          );

          updatedTarget = {
            ...updatedTarget,
            battleData: {
              ...updatedTarget.battleData,
              activeEffects: newEffects,
            },
          };
          set(updatedTarget);
          messages.push(
            `🔥 ${skill.name}: ${dmgType} ${effect.value} на ${target.basicInfo.name} (${dotDur} р.)`,
          );
          break;
        }
        case "initiative": {
          const dur = effect.duration ?? 2;

          if (
            effect.target === "all_allies" &&
            allParticipants &&
            allParticipants.length > 0
          ) {
            const targets = getEffectTargets(
              updatedAttacker,
              effect.target,
              Array.from(byId.values()),
            );

            for (const t of targets) {
              const val =
                effect.type === "formula" && typeof effect.value === "string"
                  ? evaluateFormulaSimple(effect.value, t)
                  : numValue;

              const ne = addActiveEffect(
                t,
                {
                  id: `skill-${skill.skillId}-initiative-${t.basicInfo.id}-${Date.now()}`,
                  name: `${skill.name} — ініціатива`,
                  type: "buff",
                  icon: skill.icon ?? undefined,
                  duration: dur,
                  effects: [{ type: "initiative_bonus", value: val }],
                },
                currentRound,
              );

              set({ ...t, battleData: { ...t.battleData, activeEffects: ne } });
            }

            const targetNames = targets.map((t) => t.basicInfo.name).join(", ");

            messages.push(
              `🏃 ${skill.name}: ${updatedAttacker.basicInfo.name} → ${targetNames} +ініціатива (${dur} р.)`,
            );
          } else {
            const ne = addActiveEffect(
              updatedTarget,
              {
                id: `skill-${skill.skillId}-initiative-${Date.now()}`,
                name: `${skill.name} — ініціатива`,
                type: "debuff",
                icon: skill.icon ?? undefined,
                duration: dur,
                effects: [{ type: "initiative_bonus", value: numValue }],
              },
              currentRound,
            );

            updatedTarget = {
              ...updatedTarget,
              battleData: { ...updatedTarget.battleData, activeEffects: ne },
            };

            set(updatedTarget);

            messages.push(
              `⚡ ${skill.name}: ${target.basicInfo.name} ${numValue} ініціатива (${dur} р.)`,
            );
          }

          break;
        }
        case "melee_damage":
        case "ranged_damage": {
          if (
            effect.target === "all_allies" &&
            allParticipants &&
            allParticipants.length > 0
          ) {
            const targets = getEffectTargets(
              updatedAttacker,
              effect.target,
              Array.from(byId.values()),
            );

            const dur = effect.duration ?? 2;

            for (const t of targets) {
              const val =
                effect.type === "formula" && typeof effect.value === "string"
                  ? evaluateFormulaSimple(effect.value, t)
                  : numValue;

              const ne = addActiveEffect(
                t,
                {
                  id: `skill-${skill.skillId}-${effect.stat}-${t.basicInfo.id}-${Date.now()}`,
                  name: `${skill.name} — бонус урону`,
                  type: "buff",
                  icon: skill.icon ?? undefined,
                  duration: dur,
                  effects: [{ type: effect.stat, value: val }],
                },
                currentRound,
              );

              set({ ...t, battleData: { ...t.battleData, activeEffects: ne } });
            }

            const targetNames = targets.map((t) => t.basicInfo.name).join(", ");

            messages.push(
              `⚔️ ${skill.name}: ${updatedAttacker.basicInfo.name} → ${targetNames} +${effect.stat} (${dur} р.)`,
            );
          }

          break;
        }
        case "armor": {
          const dur = effect.duration ?? 1;

          const ne = addActiveEffect(
            updatedTarget,
            {
              id: `skill-${skill.skillId}-armor-${Date.now()}`,
              name: `${skill.name} — AC`,
              type: "debuff",
              icon: skill.icon ?? undefined,
              duration: dur,
              effects: [{ type: "ac_bonus", value: numValue }],
            },
            currentRound,
          );

          updatedTarget = {
            ...updatedTarget,
            battleData: { ...updatedTarget.battleData, activeEffects: ne },
            combatStats: {
              ...updatedTarget.combatStats,
              armorClass: updatedTarget.combatStats.armorClass + numValue,
            },
          };
          set(updatedTarget);
          messages.push(
            `🛡 ${skill.name}: ${target.basicInfo.name} ${numValue} AC (${dur} р.)`,
          );
          break;
        }
        case "speed": {
          const dur = effect.duration ?? 1;

          const speedRed = effect.isPercentage
            ? Math.floor(
                updatedTarget.combatStats.speed * (Math.abs(numValue) / 100),
              )
            : Math.abs(numValue);

          const ne = addActiveEffect(
            updatedTarget,
            {
              id: `skill-${skill.skillId}-speed-${Date.now()}`,
              name: `${skill.name} — швидкість`,
              type: "debuff",
              icon: skill.icon ?? undefined,
              duration: dur,
              effects: [{ type: "speed_bonus", value: -speedRed }],
            },
            currentRound,
          );

          updatedTarget = {
            ...updatedTarget,
            battleData: { ...updatedTarget.battleData, activeEffects: ne },
            combatStats: {
              ...updatedTarget.combatStats,
              speed: Math.max(0, updatedTarget.combatStats.speed - speedRed),
            },
          };
          set(updatedTarget);
          messages.push(
            `🐌 ${skill.name}: ${target.basicInfo.name} −${speedRed} швидкість (${dur} р.)`,
          );
          break;
        }
        case "damage_resistance":
          if (effect.type === "ignore")
            messages.push(`⚔️ ${skill.name}: ігнорує резист`);

          break;
        case "damage":
          if (effect.type === "stack")
            messages.push(`💥 ${skill.name}: ×${effect.value} урону`);

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
        case "armor_reduction": {
          const dur = effect.duration ?? 1;

          const armorRed = Math.floor(
            updatedTarget.combatStats.armorClass * (numValue / 100),
          );

          const ne = addActiveEffect(
            updatedTarget,
            {
              id: `skill-${skill.skillId}-armor-red-${Date.now()}`,
              name: `${skill.name} — −AC`,
              type: "debuff",
              icon: skill.icon ?? undefined,
              duration: dur,
              effects: [{ type: "ac_bonus", value: -armorRed }],
            },
            currentRound,
          );

          updatedTarget = {
            ...updatedTarget,
            battleData: { ...updatedTarget.battleData, activeEffects: ne },
            combatStats: {
              ...updatedTarget.combatStats,
              armorClass: Math.max(
                0,
                updatedTarget.combatStats.armorClass - armorRed,
              ),
            },
          };
          set(updatedTarget);
          messages.push(
            `🔨 ${skill.name}: ${target.basicInfo.name} −${numValue}% AC (${dur} р.)`,
          );
          break;
        }
        // --- Рунічна атака: накладає на власника 1 з 4 рандомних рун (+1 ініціатива, +1 AC, +10 HP, +1 мораль) ---
        case "runic_attack": {
          const runeIdx = Math.floor(Math.random() * RUNIC_ATTACK_RUNES.length);

          const rune = RUNIC_ATTACK_RUNES[runeIdx];

          const dur = 1;

          if (rune.type === "initiative") {
            const ne = addActiveEffect(
              updatedAttacker,
              {
                id: `skill-${skill.skillId}-runic-init-${Date.now()}`,
                name: `${skill.name} — ${rune.label}`,
                type: "buff",
                icon: skill.icon ?? undefined,
                duration: dur,
                effects: [{ type: "initiative_bonus", value: rune.value }],
              },
              currentRound,
            );

            updatedAttacker = {
              ...updatedAttacker,
              battleData: { ...updatedAttacker.battleData, activeEffects: ne },
            };
            set(updatedAttacker);
          } else if (rune.type === "armor") {
            const ne = addActiveEffect(
              updatedAttacker,
              {
                id: `skill-${skill.skillId}-runic-ac-${Date.now()}`,
                name: `${skill.name} — ${rune.label}`,
                type: "buff",
                icon: skill.icon ?? undefined,
                duration: dur,
                effects: [{ type: "ac_bonus", value: rune.value }],
              },
              currentRound,
            );

            updatedAttacker = {
              ...updatedAttacker,
              battleData: { ...updatedAttacker.battleData, activeEffects: ne },
            };
            set(updatedAttacker);
          } else if (rune.type === "heal") {
            const newHp = Math.min(
              updatedAttacker.combatStats.maxHp,
              updatedAttacker.combatStats.currentHp + rune.value,
            );

            updatedAttacker = {
              ...updatedAttacker,
              combatStats: { ...updatedAttacker.combatStats, currentHp: newHp },
            };
            set(updatedAttacker);
          } else {
            updatedAttacker = {
              ...updatedAttacker,
              combatStats: {
                ...updatedAttacker.combatStats,
                morale: updatedAttacker.combatStats.morale + rune.value,
              },
            };
            set(updatedAttacker);
          }

          messages.push(
            `🔮 ${skill.name}: ${attacker.basicInfo.name} — ${rune.label}`,
          );
          break;
        }
        // --- Кровожертсво: лікує на X% від завданої фізичної шкоди власника ---
        case "blood_sacrifice_heal": {
          if (physicalDamageDealt != null && physicalDamageDealt > 0) {
            const percent = effect.isPercentage
              ? numValue
              : typeof effect.value === "number"
                ? effect.value
                : 50;

            const healAmount = Math.floor(
              physicalDamageDealt * (percent / 100),
            );

            if (healAmount > 0) {
              const newHp = Math.min(
                updatedAttacker.combatStats.maxHp,
                updatedAttacker.combatStats.currentHp + healAmount,
              );

              updatedAttacker = {
                ...updatedAttacker,
                combatStats: {
                  ...updatedAttacker.combatStats,
                  currentHp: newHp,
                },
              };
              set(updatedAttacker);
              messages.push(
                `🩸 ${skill.name}: ${attacker.basicInfo.name} лікується на ${healAmount} HP (${percent}% від шкоди)`,
              );
            }
          }

          break;
        }
        default:
          break;
      }
      updatedTarget = get(target.basicInfo.id);
      updatedAttacker = get(attacker.basicInfo.id);
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

/**
 * Перевіряє survive_lethal (Битва до останнього): якщо HP <= 0, залишає 1 HP.
 * Повертає true якщо ефект спрацював.
 */
export function checkSurviveLethal(
  participant: BattleParticipant,
  skillUsageCounts?: Record<string, number>,
): { survived: boolean; message: string | null } {
  for (const skill of participant.battleData.activeSkills) {
    if (!skill.skillTriggers) continue;

    const trigger = skill.skillTriggers.find(
      (t) => t.type === "simple" && t.trigger === "onLethalDamage",
    );

    if (!trigger) continue;

    // Перевірка oncePerBattle
    if (trigger.modifiers?.oncePerBattle && skillUsageCounts) {
      if ((skillUsageCounts[skill.skillId] ?? 0) >= 1) continue;
    }

    // Перевіряємо чи є survive_lethal ефект
    const hasSurvive = skill.effects.some((e) => e.stat === "survive_lethal");

    if (!hasSurvive) continue;

    // Спрацював!
    if (skillUsageCounts) {
      skillUsageCounts[skill.skillId] =
        (skillUsageCounts[skill.skillId] ?? 0) + 1;
    }

    return {
      survived: true,
      message: `💀 ${skill.name}: ${participant.basicInfo.name} вижив з 1 HP!`,
    };
  }

  return { survived: false, message: null };
}

/**
 * Перевіряє onKill ефекти після вбивства (ефект «Додаткова дія»).
 * Ефект actions накопичувальний: value — кількість додаткових дій за спрацювання, пул діє до кінця бою.
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

/**
 * Визначає цілі для ефекту на основі effect.target
 * all_allies — усі на стороні кастера (включно з ним)
 * all_enemies — усі на протилежній стороні
 */
function getEffectTargets(
  caster: BattleParticipant,
  target: string | undefined,
  allParticipants: BattleParticipant[],
): BattleParticipant[] {
  switch (target) {
    case "all_allies":
      return allParticipants.filter(
        (p) => p.basicInfo.side === caster.basicInfo.side,
      );
    case "all_enemies":
      return allParticipants.filter(
        (p) => p.basicInfo.side !== caster.basicInfo.side,
      );
    case "all":
      return allParticipants;
    case "self":
    case "enemy":
    default:
      return [caster];
  }
}

/**
 * Виконує onBattleStart ефекти з підтримкою цілей (Союзники/Вороги/Усі).
 * Для effect.target: all_allies — всім союзникам, all_enemies — всім ворогам, all — усім.
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

        set({
          ...target,
          battleData: { ...target.battleData, activeEffects: ne },
        });
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
 * Повертає оновлений initiativeOrder.
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

      // Якщо в БД/мапінгу немає target, для бафів onBattleStart вважаємо all_allies
      const buffStats = [
        "initiative",
        "damage",
        "melee_damage",
        "ranged_damage",
        "all_damage",
        "advantage",
      ];

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

          set({
            ...target,
            battleData: { ...target.battleData, activeEffects: ne },
          });
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
 * Застосовує onBattleStart ефекти (all_allies) від усіх союзників до нових учасників
 * (наприклад призваних істот). Щоб скіли типу Ізабель діяли на союзників, що з'явились під час бою.
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

/**
 * Виконує ефект бонусної дії для конкретного скіла.
 * Повертає оновленого учасника, ціль (якщо є), та всіх учасників.
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

  // Перевірка модифікаторів
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

    // Визначаємо цілі для ефектів з target (all_allies, all_enemies, targetParticipantId)
    const targets =
      effect.target === "all_allies" || effect.target === "all_enemies"
        ? getEffectTargets(updatedParticipant, effect.target, all())
        : targetParticipantId
          ? [get(targetParticipantId)].filter(Boolean)
          : [get(updatedParticipant.basicInfo.id)];

    switch (effect.stat) {
      // Перенаправлення фізичного урону
      case "redirect_physical_damage": {
        if (targetParticipantId) {
          messages.push(
            `🛡 ${skill.name}: ${participant.basicInfo.name} перенаправляє ${numValue}% фізичного урону на союзника`,
          );
        }

        break;
      }

      // Призив демонів (Відкриття воріт)
      case "summon_tier": {
        messages.push(
          `👹 ${skill.name}: ${participant.basicInfo.name} призиває демона tier ${numValue}`,
        );
        break;
      }

      // Позначення цілей (Мисливець — Ельфи)
      case "marked_targets": {
        messages.push(
          `🎯 ${skill.name}: ${participant.basicInfo.name} позначає ${numValue} цілей`,
        );
        break;
      }

      // Додаткові касти (Знак Мага)
      case "extra_casts": {
        messages.push(
          `✨ ${skill.name}: ${participant.basicInfo.name} отримує ${numValue} додаткових кастів`,
        );

        const p = get(updatedParticipant.basicInfo.id);

        set({
          ...p,
          actionFlags: { ...p.actionFlags, hasUsedAction: false },
        });
        break;
      }

      // Відновлення моралі (Натхнення/Заохочення) — підтримка effect.target all_allies
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

      // Ініціатива — підтримка effect.target all_allies та formula
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

      // Броня — підтримка effect.target all_allies
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

      // Бонус урону / advantage — підтримка effect.target all_allies
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

      // Відновлення слоту (Пожирач - onConsumeDead)
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

      // Поле бою (Пекельна Земля — 3 раунди DOT на всіх ворогів)
      case "field_damage": {
        const dmgValue =
          typeof effect.value === "string"
            ? evaluateFormulaSimple(effect.value, participant)
            : numValue;

        const duration = 3; // 3 раунди

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

      // Воскресіння (Ангел Хранитель)
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

      // Паніка (Крик Банші — мораль -3 на всіх ворогів)
      case "morale_restore": {
        // Використовується також для негативної моралі (Крик Банші)
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

      // Зняття негативних ефектів (Супротив)
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

  // Синхронізуємо з byId та позначаємо бонусну дію як використану
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

// ============================================================================
// Morale Updates
// ============================================================================

/**
 * Оновлює мораль після вбивства/смерті (Лідерство: Помста).
 */
export function updateMoraleOnEvent(
  participants: BattleParticipant[],
  eventType: "kill" | "allyDeath",
  eventParticipantId: string,
): { updatedParticipants: BattleParticipant[]; messages: string[] } {
  const messages: string[] = [];

  const eventParticipant = participants.find(
    (p) => p.basicInfo.id === eventParticipantId,
  );

  if (!eventParticipant) return { updatedParticipants: participants, messages };

  const updatedParticipants = participants.map((p) => {
    // Перевіряємо лише союзників
    if (p.basicInfo.side !== eventParticipant.basicInfo.side) return p;

    if (p.combatStats.status !== "active") return p;

    let moraleChange = 0;

    for (const skill of p.battleData.activeSkills) {
      for (const effect of skill.effects) {
        if (
          eventType === "kill" &&
          effect.stat === "morale_per_kill" &&
          typeof effect.value === "number"
        ) {
          moraleChange += effect.value;
        }

        if (
          eventType === "allyDeath" &&
          effect.stat === "morale_per_ally_death" &&
          typeof effect.value === "number"
        ) {
          moraleChange += effect.value;
        }
      }
    }

    if (moraleChange !== 0) {
      const newMorale = Math.max(
        -3,
        Math.min(3, p.combatStats.morale + moraleChange),
      );

      if (newMorale !== p.combatStats.morale) {
        messages.push(
          `📊 ${p.basicInfo.name}: мораль ${moraleChange > 0 ? "+" : ""}${moraleChange} (${eventType === "kill" ? "вбивство" : "смерть союзника"})`,
        );

        return { ...p, combatStats: { ...p.combatStats, morale: newMorale } };
      }
    }

    return p;
  });

  return { updatedParticipants, messages };
}

// ============================================================================
// Formula Helper
// ============================================================================

function evaluateFormulaSimple(
  formula: string,
  participant: BattleParticipant,
): number {
  const maxHp = participant.combatStats.maxHp;

  const currentHp = participant.combatStats.currentHp;

  const lostHpPercent = maxHp > 0 ? ((maxHp - currentHp) / maxHp) * 100 : 0;

  const context: Record<string, number> = {
    hero_level: participant.abilities.level,
    lost_hp_percent: lostHpPercent,
    morale: participant.combatStats.morale,
  };

  const result = evaluateFormula(formula, context);

  return Math.floor(result);
}
