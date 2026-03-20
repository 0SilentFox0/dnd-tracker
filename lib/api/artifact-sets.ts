/**
 * Клієнт API — сети артефактів
 */

import {
  campaignDelete,
  campaignGet,
  campaignPatch,
  campaignPost,
} from "@/lib/api/client";
import type { ArtifactSetRow } from "@/types/artifact-sets";

export type { ArtifactSetRow };

export async function getArtifactSets(
  campaignId: string,
): Promise<ArtifactSetRow[]> {
  return campaignGet<ArtifactSetRow[]>(campaignId, "/artifact-sets");
}

export async function getArtifactSet(
  campaignId: string,
  setId: string,
): Promise<ArtifactSetRow> {
  return campaignGet<ArtifactSetRow>(campaignId, `/artifact-sets/${setId}`);
}

export async function createArtifactSet(
  campaignId: string,
  body: {
    name: string;
    description?: string | null;
    setBonus?: unknown;
    artifactIds?: string[];
    icon?: string | null;
  },
): Promise<ArtifactSetRow> {
  return campaignPost<ArtifactSetRow>(campaignId, "/artifact-sets", body);
}

export async function updateArtifactSet(
  campaignId: string,
  setId: string,
  body: {
    name?: string;
    description?: string | null;
    setBonus?: unknown | null;
    artifactIds?: string[];
    icon?: string | null;
  },
): Promise<ArtifactSetRow> {
  return campaignPatch<ArtifactSetRow>(
    campaignId,
    `/artifact-sets/${setId}`,
    body,
  );
}

export async function deleteArtifactSet(
  campaignId: string,
  setId: string,
): Promise<{ success: boolean }> {
  return campaignDelete<{ success: boolean }>(
    campaignId,
    `/artifact-sets/${setId}`,
  );
}
