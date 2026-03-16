import type { BattleScene } from "@/types/api";
import type { BattleParticipant } from "@/types/battle";

export type SpellTargetType = "target" | "aoe" | "no_target";

export interface SpellDialogSpell {
  id: string;
  name: string;
  level: number;
  type: SpellTargetType;
  damageType: "damage" | "heal" | "all";
  diceCount?: number | null;
  diceType?: string | null;
  savingThrow?: {
    ability: string;
    onSuccess: "half" | "none";
    dc?: number;
  } | null;
  hitCheck?: { ability: string; dc: number } | null;
  description?: string;
  spellGroup?: { id: string; name: string } | null;
  icon?: string | null;
}

export interface SpellCastPayload {
  casterId: string;
  casterType: string;
  spellId: string;
  targetIds: string[];
  damageRolls: number[];
  savingThrows?: Array<{ participantId: string; roll: number }>;
  additionalRollResult?: number;
  hitRoll?: number;
}

export interface SpellDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caster: BattleParticipant | null;
  battle: BattleScene | null;
  campaignId: string;
  availableTargets: BattleParticipant[];
  isDM: boolean;
  canSeeEnemyHp: boolean;
  onCast: (data: SpellCastPayload) => void;
  onPreview?: (data: SpellCastPayload) => void;
  /** DM може накласти будь-яке заклинання з кампанії (не лише knownSpells кастера) */
  allowAllSpellsForDM?: boolean;
}
