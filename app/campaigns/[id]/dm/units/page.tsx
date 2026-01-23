import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

import { DMUnitsPageClient } from "./page-client";

import { getAuthUser } from "@/lib/auth";
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

  const user = await getAuthUser();

  const userId = user.id;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      members: {
        where: { userId },
      },
    },
  });

  if (!campaign || campaign.members[0]?.role !== "dm") {
    redirect(`/campaigns/${id}`);
  }

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
