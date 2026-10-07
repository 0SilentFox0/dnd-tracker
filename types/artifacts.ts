export interface ArtifactListItem {
  id: string;
  name: string;
  slot: string;
  icon?: string | null;
  setId?: string | null;
  [key: string]: unknown;
}

export type Artifact = ArtifactListItem & Record<string, unknown>;
