import type { AbilitySourceHook } from "./source-types";

import type { Owned } from "@/lib/utils/abilities/registry/owned";
// <systems:generated>
import { ARTIFACTSETS_ABILITY_SOURCES } from "@/systems/artifactsets/rules/ability-sources";
import { SKILLTREES_ABILITY_SOURCES } from "@/systems/skilltrees/rules/ability-sources";
// </systems:generated>

export const SYSTEM_ABILITY_SOURCES: readonly Owned<readonly AbilitySourceHook[]>[] = [
  // <systems:generated>
  { system: "artifactsets", items: ARTIFACTSETS_ABILITY_SOURCES },
  { system: "skilltrees", items: SKILLTREES_ABILITY_SOURCES },
  // </systems:generated>
];
