import type { FieldMeta } from "../fields";
import type { EffectApplyResult } from "./types";

import type { Segment } from "@/lib/utils/abilities/segments";

export interface SystemEffectRegistryRow {
  kind: string;
  static: boolean;
  pickable?: false;
  fields: readonly FieldMeta[];
  describe: (effect: never) => Segment[];
  apply: (input: never) => EffectApplyResult;
}

export interface SystemEffectRow {
  kind: string;
  row: SystemEffectRegistryRow;
  defaults: Record<string, unknown>;
}
