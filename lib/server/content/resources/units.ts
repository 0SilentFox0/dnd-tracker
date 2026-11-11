import type { Unit as UnitRow } from "@prisma/client";
import type { z } from "zod";

import "server-only";
import { getCachedUnits } from "@/lib/cache/reference-data";
import { ReferenceKind } from "@/lib/cache/tags";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { createUnitSchema, updateUnitSchema } from "@/lib/schemas";
import { addedIds, assertCampaignRefs } from "@/lib/server/campaigns/campaign-refs";
import { defineResource } from "@/lib/server/content/define-resource";
import { detachRefs } from "@/lib/server/content/detach-refs";
import { toJsonInput } from "@/lib/server/content/errors";
import { assertTraitsSupported } from "@/lib/server/content/traits-guard";
import { abilitiesJson, abilitySpellIds, withAbilityIssues } from "@/lib/utils/abilities/read";
import { parseRules } from "@/lib/utils/rules/schema";
import { ruleSystemOf } from "@/lib/utils/rules/systems/registry";
import type { RuleSystemDefinition } from "@/lib/utils/rules/systems/types";
import { toUnit } from "@/lib/utils/units/to-unit";
import { unitCreateData } from "@/lib/utils/units/unit-create-data";

async function loadCampaignSystem(campaignId: string): Promise<RuleSystemDefinition | null> {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { rules: true } });

  return campaign ? ruleSystemOf(parseRules(campaign.rules)) : null;
}

const keepsCharacteristics = (system: RuleSystemDefinition | null) => !!system?.characteristics.persisted;

export const unitsResource = defineResource<UnitRow, z.infer<typeof createUnitSchema>, z.infer<typeof updateUnitSchema>>({
  kind: "units",
  listFields: ["raceId", "level", "maxHp", "armorClass"],
  idParam: "unitId",
  label: "Units",
  description: "Campaign NPC units and monsters: stats, attacks, abilities, known spells.",
  path: "/units",
  schemas: { create: createUnitSchema, update: updateUnitSchema },
  access: { list: "member", item: "member" },
  invalidates: [ReferenceKind.UNITS],
  notFound: API_ERRORS.NOT_FOUND,
  list: (actor) => getCachedUnits(actor.campaignId),
  find: (actor, id) => prisma.unit.findFirst({ where: { id, campaignId: actor.campaignId } }),
  toItem: (row) => withAbilityIssues("unit", row, toUnit(row)),
  async create(actor, data) {
    await assertCampaignRefs(actor.campaignId, { race: data.raceId, spell: [...(data.knownSpells ?? []), ...(data.spellcasting?.spells ?? []).map((s) => s.spellId), ...abilitySpellIds(data.abilities)] });

    const system = await loadCampaignSystem(actor.campaignId);

    assertTraitsSupported(system, data.abilities);

    const unit = await prisma.unit.create({ data: unitCreateData(actor.campaignId, keepsCharacteristics(system) ? data : { ...data, characteristics: undefined }) });

    return unit;
  },
  async update(actor, existing, data) {
    await assertCampaignRefs(actor.campaignId, { race: data.raceId, spell: [...(addedIds(data.knownSpells, existing.knownSpells) ?? []), ...(data.spellcasting?.spells ?? []).map((s) => s.spellId), ...abilitySpellIds(data.abilities)] });

    const system = await loadCampaignSystem(actor.campaignId);

    assertTraitsSupported(system, data.abilities);

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
        statblock: toJsonInput(data.statblock),
        spellcasting: toJsonInput(data.spellcasting),
        characteristics: keepsCharacteristics(system) ? toJsonInput(data.characteristics) : undefined,
      },
    });

    return unit;
  },
  async remove(actor, existing) {
    await detachRefs(prisma, actor.campaignId, "unit", [existing.id]);
    await prisma.unit.deleteMany({ where: { id: existing.id, campaignId: actor.campaignId } });
  },
  removeAll: async (actor) => {
    await detachRefs(prisma, actor.campaignId, "unit", "all");

    return (await prisma.unit.deleteMany({ where: { campaignId: actor.campaignId } })).count;
  },
});
