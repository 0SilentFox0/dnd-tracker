import { campaignDelete, createCampaignCrudApi } from "@/lib/api/client";
import type { Ability } from "@/lib/utils/abilities/schema";
import type { WeaponStats } from "@/lib/utils/artifacts/weapon-stats";
import type { ArtifactListItem } from "@/types/artifacts";

export type { ArtifactListItem };

export type Artifact = ArtifactListItem & Record<string, unknown>;

export type CreateArtifactData = {
  name: string;
  description?: string;
  rarity?: string;
  slot: string;
  setId?: string;
  icon?: string | null;
  abilities?: Ability[];
  weapon?: WeaponStats;
};

export type UpdateArtifactData = Partial<{
  name: string;
  description: string | null;
  rarity: string | null;
  slot: string;
  setId: string | null;
  icon: string | null;
  abilities: Ability[];
  weapon: WeaponStats;
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
