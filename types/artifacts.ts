import type { Ability, ConversionIssue } from "@/lib/utils/abilities/schema";
import type { ArmorStats } from "@/lib/utils/artifacts/armor-stats";
import type { WeaponStats } from "@/lib/utils/artifacts/weapon-stats";
import type { ItemStats } from "@/lib/utils/items/item-stats";

export interface ArtifactListItem {
  id: string;
  name: string;
  slot: string;
  icon?: string | null;
  setId?: string | null;
  rarity?: string | null;
  description?: string | null;
  abilitySummary?: string[];
  artifactSet?: { id: string; name: string } | null;
  itemKind?: "property" | "gear";
  [key: string]: unknown;
}

export interface ArtifactCardData {
  id: string;
  name: string;
  slot: string;
  rarity: string | null;
  icon: string | null;
  description: string | null;
  abilitySummary: string[];
  artifactSet?: { name: string } | null;
  itemKind?: "property" | "gear";
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
  armor?: ArmorStats | null;
  item?: ItemStats | null;
}
