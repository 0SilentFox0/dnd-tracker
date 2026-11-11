import type { ZodType } from "zod";

export interface SystemSchemas {
  characteristics?: ZodType;
  unitCharacteristics?: ZodType;
  systemStats?: ZodType;
}

export interface SystemServer {
  schemas: SystemSchemas;
}
