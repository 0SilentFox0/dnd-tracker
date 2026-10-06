import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { invalidUnitRace } from "../unit-race";

import { invalidateReference, ReferenceKind } from "@/lib/cache/tags";
import { prisma } from "@/lib/db";
import { updateUnitSchema } from "@/lib/schemas";
import { abilitiesJson, readAbilities } from "@/lib/utils/abilities/read";
import { requireCampaignAccess, requireDM, validateCampaignOwnership } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { toUnit } from "@/lib/utils/units/to-unit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; unitId: string }> }
) {
  try {
    const { id, unitId } = await params;

    const accessResult = await requireCampaignAccess(id, false);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
    });

    const validationError = validateCampaignOwnership(unit, id);

    if (validationError) {
      return validationError;
    }

    const row = unit as NonNullable<typeof unit>;

    const { abilities, issues: abilityIssues } = readAbilities("unit", row);

    return NextResponse.json({ ...toUnit(row), abilities, abilityIssues });
  } catch (error) {
    return handleApiError(error, { action: "fetch unit" });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; unitId: string }> }
) {
  try {
    const { id, unitId } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
    });

    const validationError = validateCampaignOwnership(unit, id);

    if (validationError) {
      return validationError;
    }

    await prisma.unit.delete({
      where: { id: unitId },
    });

    invalidateReference(ReferenceKind.UNITS, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { action: "delete unit" });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; unitId: string }> }
) {
  try {
    const { id, unitId } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
    });

    const validationError = validateCampaignOwnership(unit, id);

    if (validationError) {
      return validationError;
    }

    const data = updateUnitSchema.parse(await request.json());

    const raceError = await invalidUnitRace(id, data.raceId);

    if (raceError) return raceError;

    const updatedUnit = await prisma.unit.update({
      where: { id: unitId },
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
        maxHp: data.maxHp,
        proficiencyBonus: data.proficiencyBonus,
        attacks: data.attacks !== undefined ? (data.attacks as Prisma.InputJsonValue) : undefined,
        abilities: data.abilities !== undefined ? abilitiesJson(data.abilities) : undefined,
        immunities: data.immunities !== undefined ? (data.immunities as Prisma.InputJsonValue) : undefined,
        knownSpells: data.knownSpells !== undefined ? (data.knownSpells as Prisma.InputJsonValue) : undefined,
        minTargets: data.minTargets,
        maxTargets: data.maxTargets,
        avatar: data.avatar,
      },
    });

    invalidateReference(ReferenceKind.UNITS, id);

    return NextResponse.json(toUnit(updatedUnit));
  } catch (error) {
    return handleApiError(error, { action: "update unit" });
  }
}
