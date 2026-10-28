import { Prisma, type Unit as UnitRow } from "@prisma/client";
import type { z } from "zod";

import "server-only";
import { getCachedUnits } from "@/lib/cache/reference-data";
import { ReferenceKind } from "@/lib/cache/tags";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { createUnitSchema, updateUnitSchema } from "@/lib/schemas";
import { addedIds, assertCampaignRefs } from "@/lib/server/campaigns/campaign-refs";
import { defineResource } from "@/lib/server/content/define-resource";
import { toJsonInput } from "@/lib/server/content/errors";
import { abilitiesJson, withAbilityIssues } from "@/lib/utils/abilities/read";
import { resolveUnitProficiency } from "@/lib/utils/units/monster";
import { toUnit } from "@/lib/utils/units/to-unit";

export const unitsResource = defineResource<UnitRow, z.infer<typeof createUnitSchema>, z.infer<typeof updateUnitSchema>>({
  kind: "units",
  listFields: ["raceId", "level", "maxHp", "armorClass"],
  idParam: "unitId",
  label: "Юніти",
  description: "NPC-юніти та моби кампанії: стати, атаки, здібності, відомі заклинання.",
  path: "/units",
  schemas: { create: createUnitSchema, update: updateUnitSchema },
  access: { list: "member", item: "member" },
  invalidates: [ReferenceKind.UNITS],
  notFound: API_ERRORS.NOT_FOUND,
  list: (actor) => getCachedUnits(actor.campaignId),
  find: (actor, id) => prisma.unit.findFirst({ where: { id, campaignId: actor.campaignId } }),
  toItem: (row) => withAbilityIssues("unit", row, toUnit(row)),
  async create(actor, data) {
    await assertCampaignRefs(actor.campaignId, { race: data.raceId, spell: data.knownSpells });

    const unit = await prisma.unit.create({
      data: {
        campaignId: actor.campaignId,
        name: data.name,
        raceId: data.raceId ?? null,
        level: data.level,
        strength: data.strength,
        dexterity: data.dexterity,
        constitution: data.constitution,
        intelligence: data.intelligence,
        wisdom: data.wisdom,
        charisma: data.charisma,
        armorClass: data.armorClass,
        initiative: data.initiative,
        speed: data.speed,
        gridSize: data.gridSize,
        maxHp: data.maxHp,
        proficiencyBonus: resolveUnitProficiency(data),
        minTargets: data.minTargets,
        maxTargets: data.maxTargets,
        attacks: data.attacks as Prisma.InputJsonValue,
        ...(data.abilities && { abilities: abilitiesJson(data.abilities) }),
        immunities: data.immunities as Prisma.InputJsonValue,
        knownSpells: data.knownSpells,
        morale: data.morale,
        avatar: data.avatar ?? null,
        cr: data.cr ?? null,
        xp: data.xp ?? null,
        multiattack: data.multiattack,
        legendaryActions: data.legendaryActions,
        legendaryResistances: data.legendaryResistances,
        saveProficiencies: data.saveProficiencies as Prisma.InputJsonValue,
      },
    });

    return unit;
  },
  async update(actor, existing, data) {
    await assertCampaignRefs(actor.campaignId, { race: data.raceId, spell: addedIds(data.knownSpells, existing.knownSpells) });

    const unit = await prisma.unit.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        raceId: data.raceId,
        level: data.level,
        strength: data.strength,
        dexterity: data.dexterity,
        constitution: data.constitution,
        intelligence: data.intelligence,
        wisdom: data.wisdom,
        charisma: data.charisma,
        armorClass: data.armorClass,
        initiative: data.initiative,
        speed: data.speed,
        gridSize: data.gridSize,
        maxHp: data.maxHp,
        proficiencyBonus: data.proficiencyBonus,
        attacks: toJsonInput(data.attacks),
        abilities: data.abilities !== undefined ? abilitiesJson(data.abilities) : undefined,
        immunities: toJsonInput(data.immunities),
        knownSpells: toJsonInput(data.knownSpells),
        morale: data.morale,
        minTargets: data.minTargets,
        maxTargets: data.maxTargets,
        avatar: data.avatar,
        cr: data.cr,
        xp: data.xp,
        multiattack: data.multiattack,
        legendaryActions: data.legendaryActions,
        legendaryResistances: data.legendaryResistances,
        saveProficiencies: toJsonInput(data.saveProficiencies),
      },
    });

    return unit;
  },
  async remove(actor, existing) {
    await prisma.unit.deleteMany({ where: { id: existing.id, campaignId: actor.campaignId } });
  },
  removeAll: async (actor) => (await prisma.unit.deleteMany({ where: { campaignId: actor.campaignId } })).count,
});
