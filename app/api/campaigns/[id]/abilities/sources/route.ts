import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const auth = await requireDM(id);

    if (auth instanceof NextResponse) return auth;

    const where = { campaignId: id };

    const select = { id: true, name: true } as const;

    const [skills, races, artifacts, sets, units] = await Promise.all([
      prisma.skill.findMany({ where, select }),
      prisma.race.findMany({ where, select }),
      prisma.artifact.findMany({ where, select }),
      prisma.artifactSet.findMany({ where, select }),
      prisma.unit.findMany({ where, select }),
    ]);

    const tag = (kind: string, rows: { id: string; name: string }[]) => rows.map((r) => ({ kind, id: r.id, name: r.name })).sort((a, b) => a.name.localeCompare(b.name, "uk"));

    return NextResponse.json({ sources: [...tag("skill", skills), ...tag("race", races), ...tag("artifact", artifacts), ...tag("artifactSet", sets), ...tag("unit", units)] });
  } catch (error) {
    return handleApiError(error, { action: "list ability sources" });
  }
}
