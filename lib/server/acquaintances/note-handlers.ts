import { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { saveAcquaintanceNoteSchema } from "@/lib/schemas/acquaintances";
import { withAccess } from "@/lib/server/acquaintances/handlers";
import { ownedAcquaintance, readAcquaintancesEnabled } from "@/lib/server/acquaintances/store";
import { loadPlayedSections } from "@/lib/server/scenario/page-store";
import { isAcquaintanceRevealed } from "@/lib/utils/acquaintances/visibility";
import { errorResponse } from "@/lib/utils/api/api-response";
import { parseBody } from "@/lib/utils/api/parse-body";
import { playedLookup } from "@/lib/utils/scenario/reveal";
import type { AcquaintanceNoteView } from "@/types/acquaintances";

export function saveNoteHandler(req: Request, campaignId: string, acquaintanceId: string) {
  return withAccess(campaignId, "save acquaintance note", async (access) => {
    const body = await parseBody(saveAcquaintanceNoteSchema, req);

    if (body instanceof NextResponse) return body;

    if (!access.isDM && !(await readAcquaintancesEnabled(campaignId))) return errorResponse(API_ERRORS.ACQUAINTANCES_DISABLED, 403);

    const acquaintance = await ownedAcquaintance(campaignId, acquaintanceId);

    if (acquaintance instanceof NextResponse) return acquaintance;

    if (!access.isDM) {
      const played = playedLookup(await loadPlayedSections(campaignId, [acquaintance.sourcePageId]));

      if (!isAcquaintanceRevealed(acquaintance, played)) return errorResponse(API_ERRORS.ACQUAINTANCE_NOT_FOUND, 404);
    }

    const text = body.text.trim();

    if (!text) {
      await prisma.acquaintanceNote.deleteMany({ where: { acquaintanceId, authorUserId: access.userId } });

      return NextResponse.json({ deleted: true });
    }

    const note = await prisma.acquaintanceNote.upsert({
      where: { acquaintanceId_authorUserId: { acquaintanceId, authorUserId: access.userId } },
      create: { acquaintanceId, authorUserId: access.userId, text },
      update: { text },
      include: { author: { select: { displayName: true } } },
    });

    const view: AcquaintanceNoteView = { id: note.id, authorUserId: note.authorUserId, authorName: note.author.displayName, text: note.text, updatedAt: note.updatedAt.toISOString(), own: true };

    return NextResponse.json(view);
  });
}
