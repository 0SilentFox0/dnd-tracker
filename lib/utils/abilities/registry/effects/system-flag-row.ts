import type { FlagDefinition } from "./flag-kit";

import type { FlagKey } from "@/lib/utils/abilities/schema";

export type SystemFlagRows<K extends FlagKey> = { [P in K]: FlagDefinition<P> };

export interface OwnedFlagRows {
  system: string;
  rows: { [K in FlagKey]?: FlagDefinition<K> };
}
