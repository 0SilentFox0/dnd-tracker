import type { QueryKey } from "@tanstack/react-query";

import { artifactSetKeys } from "@/lib/hooks/artifact-sets/keys";
import { artifactKeys } from "@/lib/hooks/artifacts/keys";
import { classKeys } from "@/lib/hooks/classes/keys";
import { raceKeys } from "@/lib/hooks/races/keys";
import { skillKeys } from "@/lib/hooks/skills/keys";
import { spellKeys } from "@/lib/hooks/spells/keys";
import { unitKeys, unitWriteKeys } from "@/lib/hooks/units/keys";
import type { ImportKind } from "@/types/content-import";

export const contentImportKeys = {
  aiAvailability: (campaignId: string, kind: ImportKind) => ["content-import-ai", campaignId, kind] as const,
};

const INVALIDATE: Record<ImportKind, (campaignId: string) => QueryKey[]> = {
  units: unitWriteKeys,
  spells: (c) => [spellKeys.list(c)],
  skills: (c) => [skillKeys.list(c)],
  "main-skills": (c) => [skillKeys.mainSkills(c), skillKeys.list(c)],
  "spell-groups": (c) => [spellKeys.groups(c), spellKeys.list(c)],
  races: (c) => [raceKeys.list(c), unitKeys.list(c)],
  classes: (c) => [classKeys.list(c)],
  artifacts: (c) => [artifactKeys.list(c), artifactSetKeys.list(c)],
  "artifact-sets": (c) => [artifactSetKeys.list(c), artifactKeys.list(c)],
};

export const importInvalidateKeys = (campaignId: string, kind: ImportKind): QueryKey[] => INVALIDATE[kind](campaignId);
