/**
 * Типи для артефактів
 */

export interface ArtifactBonus {
  damage?: number;
  attack?: number;
  [key: string]: unknown;
}

export interface ArtifactModifier {
  type: "damage" | "attack" | string;
  value: number;
  [key: string]: unknown;
}

export interface Artifact {
  id: string;
  bonuses: ArtifactBonus;
  modifiers: ArtifactModifier[];
}

export interface ArtifactListItem {
  id: string;
  name: string;
  slot: string;
  icon?: string | null;
  setId?: string | null;
  [key: string]: unknown;
}
