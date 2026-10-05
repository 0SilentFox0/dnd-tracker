/**
 * Спільні моки та хелпери для тестів skill-triggers-execution
 */

import { SkillLevel } from "@/lib/types/skill-tree";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import type {
  ActiveSkill,
  BattleParticipant,
  SkillEffect,
} from "@/types/battle";

export function createOnHitSkill(
  skillId: string,
  name: string,
  effects: SkillEffect[],
  modifiers?: {
    oncePerBattle?: boolean;
    twicePerBattle?: boolean;
    probability?: number;
  },
): ActiveSkill {
  return {
    skillId,
    mainSkillId: "",
    level: SkillLevel.BASIC,
    name,
    effects,
    skillTriggers: [
      {
        type: "simple",
        trigger: "onHit",
        ...(modifiers && { modifiers }),
      },
    ],
  };
}

export function withActiveSkills(
  participant: BattleParticipant,
  skills: ActiveSkill[],
): BattleParticipant {
  return {
    ...participant,
    battleData: {
      ...participant.battleData,
      activeSkills: skills,
    },
  };
}

export { createMockParticipant };
