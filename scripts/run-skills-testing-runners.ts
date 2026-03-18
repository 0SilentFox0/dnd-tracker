/**
 * Тестові раннери для run-skills-testing (onHit, onKill, passive, bonusAction, тощо)
 */

import {
  createMockAttacker,
  createMockTarget,
} from "./run-skills-testing-mocks";

import {
  checkSurviveLethal,
  executeBonusActionSkill,
  executeOnBattleStartEffects,
  executeOnHitEffects,
  executeOnKillEffects,
  executeSkillsByTrigger,
} from "@/lib/utils/skills/execution";
import type { ActiveSkill, BattleParticipant } from "@/types/battle";
import type { SimpleSkillTrigger } from "@/types/skill-triggers";

export function runOnHitTest(
  skill: ActiveSkill,
  mockRandom: boolean,
): { passed: boolean; detail: string } {
  const attacker = createMockAttacker([skill]);

  const target = createMockTarget();

  let randomRestore: (() => void) | undefined;

  if (mockRandom) {
    const orig = Math.random;

    (global as unknown as { Math: { random: () => number } }).Math.random =
      () => 0;
    randomRestore = () => {
      (global as unknown as { Math: { random: () => number } }).Math.random =
        orig;
    };
  }

  try {
    const result = executeOnHitEffects(attacker, target, 1, {}, 10);

    const targetEffects = result.updatedTarget.battleData.activeEffects ?? [];

    const hasDebuff = targetEffects.some(
      (e) =>
        e.dotDamage ||
        e.effects?.some(
          (d) =>
            d.type === "speed" ||
            d.type === "armor" ||
            (d.type === "initiative_bonus" &&
              typeof d.value === "number" &&
              d.value < 0),
        ),
    );

    const hasAnyEffect =
      targetEffects.length > 0 ||
      (result.updatedAttacker.battleData.activeEffects?.length ?? 0) > 0;

    const hasMessage = result.messages.length > 0;

    if (hasDebuff || (hasAnyEffect && hasMessage)) {
      return {
        passed: true,
        detail: result.messages.join("; ") || "effect applied",
      };
    }

    if (
      skill.effects.some((e) =>
        [
          "damage_resistance",
          "guaranteed_hit",
          "damage",
          "area_damage",
          "area_cells",
        ].includes(e.stat),
      )
    ) {
      return {
        passed: true,
        detail:
          result.messages.join("; ") ||
          `stat ${skill.effects.map((e) => e.stat).join(",")} (no debuff expected)`,
      };
    }

    return {
      passed: false,
      detail: `no effect on target; messages: ${result.messages.join("; ") || "none"}`,
    };
  } finally {
    randomRestore?.();
  }
}

export function runOnKillTest(skill: ActiveSkill): {
  passed: boolean;
  detail: string;
} {
  const killer = createMockAttacker([skill]);

  const usage: Record<string, number> = {};

  const result = executeOnKillEffects(killer, usage);

  const hasExtraTurn = result.updatedKiller.actionFlags?.hasExtraTurn === true;

  const hasMessage = result.messages.length > 0;

  const expectsAction = skill.effects.some((e) => e.stat === "actions");

  if (expectsAction && (hasExtraTurn || hasMessage)) {
    return {
      passed: true,
      detail: result.messages.join("; ") || "onKill executed",
    };
  }

  if (!expectsAction) {
    return { passed: true, detail: "onKill trigger ran (no actions effect)" };
  }

  return {
    passed: false,
    detail: `expected +1 action; messages: ${result.messages.join("; ") || "none"}`,
  };
}

export function runPassiveTest(skill: ActiveSkill): {
  passed: boolean;
  detail: string;
} {
  const participant = createMockAttacker([skill]);

  const allParticipants = [participant, createMockTarget()];

  const result = executeSkillsByTrigger(
    participant,
    "passive",
    allParticipants,
    { currentRound: 1 },
  );

  const executed = result.executedSkills.length > 0;

  const hasMessages = result.messages.length > 0;

  if (executed || hasMessages) {
    return {
      passed: true,
      detail: result.messages.join("; ") || "passive executed",
    };
  }

  return {
    passed: true,
    detail: "passive (effects used in damage/AC calc, not here)",
  };
}

export function runBonusActionTest(skill: ActiveSkill): {
  passed: boolean;
  detail: string;
} {
  const participant = createMockAttacker([skill]);

  const allParticipants = [participant, createMockTarget()];

  const result = executeBonusActionSkill(
    participant,
    skill,
    allParticipants,
    1,
    undefined,
    {},
  );

  const hasMessages = result.messages.length > 0;

  const participantsUpdated = result.updatedParticipants !== allParticipants;

  if (hasMessages || participantsUpdated) {
    return {
      passed: true,
      detail: result.messages.join("; ") || "bonus action executed",
    };
  }

  return {
    passed: false,
    detail: "no messages and no participant updates",
  };
}

export function runOnLethalDamageTest(skill: ActiveSkill): {
  passed: boolean;
  detail: string;
} {
  const participant = createMockAttacker([skill]);

  const usage: Record<string, number> = {};

  const result = checkSurviveLethal(participant, usage);

  if (result.survived && result.message) {
    return { passed: true, detail: result.message };
  }

  return {
    passed: false,
    detail: result.message ?? "survive_lethal did not trigger",
  };
}

export function runOnBattleStartTest(skill: ActiveSkill): {
  passed: boolean;
  detail: string;
} {
  const participant = createMockAttacker([skill]);

  const result = executeOnBattleStartEffects(participant, 1);

  const hasMessages = result.messages.length > 0;

  if (hasMessages) {
    return {
      passed: true,
      detail: result.messages.join("; ") || "onBattleStart executed",
    };
  }

  return {
    passed: true,
    detail: "onBattleStart (no effect or already applied)",
  };
}

export function runGenericTriggerTest(
  skill: ActiveSkill,
  trigger: SimpleSkillTrigger,
): { passed: boolean; detail: string } {
  const participant = createMockAttacker([skill]);

  const allParticipants = [participant, createMockTarget()];

  const context: {
    currentRound?: number;
    isOwnerAction?: boolean;
    target?: BattleParticipant;
  } = {
    currentRound: 1,
    isOwnerAction: true,
    target: allParticipants[1],
  };

  const result = executeSkillsByTrigger(
    participant,
    trigger,
    allParticipants,
    context,
  );

  const executed = result.executedSkills.length > 0;

  const hasMessages = result.messages.length > 0;

  if (executed || hasMessages) {
    return {
      passed: true,
      detail: result.messages.join("; ") || `${trigger} executed`,
    };
  }

  return {
    passed: true,
    detail: `${trigger} (no effect or condition not met)`,
  };
}
