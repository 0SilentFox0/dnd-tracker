import type { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { loadOwnedPage } from "@/lib/server/scenario/loaders";
import { loadPlayedSections, OWNED_WITH_CONTENT_SELECT, readContentStrict } from "@/lib/server/scenario/page-store";
import { type AcquaintanceRecord, viewAcquaintances } from "@/lib/utils/acquaintances/visibility";
import { errorResponse } from "@/lib/utils/api/api-response";
import { loadOwned } from "@/lib/utils/api/load-owned";
import { playedLookup } from "@/lib/utils/scenario/reveal";
import type { AcquaintancesResponse, AcquaintanceView } from "@/types/acquaintances";

// players only ever see their own note, so other authors' texts never leave the DB for them
export const acquaintanceInclude = (viewer?: { userId: string; isDM: boolean }) =>
  ({
    character: { select: { name: true, avatar: true } },
    entries: true,
    notes: { ...(viewer && !viewer.isDM && { where: { authorUserId: viewer.userId } }), include: { author: { select: { displayName: true } } } },
  }) satisfies Prisma.AcquaintanceInclude;

export const ACQUAINTANCE_INCLUDE = acquaintanceInclude();

const OWNED_SELECT = { id: true, campaignId: true, kind: true, characterId: true, sourcePageId: true, sourceSectionId: true } as const;

export interface AcquaintanceViewer {
  userId: string;
  isDM: boolean;
}

export async function readAcquaintancesEnabled(campaignId: string): Promise<boolean> {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { acquaintancesEnabled: true } });

  return !!campaign?.acquaintancesEnabled;
}

async function playedFor(campaignId: string, rows: AcquaintanceRecord[]) {
  const pageIds = new Set(rows.flatMap((r) => [r.sourcePageId, ...r.entries.map((e) => e.pageId)]));

  return playedLookup(await loadPlayedSections(campaignId, [...pageIds]));
}

export async function viewAcquaintanceRows(campaignId: string, rows: AcquaintanceRecord[], viewer: AcquaintanceViewer): Promise<AcquaintanceView[]> {
  return viewAcquaintances(rows, viewer, await playedFor(campaignId, rows));
}

export async function readAcquaintances(campaignId: string, viewer: AcquaintanceViewer): Promise<AcquaintancesResponse> {
  const enabled = await readAcquaintancesEnabled(campaignId);

  if (!viewer.isDM && !enabled) return { isDM: false, enabled, items: [] };

  const rows = await prisma.acquaintance.findMany({ where: { campaignId }, include: acquaintanceInclude(viewer) });

  return { isDM: viewer.isDM, enabled, items: await viewAcquaintanceRows(campaignId, rows, viewer) };
}

export async function assertSectionInCampaign(campaignId: string, pageId: string, sectionId: string): Promise<NextResponse | null> {
  const page = await loadOwnedPage(campaignId, pageId, OWNED_WITH_CONTENT_SELECT);

  if (!("content" in page)) return page;

  return readContentStrict(page.content).sections.some((s) => s.id === sectionId) ? null : errorResponse(API_ERRORS.SCENARIO_SECTION_NOT_FOUND, 404);
}

export const ownedAcquaintance = (campaignId: string, id: string) =>
  loadOwned(prisma.acquaintance.findUnique({ where: { id }, select: OWNED_SELECT }), campaignId, API_ERRORS.ACQUAINTANCE_NOT_FOUND);
