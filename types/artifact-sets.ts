/**
 * Сети артефактів (кампанія)
 */

export interface ArtifactSetSummaryArtifact {
  id: string;
  name: string;
  slot: string;
  icon?: string | null;
}

export interface ArtifactSetRow {
  id: string;
  campaignId: string;
  name: string;
  description: string | null;
  artifactIds: unknown;
  setBonus: unknown;
  /** URL іконки для HUD бою (статус повного сету). */
  icon?: string | null;
  createdAt: string;
  artifacts?: ArtifactSetSummaryArtifact[];
}
