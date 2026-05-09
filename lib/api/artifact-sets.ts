/**
 * Клієнт API — сети артефактів
 */

import { createCampaignCrudApi } from "@/lib/api/client";
import type { ArtifactSetRow } from "@/types/artifact-sets";

export type { ArtifactSetRow };

export type ArtifactSetCreatePayload = {
  name: string;
  description?: string | null;
  setBonus?: unknown;
  artifactIds?: string[];
  icon?: string | null;
};

export type ArtifactSetUpdatePayload = {
  name?: string;
  description?: string | null;
  setBonus?: unknown | null;
  artifactIds?: string[];
  icon?: string | null;
};

const artifactSetsApi = createCampaignCrudApi<
  ArtifactSetRow,
  ArtifactSetCreatePayload,
  ArtifactSetUpdatePayload,
  { success: boolean }
>("/artifact-sets");

export const getArtifactSets = artifactSetsApi.list;
export const getArtifactSet = artifactSetsApi.get;
export const createArtifactSet = artifactSetsApi.create;
export const updateArtifactSet = artifactSetsApi.update;
export const deleteArtifactSet = artifactSetsApi.remove;
