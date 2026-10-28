import type { SummonRequest } from "@/lib/utils/abilities/engine/core/types";
import type { SpellFx } from "@/lib/utils/battle/fx/spells";
import type { Ruleset } from "@/lib/utils/rules";
import type { SpellDefinition } from "@/lib/utils/spells/model/schema";
import type { BattleAction, BattleMapConfig, BattleParticipant, TerrainDamage } from "@/types/battle";

export interface CastableSpell {
  id: string;
  name: string;
  level: number;
  groupId: string | null;
  icon?: string | null;
  fx?: SpellFx | null;
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
  map?: BattleMapConfig | null;
  rules?: Ruleset;
}

export interface CastSpellResult {
  success: boolean;
  casterUpdated: BattleParticipant;
  allParticipantsUpdated: BattleParticipant[];
  battleAction: BattleAction;
  summons: SummonRequest[];
  messages: string[];
  /** кидок шкоди заклинання до опорів — для небезпеки, яку лишає zone */
  spellDamage?: TerrainDamage;
  /** мітка концентрації цього касту — для зони, що згасає разом із нею */
  concentration?: { casterId: string; castId: string };
}
