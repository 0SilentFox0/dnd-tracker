import { NextResponse } from "next/server";

import { ACTIVE_CHARACTER } from "@/lib/constants/characters";
import { SCENARIO_MENTION_LIMIT } from "@/lib/constants/scenario";
import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import type { MentionOption, MentionType } from "@/types/scenario";

export async function searchMentionsHandler(req: Request, campaignId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 60);

    const args = { where: { campaignId, name: { contains: q, mode: "insensitive" as const } }, select: { id: true, name: true }, orderBy: { name: "asc" as const }, take: SCENARIO_MENTION_LIMIT };

    const [unit, artifact, character, spell, battle, marker] = await Promise.all([
      prisma.unit.findMany(args),
      prisma.artifact.findMany(args),
      prisma.character.findMany({ ...args, where: { ...args.where, ...ACTIVE_CHARACTER } }),
      prisma.spell.findMany(args),
      prisma.battleScene.findMany(args),
      prisma.worldMarker.findMany({ ...args, where: { map: { campaignId }, name: args.where.name } }),
    ]);

    const groups: [MentionType, { id: string; name: string }[]][] = [["unit", unit], ["artifact", artifact], ["character", character], ["spell", spell], ["battle", battle], ["marker", marker]];

    const options: MentionOption[] = groups.flatMap(([type, rows]) => rows.map((r) => ({ type, id: r.id, label: r.name })));

    return NextResponse.json(options);
  } catch (error) {
    return handleApiError(error, { action: "search scenario mentions" });
  }
}
