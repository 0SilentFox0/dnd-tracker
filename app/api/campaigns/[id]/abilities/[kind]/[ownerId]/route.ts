import { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import { OwnerKind, readAbilities } from "@/lib/utils/abilities/read";
import { errorResponse } from "@/lib/utils/api/api-response";
import { operationRoute } from "@/lib/utils/api/content-routes";

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

export const GET = operationRoute(CONTENT_OPERATIONS["abilities.get"], async ({ actor, params: { kind, ownerId } }) => {
  if (!KINDS.has(kind as OwnerKind)) return errorResponse(API_ERRORS.UNKNOWN_OWNER_KIND, 400);

  const row = await findOwner(kind as OwnerKind, actor.campaignId, ownerId);

  if (!row) return errorResponse(API_ERRORS.NOT_FOUND, 404);

  return NextResponse.json({ abilities: readAbilities(kind as OwnerKind, row).abilities });
});
