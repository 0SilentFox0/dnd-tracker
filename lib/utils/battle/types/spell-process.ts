import type { SummonRequest } from "@/lib/utils/abilities/engine/types";
import type { SpellDefinition } from "@/lib/utils/spells/model/schema";
import type { BattleAction, BattleParticipant } from "@/types/battle";

export interface CastableSpell {
  id: string;
  name: string;
  level: number;
  groupId: string | null;
  icon?: string | null;
  definition: SpellDefinition;
}

export interface CastSpellParams {
  caster: BattleParticipant;
  spell: CastableSpell;
  targetIds: string[];
  allParticipants: BattleParticipant[];
  currentRound: number;
  battleId: string;
  diceRolls: number[];
  saveRolls?: Array<{ participantId: string; roll: number }>;
  /** DM накладає з сайдбару — не витрачати spell slot */
  isDMCast?: boolean;
  rng?: () => number;
}

export interface CastSpellResult {
  success: boolean;
  casterUpdated: BattleParticipant;
  allParticipantsUpdated: BattleParticipant[];
  battleAction: BattleAction;
  summons: SummonRequest[];
}
