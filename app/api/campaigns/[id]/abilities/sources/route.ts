import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import { operationRoute } from "@/lib/utils/api/content-routes";

export const GET = operationRoute(CONTENT_OPERATIONS["abilities.sources"], async ({ actor }) => {
  const where = { campaignId: actor.campaignId };

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
});
