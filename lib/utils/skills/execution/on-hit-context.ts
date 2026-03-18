/**
 * Контекст для застосування onHit ефектів (спільний для хендлерів)
 */

import type { ActiveSkill, BattleParticipant } from "@/types/battle";
import type { SkillEffect } from "@/types/battle";

export interface OnHitContext {
  updatedTarget: BattleParticipant;
  updatedAttacker: BattleParticipant;
  set: (p: BattleParticipant) => void;
  get: (id: string) => BattleParticipant;
  skill: ActiveSkill;
  currentRound: number;
  target: BattleParticipant;
  attacker: BattleParticipant;
  allParticipants: BattleParticipant[] | undefined;
  byId: Map<string, BattleParticipant>;
  messages: string[];
  physicalDamageDealt: number | undefined;
  currentAttackId: string | undefined;
  currentAttackName: string | undefined;
}

export type { SkillEffect };
