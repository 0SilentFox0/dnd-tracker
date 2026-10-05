import type { ConversionIssue } from "@/lib/utils/abilities/legacy/types";
import type { Ability } from "@/lib/utils/abilities/schema";

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
}
