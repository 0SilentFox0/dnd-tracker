import { NextResponse } from "next/server";

import { ACQUAINTANCE_INCLUDE, assertSectionInCampaign, ownedAcquaintance, readAcquaintances, viewAcquaintanceRows } from "./store";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { createAcquaintanceSchema, updateAcquaintanceSchema } from "@/lib/schemas/acquaintances";
import { characterInCampaign } from "@/lib/server/scenario/loaders";
import { type CampaignAccessResult, requireCampaignAccess, requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { loadOwned } from "@/lib/utils/api/load-owned";
import { parseBody } from "@/lib/utils/api/parse-body";

export async function withAccess(campaignId: string, action: string, run: (access: CampaignAccessResult) => Promise<NextResponse>, dmOnly = false) {
  try {
    const access = await (dmOnly ? requireDM(campaignId) : requireCampaignAccess(campaignId));

    return access instanceof NextResponse ? access : await run(access);
  } catch (error) {
    return handleApiError(error, { action });
  }
}

const ownedCharacter = (campaignId: string, characterId: string) =>
  loadOwned(prisma.character.findUnique({ where: { id: characterId }, select: { campaignId: true, name: true } }), campaignId, API_ERRORS.CHARACTER_NOT_FOUND);

async function dmView(campaignId: string, userId: string, row: Parameters<typeof viewAcquaintanceRows>[1][number]) {
  const [view] = await viewAcquaintanceRows(campaignId, [row], { userId, isDM: true });

  return view;
}

export function listAcquaintancesHandler(campaignId: string) {
  return withAccess(campaignId, "list acquaintances", async (access) => {
    const data = await readAcquaintances(campaignId, access);

    if (!access.isDM && !data.enabled) return errorResponse(API_ERRORS.ACQUAINTANCES_DISABLED, 403);

    return NextResponse.json(data);
  });
}

export function createAcquaintanceHandler(req: Request, campaignId: string) {
  return withAccess(
    campaignId,
    "create acquaintance",
    async (access) => {
      const body = await parseBody(createAcquaintanceSchema, req);

      if (body instanceof NextResponse) return body;

      const section = await assertSectionInCampaign(campaignId, body.sourcePageId, body.sourceSectionId);

      if (section) return section;

      if (body.kind === "character" && body.characterId) {
        const character = await ownedCharacter(campaignId, body.characterId);

        if (character instanceof NextResponse) return character;
      }

      const created = await prisma.acquaintance.create({
        data: {
          campaignId,
          kind: body.kind,
          characterId: body.kind === "character" ? (body.characterId ?? null) : null,
          name: body.name,
          description: body.description,
          avatarUrl: body.avatarUrl ?? null,
          sourcePageId: body.sourcePageId,
          sourceSectionId: body.sourceSectionId,
        },
        include: ACQUAINTANCE_INCLUDE,
      });

      return NextResponse.json(await dmView(campaignId, access.userId, created), { status: 201 });
    },
    true,
  );
}

export function updateAcquaintanceHandler(req: Request, campaignId: string, acquaintanceId: string) {
  return withAccess(
    campaignId,
    "update acquaintance",
    async (access) => {
      const body = await parseBody(updateAcquaintanceSchema, req);

      if (body instanceof NextResponse) return body;

      const existing = await ownedAcquaintance(campaignId, acquaintanceId);

      if (existing instanceof NextResponse) return existing;

      if (body.characterId && !(await characterInCampaign(campaignId, body.characterId))) return errorResponse(API_ERRORS.CHARACTER_NOT_FOUND, 404);

      const updated = await prisma.acquaintance.update({ where: { id: acquaintanceId }, data: body, include: ACQUAINTANCE_INCLUDE });

      return NextResponse.json(await dmView(campaignId, access.userId, updated));
    },
    true,
  );
}

export function deleteAcquaintanceHandler(campaignId: string, acquaintanceId: string) {
  return withAccess(
    campaignId,
    "delete acquaintance",
    async () => {
      const existing = await ownedAcquaintance(campaignId, acquaintanceId);

      if (existing instanceof NextResponse) return existing;

      await prisma.acquaintance.delete({ where: { id: acquaintanceId } });

      return NextResponse.json({ success: true });
    },
    true,
  );
}
