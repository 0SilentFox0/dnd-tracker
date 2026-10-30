import type { SpellIngredient } from "@/lib/schemas/spell-ingredients";
import type { SummonRequest } from "@/lib/utils/abilities/engine/core/types";
import type { CritPicker } from "@/lib/utils/battle/crit-choice/types";
import type { SpellFx } from "@/lib/utils/battle/fx/spells";
import type { TransformRequest } from "@/lib/utils/battle/transform/types";
import type { Ruleset } from "@/lib/utils/rules";
import type { SpellDice } from "@/lib/utils/spells/model/dice";
import type { SpellDefinition } from "@/lib/utils/spells/model/schema";
import type { BattleAction, BattleMapConfig, BattleParticipant, SpellGrant, TerrainDamage } from "@/types/battle";
import type { LogLine } from "@/types/text";

export interface CastableSpell {
  id: string;
  name: string;
  level: number;
  groupId: string | null;
  icon?: string | null;
  fx?: SpellFx | null;
  definition: SpellDefinition;
  ingredients?: SpellIngredient[];
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
  attackRolls?: Array<{ participantId: string; roll: number }>;
  dice?: SpellDice;
  /** DM накладає з сайдбару — не витрачати spell slot */
  isDMCast?: boolean;
  isLegendaryCast?: boolean;
  slotKey?: string;
  castLevel?: number;
  optionIndex?: number;
  grant?: SpellGrant;
  rng?: () => number;
  crit?: CritPicker;
  map?: BattleMapConfig | null;
  rules?: Ruleset;
}

export interface CastSpellResult {
  success: boolean;
  casterUpdated: BattleParticipant;
  allParticipantsUpdated: BattleParticipant[];
  battleAction: BattleAction;
  summons: SummonRequest[];
  /** перетворення цілей: застосовуються асинхронно (потрібен юніт кампанії) */
  transforms?: TransformRequest[];
  messages: LogLine[];
  /** кидок шкоди заклинання до опорів — для небезпеки, яку лишає zone */
  spellDamage?: TerrainDamage;
  /** мітка концентрації цього касту — для зони, що згасає разом із нею */
  concentration?: { casterId: string; castId: string };
}
