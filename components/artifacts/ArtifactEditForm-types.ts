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
  bonuses: unknown;
  modifiers: unknown;
  passiveAbility: Record<string, unknown> | null;
}
