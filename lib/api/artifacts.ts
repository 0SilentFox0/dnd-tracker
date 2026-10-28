import { campaignDelete, createCampaignCrudApi } from "@/lib/api/client";
import type { Ability } from "@/lib/utils/abilities/schema";
import type { WeaponStats } from "@/lib/utils/artifacts/weapon-stats";
import type { Artifact, ArtifactListItem } from "@/types/artifacts";

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
  { ok: true }
>("/artifacts");

export const getArtifacts = (campaignId: string): Promise<ArtifactListItem[]> => artifactsApi.list(campaignId);

export const createArtifact = artifactsApi.create;
export const updateArtifact = artifactsApi.update;
export const deleteArtifact = artifactsApi.remove;

export async function deleteAllArtifacts(
  campaignId: string,
): Promise<{ ok: true; deleted: number }> {
  return campaignDelete<{ ok: true; deleted: number }>(campaignId, "/artifacts");
}
