import { randomUUID } from "crypto";
import type { z } from "zod";

import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { createArtifactSetSchema, patchArtifactSetSchema } from "@/lib/schemas/artifact-sets";
import {
  buildArtifactSetPatchInput,
  deleteArtifactSetAndClearArtifacts,
  findArtifactSetInCampaign,
  insertArtifactSet,
  listArtifactSets,
  reloadArtifactSetDetail,
  updateArtifactSetRow,
} from "@/lib/server/artifacts/artifact-set-queries";
import { persistIcon } from "@/lib/server/artifacts/persist-icon";
import { SyncArtifactSetError, syncArtifactSetMembers } from "@/lib/server/artifacts/sync-artifact-set-members";
import { defineResource } from "@/lib/server/content/define-resource";
import { ContentError } from "@/lib/server/content/errors";
import { withAbilityIssues } from "@/lib/utils/abilities/read";

type SetRow = NonNullable<Awaited<ReturnType<typeof findArtifactSetInCampaign>>>;

async function syncMembers(campaignId: string, setId: string, artifactIds: string[]) {
  try {
    await syncArtifactSetMembers(campaignId, setId, artifactIds);
  } catch (error) {
    if (error instanceof SyncArtifactSetError) throw new ContentError(error.message, 400);

    throw error;
  }
}

export const artifactSetsResource = defineResource<SetRow, z.infer<typeof createArtifactSetSchema>, z.infer<typeof patchArtifactSetSchema>>({
  kind: "artifact-sets",
  idParam: "setId",
  label: "Сети артефактів",
  description: "Сети: склад артефактів, бонус сету (текст і здібності), іконка.",
  path: "/artifact-sets",
  schemas: { create: createArtifactSetSchema, update: patchArtifactSetSchema },
  errors: [422],
  access: { list: "member", item: "member" },
  invalidates: [],
  notFound: API_ERRORS.NOT_FOUND,
  list: (actor) => listArtifactSets(actor.campaignId),
  find: (actor, id) => findArtifactSetInCampaign(actor.campaignId, id),
  toItem: (row) => withAbilityIssues("artifactSet", row),
  async create(actor, data) {
    const icon = data.icon !== undefined ? await persistIcon(actor.campaignId, data.icon, randomUUID()) : undefined;

    const created = await insertArtifactSet(actor.campaignId, { name: data.name, description: data.description ?? null, setBonus: data.setBonus, icon, abilities: data.abilities });

    if (data.artifactIds?.length) await syncMembers(actor.campaignId, created.id, data.artifactIds);

    return reloadArtifactSetDetail(created.id);
  },
  async update(actor, existing, data) {
    const patch = data.icon !== undefined && data.icon !== existing.icon ? { ...data, icon: await persistIcon(actor.campaignId, data.icon, `${existing.id}-${randomUUID()}`) } : data;

    const updateData = buildArtifactSetPatchInput(patch);

    if (Object.keys(updateData).length > 0) await updateArtifactSetRow(existing.id, updateData);

    if (data.artifactIds !== undefined) await syncMembers(actor.campaignId, existing.id, data.artifactIds);

    return reloadArtifactSetDetail(existing.id);
  },
  remove: (actor, existing) => deleteArtifactSetAndClearArtifacts(actor.campaignId, existing.id),
});
