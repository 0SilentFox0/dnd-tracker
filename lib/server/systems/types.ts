import type { ZodType } from "zod";

import type { CharacterOperation } from "@/lib/server/characters/operation-runner";

export interface SystemSchemas {
  characteristics?: ZodType;
  unitCharacteristics?: ZodType;
  systemStats?: ZodType;
}

export interface SystemOperation {
  operation: CharacterOperation;
  input: ZodType;
}

export interface SystemServer {
  schemas: SystemSchemas;
  operations?: Record<string, SystemOperation>;
}
