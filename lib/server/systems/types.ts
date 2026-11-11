import type { ZodType } from "zod";

import type { CharacterOperation } from "@/lib/server/characters/operation-runner";
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

export interface SystemAi {
  promptLine?: string;
  heroSelect?: Record<string, true>;
  party?(campaignId: string, query: Record<string, unknown>): Promise<Record<string, unknown>[]>;
  hero?(campaignId: string, row: Record<string, unknown>): Promise<Record<string, unknown>>;
  participantView?(p: BattleParticipant): Record<string, unknown>;
  unitView?(row: { characteristics?: unknown }): Record<string, unknown>;
}

export interface SystemServer {
  schemas: SystemSchemas;
  operations?: Record<string, SystemOperation>;
  ai?: SystemAi;
}
