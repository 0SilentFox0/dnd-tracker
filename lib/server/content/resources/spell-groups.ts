import type { SpellGroup as SpellGroupRow } from "@prisma/client";
import type { z } from "zod";

import "server-only";
import { ReferenceKind } from "@/lib/cache/tags";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { createSpellGroupSchema, updateSpellGroupSchema } from "@/lib/schemas";
import { defineResource } from "@/lib/server/content/define-resource";

export const spellGroupsResource = defineResource<SpellGroupRow, z.infer<typeof createSpellGroupSchema>, z.infer<typeof updateSpellGroupSchema>>({
  kind: "spell-groups",
  idParam: "groupId",
  label: "Школи магії",
  description: "Групи (школи) заклинань: назва, колір, іконка.",
  path: "/spells/groups",
  schemas: { create: createSpellGroupSchema, update: updateSpellGroupSchema },
  access: { list: "member", item: "member" },
  invalidates: [ReferenceKind.SPELLS],
  notFound: API_ERRORS.NOT_FOUND,
  list: (actor) => prisma.spellGroup.findMany({ where: { campaignId: actor.campaignId }, orderBy: { name: "asc" } }),
  find: (actor, id) => prisma.spellGroup.findFirst({ where: { id, campaignId: actor.campaignId } }),
  create: (actor, data) => prisma.spellGroup.create({ data: { campaignId: actor.campaignId, name: data.name, color: data.color ?? null, icon: data.icon ?? null } }),
  update: (_actor, existing, data) => prisma.spellGroup.update({ where: { id: existing.id }, data: { name: data.name, color: data.color, icon: data.icon } }),
  async remove(actor, existing) {
    // spells of the group stay: onDelete SetNull
    await prisma.spellGroup.deleteMany({ where: { id: existing.id, campaignId: actor.campaignId } });
  },
});
