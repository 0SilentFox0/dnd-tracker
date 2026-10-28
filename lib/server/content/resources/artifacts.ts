import type { Artifact as ArtifactRow, Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import type { z } from "zod";

import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { ArmorModifierType, ArtifactSlot, ItemModifierType } from "@/lib/constants/artifacts";
import { prisma } from "@/lib/db";
import { createArtifactSchema, patchArtifactSchema } from "@/lib/schemas/artifacts";
import { persistIcon } from "@/lib/server/artifacts/persist-icon";
import { readArtifactsList } from "@/lib/server/artifacts/read-artifacts-list";
import { assertCampaignRefs } from "@/lib/server/campaigns/campaign-refs";
import { defineResource } from "@/lib/server/content/define-resource";
import { ContentError } from "@/lib/server/content/errors";
import { abilitiesJson, withAbilityIssues } from "@/lib/utils/abilities/read";
import { type ArmorStats, armorStatsColumns } from "@/lib/utils/artifacts/armor-stats";
import { type WeaponStats, weaponStatsColumns } from "@/lib/utils/artifacts/weapon-stats";
import { type ItemStats, itemStatsColumns } from "@/lib/utils/items/item-stats";

const ARMOR_TYPES = new Set<string>(Object.values(ArmorModifierType));

const withoutArmorModifiers = (modifiers: unknown) => (Array.isArray(modifiers) ? modifiers : []).filter((m) => !(m && typeof m === "object" && ARMOR_TYPES.has((m as { type?: string }).type ?? "")));

const isItemRecord = (m: unknown) => !!m && typeof m === "object" && (m as { type?: string }).type === ItemModifierType.STATS;

const itemRecordsOf = (modifiers: unknown) => (Array.isArray(modifiers) ? modifiers : []).filter(isItemRecord);

// weapon/armor replace their own records as before; the item record survives unless `item` is sent
function nextModifiers(existing: unknown, data: { weapon?: WeaponStats; armor?: ArmorStats | null; item?: ItemStats | null }, dropArmor: boolean): unknown[] | undefined {
  if (!data.weapon && !data.armor && data.item === undefined && !dropArmor) return undefined;

  const base = data.armor
    ? armorStatsColumns(data.armor).modifiers
    : data.weapon
      ? weaponStatsColumns(data.weapon).modifiers
      : (dropArmor ? withoutArmorModifiers(existing) : Array.isArray(existing) ? existing : []).filter((m) => !isItemRecord(m));

  const item = data.item === undefined ? itemRecordsOf(existing) : data.item ? itemStatsColumns(data.item).modifiers : [];

  return [...base, ...item];
}

const withSet = { artifactSet: true } as const;

export const artifactsResource = defineResource<ArtifactRow, z.infer<typeof createArtifactSchema>, z.infer<typeof patchArtifactSchema>>({
  kind: "artifacts",
  listFields: ["slot", "rarity", "setId"],
  idParam: "artifactId",
  label: "Артефакти",
  description: "Артефакти: слот, рідкість, сет, зброя (damageBonus — +N до шкоди цією зброєю), броня 5e (armor — лише слот armor), предмет 5e (item: unique, property з appliesTo/nameTemplate, attunement, charges, consumable і spells), бонуси (здібності).",
  path: "/artifacts",
  schemas: { create: createArtifactSchema, update: patchArtifactSchema },
  errors: [422],
  access: { list: "member", item: "dm" },
  invalidates: [],
  notFound: API_ERRORS.NOT_FOUND,
  list: (actor) => readArtifactsList(actor.campaignId),
  find: (actor, id, purpose) => prisma.artifact.findFirst({ where: { id, campaignId: actor.campaignId }, ...(purpose === "read" && { include: withSet }) }),
  toItem: (row) => withAbilityIssues("artifact", row),
  prepareCreate: async (actor, data) => data.icon === undefined ? data : { ...data, icon: await persistIcon(actor.campaignId, data.icon, randomUUID()) },
  prepareUpdate: async (actor, existing, data) => data.icon === undefined || data.icon === existing.icon ? data : { ...data, icon: await persistIcon(actor.campaignId, data.icon, existing.id) },
  async create(actor, data) {
    await assertCampaignRefs(actor.campaignId, { artifactSet: data.setId, spell: data.item?.spells?.map(({ spellId }) => spellId) });

    const icon = data.icon !== undefined ? await persistIcon(actor.campaignId, data.icon, randomUUID()) : undefined;

    return prisma.artifact.create({
      data: {
        campaignId: actor.campaignId,
        name: data.name,
        description: data.description,
        rarity: data.rarity,
        slot: data.slot,
        ...(data.abilities && { abilities: abilitiesJson(data.abilities) }),
        ...(data.weapon && { bonuses: weaponStatsColumns(data.weapon).bonuses }),
        ...((data.weapon || data.armor || data.item) && { modifiers: nextModifiers([], data, false) as Prisma.InputJsonValue }),
        setId: data.setId,
        icon,
      },
      include: withSet,
    });
  },
  async update(actor, existing, data) {
    if (data.armor && (data.slot ?? existing.slot) !== ArtifactSlot.ARMOR) throw new ContentError(API_ERRORS.ARMOR_SLOT_ONLY, 400);

    await assertCampaignRefs(actor.campaignId, { artifactSet: data.setId, spell: data.item?.spells?.map(({ spellId }) => spellId) });

    const icon = data.icon === undefined ? undefined : data.icon === existing.icon ? data.icon : await persistIcon(actor.campaignId, data.icon, `${existing.id}-${randomUUID()}`);

    const dropArmor = data.armor === null || (data.slot !== undefined && data.slot !== ArtifactSlot.ARMOR);

    const modifiers = nextModifiers(existing.modifiers, data, dropArmor);

    return prisma.artifact.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        description: data.description,
        rarity: data.rarity,
        slot: data.slot,
        abilities: data.abilities !== undefined ? abilitiesJson(data.abilities) : undefined,
        ...(data.weapon && { bonuses: weaponStatsColumns(data.weapon).bonuses }),
        ...(modifiers && { modifiers: modifiers as Prisma.InputJsonValue }),
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
