import {
  campaignDelete,
  campaignGet,
  campaignPatch,
  campaignPost,
} from "@/lib/api/client";

export interface ArtifactListItem {
  id: string;
  name: string;
  slot: string;
  icon?: string | null;
  [key: string]: unknown;
}

export type Artifact = ArtifactListItem & Record<string, unknown>;

export type CreateArtifactData = {
  name: string;
  description?: string;
  rarity?: string;
  slot: string;
  bonuses?: Record<string, number | undefined>;
  modifiers?: Array<{ type: string; value: number; isPercentage: boolean; element?: string }>;
  passiveAbility?: { name: string; description: string; effect?: Record<string, unknown> };
  setId?: string;
  icon?: string | null;
};

export type UpdateArtifactData = Partial<{
  name: string;
  description: string | null;
  rarity: string | null;
  slot: string;
  bonuses: Record<string, number | undefined>;
  modifiers: Array<{ type: string; value: number; isPercentage: boolean; element?: string }>;
  passiveAbility: { name: string; description: string; effect?: Record<string, unknown> } | null;
  setId: string | null;
  icon: string | null;
}>;

export async function getArtifacts(
  campaignId: string,
): Promise<ArtifactListItem[]> {
  const data = await campaignGet<ArtifactListItem[]>(
    campaignId,
    "/artifacts",
  );

  return Array.isArray(data) ? data : [];
}

export async function getArtifact(
  campaignId: string,
  artifactId: string,
): Promise<Artifact> {
  return campaignGet<Artifact>(campaignId, `/artifacts/${artifactId}`);
}

export async function createArtifact(
  campaignId: string,
  data: CreateArtifactData,
): Promise<Artifact> {
  return campaignPost<Artifact>(campaignId, "/artifacts", data);
}

export async function updateArtifact(
  campaignId: string,
  artifactId: string,
  data: UpdateArtifactData,
): Promise<Artifact> {
  return campaignPatch<Artifact>(
    campaignId,
    `/artifacts/${artifactId}`,
    data,
  );
}

export async function deleteArtifact(
  campaignId: string,
  artifactId: string,
): Promise<void> {
  await campaignDelete<void>(campaignId, `/artifacts/${artifactId}`);
}

export async function deleteAllArtifacts(
  campaignId: string,
): Promise<{ deleted: number }> {
  return campaignDelete<{ deleted: number }>(campaignId, "/artifacts");
}
