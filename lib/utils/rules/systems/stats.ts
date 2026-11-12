import type { RuleSystemDefinition } from "./types";

import type { CharacterSystemColumn } from "@/lib/constants/stat-columns";

export const statColumnsOf = (def: RuleSystemDefinition): ReadonlySet<CharacterSystemColumn> => new Set((def.stats?.columns ?? []).flatMap((part) => part.owns));
