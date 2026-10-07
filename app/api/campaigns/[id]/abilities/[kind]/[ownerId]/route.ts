import { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { OwnerKind, readAbilities } from "@/lib/utils/abilities/read";
import { requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";

async function findOwner(kind: OwnerKind, campaignId: string, id: string) {
  const where = { id, campaignId };

  switch (kind) {
    case OwnerKind.SKILL:
      return prisma.skill.findFirst({ where });
    case OwnerKind.RACE:
      return prisma.race.findFirst({ where });
    case OwnerKind.ARTIFACT:
      return prisma.artifact.findFirst({ where });
    case OwnerKind.ARTIFACT_SET:
      return prisma.artifactSet.findFirst({ where });
    case OwnerKind.UNIT:
      return prisma.unit.findFirst({ where });
  }
}

const KINDS = new Set<OwnerKind>(Object.values(OwnerKind));

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; kind: string; ownerId: string }> }) {
  try {
    const { id, kind, ownerId } = await params;

    const auth = await requireDM(id);

    if (auth instanceof NextResponse) return auth;

    if (!KINDS.has(kind as OwnerKind)) return errorResponse(API_ERRORS.UNKNOWN_OWNER_KIND, 400);

    const row = await findOwner(kind as OwnerKind, id, ownerId);

    if (!row) return errorResponse(API_ERRORS.NOT_FOUND, 404);

    return NextResponse.json({ abilities: readAbilities(kind as OwnerKind, row).abilities });
  } catch (error) {
    return handleApiError(error, { action: "get owner abilities" });
  }
}
