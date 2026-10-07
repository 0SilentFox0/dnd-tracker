import { createCampaignCrudApi } from "@/lib/api/client";
import type { Ability } from "@/lib/utils/abilities/schema";
import type { ArtifactSetRow } from "@/types/artifact-sets";

export type { ArtifactSetRow };

export type ArtifactSetCreatePayload = {
  name: string;
  description?: string | null;
  setBonus?: unknown;
  artifactIds?: string[];
  icon?: string | null;
  abilities?: Ability[];
};

export type ArtifactSetUpdatePayload = {
  name?: string;
  description?: string | null;
  setBonus?: unknown | null;
  artifactIds?: string[];
  icon?: string | null;
  abilities?: Ability[];
};

const artifactSetsApi = createCampaignCrudApi<
  ArtifactSetRow,
  ArtifactSetCreatePayload,
  ArtifactSetUpdatePayload,
  { success: boolean }
>("/artifact-sets");

export const createArtifactSet = artifactSetsApi.create;
export const updateArtifactSet = artifactSetsApi.update;
export const deleteArtifactSet = artifactSetsApi.remove;
