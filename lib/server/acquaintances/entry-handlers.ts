import { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { createAcquaintanceEntrySchema, updateAcquaintanceEntrySchema } from "@/lib/schemas/acquaintances";
import { assertSectionInCampaign, ownedAcquaintance } from "@/lib/server/acquaintances/store";
import { loadPlayedSections } from "@/lib/server/scenario/page-store";
import { errorResponse } from "@/lib/utils/api/api-response";
import { withAccess } from "@/lib/utils/api/as-dm";
import { parseBody } from "@/lib/utils/api/parse-body";
import { playedLookup } from "@/lib/utils/scenario/reveal";
import type { AcquaintanceEntryView } from "@/types/acquaintances";

type EntryRow = { id: string; pageId: string; sectionId: string; text: string; sortOrder: number };

async function toEntryView(campaignId: string, e: EntryRow): Promise<AcquaintanceEntryView> {
  const played = playedLookup(await loadPlayedSections(campaignId, [e.pageId]));

  return { id: e.id, pageId: e.pageId, sectionId: e.sectionId, text: e.text, sortOrder: e.sortOrder, hidden: !played(e.pageId, e.sectionId) };
}

async function ownedEntry(campaignId: string, acquaintanceId: string, entryId: string) {
  const parent = await ownedAcquaintance(campaignId, acquaintanceId);

  if (parent instanceof NextResponse) return parent;

  const entry = await prisma.acquaintanceEntry.findUnique({ where: { id: entryId } });

  return entry && entry.acquaintanceId === acquaintanceId ? entry : errorResponse(API_ERRORS.ACQUAINTANCE_ENTRY_NOT_FOUND, 404);
}

export function createEntryHandler(req: Request, campaignId: string, acquaintanceId: string) {
  return withAccess(
    campaignId,
    "create acquaintance entry",
    async () => {
      const body = await parseBody(createAcquaintanceEntrySchema, req);

      if (body instanceof NextResponse) return body;

      const parent = await ownedAcquaintance(campaignId, acquaintanceId);

      if (parent instanceof NextResponse) return parent;

      const section = await assertSectionInCampaign(campaignId, body.pageId, body.sectionId);

      if (section) return section;

      const { _max } = await prisma.acquaintanceEntry.aggregate({ where: { acquaintanceId }, _max: { sortOrder: true } });

      const created = await prisma.acquaintanceEntry.create({ data: { acquaintanceId, ...body, sortOrder: (_max.sortOrder ?? -1) + 1 } });

      return NextResponse.json(await toEntryView(campaignId, created), { status: 201 });
    },
    true,
  );
}

export function updateEntryHandler(req: Request, campaignId: string, acquaintanceId: string, entryId: string) {
  return withAccess(
    campaignId,
    "update acquaintance entry",
    async () => {
      const body = await parseBody(updateAcquaintanceEntrySchema, req);

      if (body instanceof NextResponse) return body;

      const entry = await ownedEntry(campaignId, acquaintanceId, entryId);

      if (entry instanceof NextResponse) return entry;

      const updated = await prisma.acquaintanceEntry.update({ where: { id: entryId }, data: body });

      return NextResponse.json(await toEntryView(campaignId, updated));
    },
    true,
  );
}

export function deleteEntryHandler(campaignId: string, acquaintanceId: string, entryId: string) {
  return withAccess(
    campaignId,
    "delete acquaintance entry",
    async () => {
      const entry = await ownedEntry(campaignId, acquaintanceId, entryId);

      if (entry instanceof NextResponse) return entry;

      await prisma.acquaintanceEntry.delete({ where: { id: entryId } });

      return NextResponse.json({ success: true });
    },
    true,
  );
}
