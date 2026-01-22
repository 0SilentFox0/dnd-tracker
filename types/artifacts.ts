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
