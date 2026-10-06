import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { type OwnerKind, readAbilities } from "@/lib/utils/abilities/read";
import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";

async function findOwner(kind: OwnerKind, campaignId: string, id: string) {
  const where = { id, campaignId };

  switch (kind) {
    case "skill":
      return prisma.skill.findFirst({ where });
    case "race":
      return prisma.race.findFirst({ where });
    case "artifact":
      return prisma.artifact.findFirst({ where });
    case "artifactSet":
      return prisma.artifactSet.findFirst({ where });
    case "unit":
      return prisma.unit.findFirst({ where });
  }
}

const KINDS = new Set<OwnerKind>(["skill", "race", "artifact", "artifactSet", "unit"]);

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; kind: string; ownerId: string }> }) {
  try {
    const { id, kind, ownerId } = await params;

    const auth = await requireDM(id);

    if (auth instanceof NextResponse) return auth;

    if (!KINDS.has(kind as OwnerKind)) return NextResponse.json({ error: "Unknown owner kind" }, { status: 400 });

    const row = await findOwner(kind as OwnerKind, id, ownerId);

    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ abilities: readAbilities(kind as OwnerKind, row).abilities });
  } catch (error) {
    return handleApiError(error, { action: "get owner abilities" });
  }
}
