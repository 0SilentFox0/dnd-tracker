import type { Artifact as ArtifactRow } from "@prisma/client";
import { randomUUID } from "crypto";
import type { z } from "zod";

import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { createArtifactSchema, patchArtifactSchema } from "@/lib/schemas/artifacts";
import { persistIcon } from "@/lib/server/artifacts/persist-icon";
import { readArtifactsList } from "@/lib/server/artifacts/read-artifacts-list";
import { assertCampaignRefs } from "@/lib/server/campaigns/campaign-refs";
import { defineResource } from "@/lib/server/content/define-resource";
import { abilitiesJson, withAbilityIssues } from "@/lib/utils/abilities/read";
import { weaponStatsColumns } from "@/lib/utils/artifacts/weapon-stats";

const withSet = { artifactSet: true } as const;

export const artifactsResource = defineResource<ArtifactRow, z.infer<typeof createArtifactSchema>, z.infer<typeof patchArtifactSchema>>({
  kind: "artifacts",
  listFields: ["slot", "rarity", "setId"],
  idParam: "artifactId",
  label: "Артефакти",
  description: "Артефакти: слот, рідкість, сет, зброя, бонуси (здібності).",
  path: "/artifacts",
  schemas: { create: createArtifactSchema, update: patchArtifactSchema },
  errors: [422],
  access: { list: "member", item: "dm" },
  invalidates: [],
  notFound: API_ERRORS.NOT_FOUND,
  list: (actor) => readArtifactsList(actor.campaignId),
  find: (actor, id, purpose) => prisma.artifact.findFirst({ where: { id, campaignId: actor.campaignId }, ...(purpose === "read" && { include: withSet }) }),
  toItem: (row) => withAbilityIssues("artifact", row),
  async create(actor, data) {
    await assertCampaignRefs(actor.campaignId, { artifactSet: data.setId });

    const icon = data.icon !== undefined ? await persistIcon(actor.campaignId, data.icon, randomUUID()) : undefined;

    return prisma.artifact.create({
      data: {
        campaignId: actor.campaignId,
        name: data.name,
        description: data.description,
        rarity: data.rarity,
        slot: data.slot,
        ...(data.abilities && { abilities: abilitiesJson(data.abilities) }),
        ...(data.weapon && weaponStatsColumns(data.weapon)),
        setId: data.setId,
        icon,
      },
      include: withSet,
    });
  },
  async update(actor, existing, data) {
    await assertCampaignRefs(actor.campaignId, { artifactSet: data.setId });

    const icon = data.icon === undefined ? undefined : data.icon === existing.icon ? data.icon : await persistIcon(actor.campaignId, data.icon, `${existing.id}-${randomUUID()}`);

    return prisma.artifact.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        description: data.description,
        rarity: data.rarity,
        slot: data.slot,
        abilities: data.abilities !== undefined ? abilitiesJson(data.abilities) : undefined,
        ...(data.weapon && weaponStatsColumns(data.weapon)),
        setId: data.setId !== undefined ? data.setId || null : undefined,
        icon: icon === undefined ? undefined : (icon ?? null),
      },
      include: withSet,
    });
  },
  async remove(actor, existing) {
    await prisma.artifact.deleteMany({ where: { id: existing.id, campaignId: actor.campaignId } });
  },
  removeAll: async (actor) => (await prisma.artifact.deleteMany({ where: { campaignId: actor.campaignId } })).count,
});
