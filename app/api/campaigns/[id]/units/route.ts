import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { invalidUnitRace } from "./unit-race";

import { getCachedUnits } from "@/lib/cache/reference-data";
import { invalidateReference, ReferenceKind } from "@/lib/cache/tags";
import { prisma } from "@/lib/db";
import { createUnitSchema } from "@/lib/schemas";
import { abilitiesJson } from "@/lib/utils/abilities/read";
import { requireCampaignAccess, requireDM } from "@/lib/utils/api/api-auth";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/utils/api/cache-headers";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { getProficiencyBonus } from "@/lib/utils/common/calculations";
import { toUnit } from "@/lib/utils/units/to-unit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const data = createUnitSchema.parse(await request.json());

    const raceError = await invalidUnitRace(id, data.raceId);

    if (raceError) return raceError;

    const unit = await prisma.unit.create({
      data: {
        campaignId: id,
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
        maxHp: data.maxHp,
        proficiencyBonus: data.proficiencyBonus || getProficiencyBonus(data.level),
        minTargets: data.minTargets,
        maxTargets: data.maxTargets,
        attacks: data.attacks as Prisma.InputJsonValue,
        ...(data.abilities && { abilities: abilitiesJson(data.abilities) }),
        immunities: data.immunities as Prisma.InputJsonValue,
        knownSpells: data.knownSpells,
        morale: data.morale,
        avatar: data.avatar ?? null,
      },
    });

    invalidateReference(ReferenceKind.UNITS, id);

    return NextResponse.json(toUnit(unit), { status: 201 });
  } catch (error) {
    return handleApiError(error, { action: "create unit" });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const accessResult = await requireCampaignAccess(id, false);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const units = await getCachedUnits(id);

    return NextResponse.json(units, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error) {
    return handleApiError(error, { action: "list units" });
  }
}
