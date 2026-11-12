import { resolveAbilities } from "@/lib/utils/abilities/build/resolve";
import type { AbilitySourceHook } from "@/lib/utils/abilities/build/source-types";
import { artifactSetAbilities } from "@/lib/utils/abilities/read";

export const ARTIFACTSETS_ABILITY_SOURCES: readonly AbilitySourceHook[] = [
  {
    at: "afterArtifacts",
    collect: ({ completedSets }) => completedSets.flatMap((s) => resolveAbilities({ type: "artifactSet", id: s.id, name: s.name, icon: s.icon ?? null }, artifactSetAbilities(s))),
  },
];
