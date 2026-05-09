import { campaignDelete, createCampaignCrudApi } from "@/lib/api/client";

export interface ArtifactListItem {
  id: string;
  name: string;
  slot: string;
  icon?: string | null;
  setId?: string | null;
  [key: string]: unknown;
}

export type Artifact = ArtifactListItem & Record<string, unknown>;

export type CreateArtifactData = {
  name: string;
  description?: string;
  rarity?: string;
  slot: string;
  bonuses?: Record<string, number | undefined>;
  modifiers?: Array<{
    type: string;
    value: number | string;
    isPercentage?: boolean;
    element?: string;
  }>;
  passiveAbility?: Record<string, unknown>;
  setId?: string;
  icon?: string | null;
};

export type UpdateArtifactData = Partial<{
  name: string;
  description: string | null;
  rarity: string | null;
  slot: string;
  bonuses: Record<string, number | undefined>;
  modifiers: Array<{
    type: string;
    value: number | string;
    isPercentage?: boolean;
    element?: string;
  }>;
  passiveAbility: Record<string, unknown> | null;
  setId: string | null;
  icon: string | null;
}>;

const artifactsApi = createCampaignCrudApi<
  Artifact,
  CreateArtifactData,
  UpdateArtifactData,
  void
>("/artifacts");

/** list повертає Array; додаткова guard на випадок не-array відповіді. */
export async function getArtifacts(
  campaignId: string,
): Promise<ArtifactListItem[]> {
  const data = await artifactsApi.list(campaignId);

  return Array.isArray(data) ? data : [];
}

export const getArtifact = artifactsApi.get;
export const createArtifact = artifactsApi.create;
export const updateArtifact = artifactsApi.update;
export const deleteArtifact = artifactsApi.remove;

export async function deleteAllArtifacts(
  campaignId: string,
): Promise<{ deleted: number }> {
  return campaignDelete<{ deleted: number }>(campaignId, "/artifacts");
}
