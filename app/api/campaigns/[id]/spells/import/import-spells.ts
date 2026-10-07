import { NextResponse } from "next/server";

import { buildSpellData, spellSchool } from "./build-spell-data";
import { importSpellsSchema } from "./import-spells-schema";

import { invalidateReference, ReferenceKind } from "@/lib/cache/tags";
import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api/api-auth";
import { parseBody } from "@/lib/utils/api/parse-body";

async function ensureSchoolGroups(campaignId: string, schools: Iterable<string>): Promise<Record<string, string>> {
  const groups: Record<string, string> = {};

  for (const school of schools) {
    const existing = await prisma.spellGroup.findFirst({ where: { campaignId, name: school } });

    groups[school] = existing ? existing.id : (await prisma.spellGroup.create({ data: { campaignId, name: school } })).id;
  }

  return groups;
}

export async function importSpells(request: Request, campaignId: string): Promise<NextResponse> {
  const accessResult = await requireDM(campaignId);

  if (accessResult instanceof NextResponse) return accessResult;

  const data = await parseBody(importSpellsSchema, request);

  if (data instanceof NextResponse) return data;

  const schools = new Set(data.spells.map(spellSchool).filter((s): s is string => !!s));

  const schoolGroups = await ensureSchoolGroups(campaignId, schools);

  const names = data.spells.map((s) => s.name);

  const existing = await prisma.spell.findMany({ where: { campaignId, name: { in: names } }, select: { name: true } });

  const existingNames = new Set(existing.map((s) => s.name));

  const spellsToCreate = data.spells
    .filter((spell) => !existingNames.has(spell.name))
    .map((spell) => buildSpellData(campaignId, spell, schoolGroups, data.groupId));

  const result = spellsToCreate.length > 0 ? await prisma.spell.createMany({ data: spellsToCreate, skipDuplicates: true }) : { count: 0 };

  const createdSpells = await prisma.spell.findMany({
    where: { campaignId, name: { in: names } },
    include: { spellGroup: true },
    orderBy: { level: "asc" },
  });

  invalidateReference(ReferenceKind.SPELLS, campaignId);

  return NextResponse.json({
    success: true,
    imported: result.count,
    total: data.spells.length,
    skipped: data.spells.length - spellsToCreate.length,
    spells: createdSpells,
  });
}
