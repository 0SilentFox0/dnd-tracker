import type { ConversionIssue } from "@/lib/utils/abilities/schema";
import type { Ability } from "@/lib/utils/abilities/schema";
import type { WeaponStats } from "@/lib/utils/artifacts/weapon-stats";

export interface ArtifactListItem {
  id: string;
  name: string;
  slot: string;
  icon?: string | null;
  setId?: string | null;
  [key: string]: unknown;
}

export type Artifact = ArtifactListItem & Record<string, unknown>;

export interface ArtifactSetOption {
  id: string;
  name: string;
}

export interface ArtifactData {
  id: string;
  name: string;
  description: string | null;
  rarity: string | null;
  slot: string;
  icon: string | null;
  setId: string | null;
  abilities: Ability[];
  abilityIssues: ConversionIssue[];
  weapon: WeaponStats;
}
