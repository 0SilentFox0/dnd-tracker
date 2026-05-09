import { Prisma } from "@prisma/client";

import { DMUnitsPageClient } from "./page-client";

import { requireCampaignDM } from "@/lib/campaigns/access";
import { prisma } from "@/lib/db";
import type { Unit } from "@/types/units";

function transformPrismaUnitToUnit(
  unit: Prisma.UnitGetPayload<{ include: { unitGroup: true } }>
): Unit {
  return {
    ...unit,
    attacks: Array.isArray(unit.attacks)
      ? (unit.attacks as Unit["attacks"])
      : [],
    specialAbilities: Array.isArray(unit.specialAbilities)
      ? (unit.specialAbilities as Unit["specialAbilities"])
      : [],
    immunities: Array.isArray(unit.immunities)
      ? (unit.immunities as string[])
      : [],
    knownSpells: Array.isArray(unit.knownSpells)
      ? (unit.knownSpells as string[])
      : [],
    unitGroup: unit.unitGroup
      ? {
          id: unit.unitGroup.id,
          name: unit.unitGroup.name,
          color: unit.unitGroup.color,
          damageModifier: unit.unitGroup.damageModifier,
        }
      : null,
  };
}

export default async function DMUnitsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  await requireCampaignDM(id);

  const unitsData = await prisma.unit.findMany({
    where: {
      campaignId: id,
    },
    include: {
      unitGroup: true,
    },
    orderBy: {
      level: "asc",
    },
  });

  const units: Unit[] = unitsData.map(transformPrismaUnitToUnit);

  return <DMUnitsPageClient campaignId={id} initialUnits={units} />;
}
