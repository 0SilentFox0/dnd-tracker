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

type ArtifactSetUpdatePayload = {
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
  { ok: true }
>("/artifact-sets");

export const getArtifactSets = (campaignId: string): Promise<ArtifactSetRow[]> => artifactSetsApi.list(campaignId);

export const createArtifactSet = artifactSetsApi.create;
export const updateArtifactSet = artifactSetsApi.update;
export const deleteArtifactSet = artifactSetsApi.remove;
