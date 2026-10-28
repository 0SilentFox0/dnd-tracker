import { Prisma, type Spell as SpellRow } from "@prisma/client";

import "server-only";
import { getCachedSpells } from "@/lib/cache/reference-data";
import { ReferenceKind } from "@/lib/cache/tags";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { listSpellsQuerySchema } from "@/lib/schemas";
import { type CreateSpellInput, createSpellSchema, type UpdateSpellInput,updateSpellSchema } from "@/lib/schemas";
import { assertCampaignRefs } from "@/lib/server/campaigns/campaign-refs";
import { defineResource } from "@/lib/server/content/define-resource";
import { parseInput, toJsonInput } from "@/lib/server/content/errors";
import { loadBookSpellsByIds } from "@/lib/server/spells/book-spells-by-ids";
import { spellDefinitionColumns } from "@/lib/utils/spells/model/read";

const withGroup = { spellGroup: true } as const;

export const spellsResource = defineResource<SpellRow, CreateSpellInput, UpdateSpellInput>({
  kind: "spells",
  idParam: "spellId",
  label: "Заклинання",
  description: "Заклинання кампанії: рівень, школа, ціль, кидок, ефекти, візуальний ефект (fx).",
  path: "/spells",
  schemas: { create: createSpellSchema, update: updateSpellSchema, query: listSpellsQuerySchema },
  access: { list: "member", item: "member" },
  invalidates: [ReferenceKind.SPELLS],
  notFound: API_ERRORS.NOT_FOUND,
  async list(actor, query) {
    const { ids } = parseInput(listSpellsQuerySchema, Object.fromEntries(query), API_ERRORS.INVALID_QUERY);

    return ids ? loadBookSpellsByIds(actor.campaignId, ids) : getCachedSpells(actor.campaignId);
  },
  find: (actor, id, purpose) => prisma.spell.findFirst({ where: { id, campaignId: actor.campaignId }, ...(purpose === "read" && { include: withGroup }) }),
  create: async (actor, data) => {
    await assertCampaignRefs(actor.campaignId, { spellGroup: data.groupId });

    return prisma.spell.create({
      data: {
        campaignId: actor.campaignId,
        name: data.name,
        level: data.level,
        groupId: data.groupId || null,
        icon: data.icon || null,
        description: data.description ?? null,
        appearanceDescription: data.appearanceDescription ?? null,
        fx: data.fx ?? undefined,
        // legacy NOT NULL columns until a later migration; the new model never reads them
        type: "target",
        damageType: "damage",
        ...spellDefinitionColumns({ dice: data.dice, cost: data.cost, targeting: data.targeting, resolution: data.resolution, effects: data.spellEffects, raceModifiers: data.raceModifiers, stackable: data.stackable, maxStacks: data.maxStacks ?? undefined }),
      },
      include: withGroup,
    });
  },
  update: async (actor, existing, data) => {
    await assertCampaignRefs(actor.campaignId, { spellGroup: data.groupId });

    return prisma.spell.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        level: data.level,
        groupId: data.groupId,
        icon: data.icon !== undefined ? data.icon || null : undefined,
        description: data.description,
        appearanceDescription: data.appearanceDescription,
        dice: data.dice,
        cost: data.cost,
        targeting: toJsonInput(data.targeting),
        resolution: toJsonInput(data.resolution),
        spellEffects: toJsonInput(data.spellEffects),
        raceModifiers: toJsonInput(data.raceModifiers),
        stackable: data.stackable,
        maxStacks: data.stackable === false ? null : data.maxStacks,
        fx: data.fx === null ? Prisma.DbNull : toJsonInput(data.fx),
      },
      include: withGroup,
    });
  },
  async remove(actor, existing) {
    await prisma.spell.deleteMany({ where: { id: existing.id, campaignId: actor.campaignId } });
  },
  removeAll: async (actor) => (await prisma.spell.deleteMany({ where: { campaignId: actor.campaignId } })).count,
});
