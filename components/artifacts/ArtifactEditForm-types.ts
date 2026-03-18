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
  bonuses: Record<string, number>;
  passiveAbility: { name?: string; description?: string } | null;
}
