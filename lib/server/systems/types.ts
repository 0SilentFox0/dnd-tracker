import type { ZodType } from "zod";

import type { CharacterOperation } from "@/lib/server/characters/operation-runner";
import type { getCharacterStats, UnitStats } from "@/lib/utils/battle/balance";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import type { CampaignSpellContext } from "@/lib/utils/battle/types/participant";
import type { branchLevels } from "@/lib/utils/skills/progression";
import type { BattleParticipant } from "@/types/battle";

export interface SystemSchemas {
  characteristics?: ZodType;
  unitCharacteristics?: ZodType;
  systemStats?: ZodType;
}

export interface SystemOperation {
  operation: CharacterOperation;
  input: ZodType;
}

export type SystemToolNote = "get_party" | "read_character" | "get_battle_state";

export interface SystemAi {
  promptLine?: string;
  toolNotes?: Partial<Record<SystemToolNote, string>>;
  heroSelect?: Record<string, true>;
  party?(campaignId: string, query: Record<string, unknown>): Promise<Record<string, unknown>[]>;
  hero?(campaignId: string, row: Record<string, unknown>): Promise<Record<string, unknown>>;
  participantView?(p: BattleParticipant): Record<string, unknown>;
  unitView?(row: { characteristics?: unknown }): Record<string, unknown>;
}

export interface SystemBalance {
  /** Hero numbers for the setup UI and the fair-scaling pass, from the participant built out of the character */
  heroPower(input: { built: BattleParticipant; character: { race: string; skillTreeProgress?: unknown }; campaignContext: CampaignSpellContext | undefined }): { levels: ReturnType<typeof branchLevels>; stats: ReturnType<typeof getCharacterStats> };
  /** Library unit numbers; `base` is the d20 reading of the row, `built` the participant the unit would become */
  unitStats(base: UnitStats, built: BattleParticipant): UnitStats;
  /** Library units are built with the campaign rules before they are read */
  readsBuiltRules: boolean;
}

export interface SystemBattleOperation {
  load(): Promise<{ schema: ZodType; mutate(ctx: BattleMutationContext, body: never): MutationResult | Promise<MutationResult> }>;
}

export interface SystemServer {
  schemas: SystemSchemas;
  balance: SystemBalance;
  operations?: Record<string, SystemOperation>;
  /** Battle operations the route layer resolves by name; the core settings (access, gates) stay with the route */
  battle?: Record<string, SystemBattleOperation>;
  ai?: SystemAi;
}
