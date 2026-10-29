import type { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

import { discardSlideFiles, slideUrls } from "./proposal-media";

import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { SCENARIO_MAX_CONTENT_BYTES } from "@/lib/constants/scenario";
import { DECK_TITLE_MAX, MAX_DECKS_PER_CAMPAIGN, MAX_SLIDES_PER_DECK } from "@/lib/constants/show";
import { prisma } from "@/lib/db";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/translator";
import { scenarioContentSchema } from "@/lib/schemas/scenario";
import { slidesSchema } from "@/lib/schemas/show";
import { createAcquaintance, findAcquaintancesByNames } from "@/lib/server/acquaintances/service";
import { chatCaller } from "@/lib/server/assistant/caller";
import { legacyPreview, reconcileLegacyProposal } from "@/lib/server/assistant/legacy-proposals";
import { withCampaignContentWrite } from "@/lib/server/content/write";
import { afterContentCommit } from "@/lib/server/content/write-context";
import { scenarioResult } from "@/lib/server/scenario/action-service";
import { contentWrite, OWNED_WITH_CONTENT_SELECT, readContentStrict, toPage } from "@/lib/server/scenario/page-store";
import { pruneVersions, snapshotIfDue } from "@/lib/server/scenario/versions";
import { toSlideDeck } from "@/lib/server/show/deck-store";
import { requestDigest } from "@/lib/utils/battle/store/stable-json";
import { applyAiOps } from "@/lib/utils/scenario/ai-ops";
import { acquaintanceMentionIds, hasRefPlaceholder, sectionOfMention, substituteRefs } from "@/lib/utils/scenario/ai-refs";
import type { AddSlideAiOp, AiProposal, AiProposalOp, AiProposalStatus, ScenarioAiOp } from "@/types/ai";
import type { ScenarioPage } from "@/types/scenario";
import type { SlideDeck } from "@/types/show";

const SELECT = { id: true, pageId: true, threadId: true, summary: true, ops: true, status: true, appliedVersion: true, createdAt: true } as const;

type Row = Prisma.AiProposalGetPayload<{ select: typeof SELECT }>;

const toProposal = (r: Row): AiProposal => ({ ...r, ops: r.ops as unknown as AiProposalOp[], status: r.status as AiProposalStatus, createdAt: r.createdAt.toISOString() });

export async function createProposal(ctx: { campaignId: string; threadId: string | null }, pageId: string, summary: string, ops: AiProposalOp[]): Promise<AiProposal> {
  const row = await prisma.aiProposal.create({ data: { campaignId: ctx.campaignId, threadId: ctx.threadId, pageId, summary, ops: ops as unknown as Prisma.InputJsonValue }, select: SELECT });

  return toProposal(row);
}

export async function listProposals(campaignId: string, filter: { pageId?: string; status?: AiProposalStatus }): Promise<AiProposal[]> {
  const rows = await prisma.aiProposal.findMany({ where: { campaignId, ...filter }, select: SELECT, orderBy: { createdAt: "desc" }, take: 50 });

  return rows.map(toProposal);
}

export async function listProposalSummaries(campaignId: string, filter: { pageId?: string; status?: AiProposalStatus }): Promise<Pick<AiProposal, "id" | "status">[]> {
  return prisma.aiProposal.findMany({ where: { campaignId, ...filter }, select: { id: true, status: true }, orderBy: { createdAt: "desc" }, take: 50 }) as Promise<Pick<AiProposal, "id" | "status">[]>;
}

type ApplyResult = { ok: true; page: ScenarioPage } | { ok: true; deck: SlideDeck } | { ok: false; status: 400 | 403 | 404 | 409 | 413; error: string };

export async function applyProposal(campaignId: string, userId: string, proposalId: string, executingIntentId?: string, locale: Locale = DEFAULT_LOCALE): Promise<ApplyResult> {
  return withCampaignContentWrite(campaignId, async (tx): Promise<ApplyResult> => {
    const proposal = await tx.aiProposal.findFirst({ where: { id: proposalId, campaignId }, select: SELECT });

    if (!proposal) return { ok: false, status: 404, error: API_ERRORS.AI_PROPOSAL_NOT_FOUND };

    if (proposal.status !== "pending") return { ok: false, status: 409, error: API_ERRORS.AI_PROPOSAL_DONE };

    const linked = await tx.assistantIntent.findUnique({ where: { legacyProposalId: proposalId } });

    if (linked && !executingIntentId) {
      if (linked.userId !== userId || linked.status !== "pending" || linked.expiresAt <= new Date()) return { ok: false, status: 409, error: API_ERRORS.AI_PROPOSAL_DONE };

      const fresh = await legacyPreview(chatCaller(campaignId, userId, null, locale), proposalId);

      if (requestDigest(fresh.preconditions) !== requestDigest(linked.expected)) {
        await tx.aiProposal.update({ where: { id: proposalId }, data: { status: "stale" } });
        await reconcileLegacyProposal(tx, campaignId, proposalId, "stale");

        return { ok: false, status: 409, error: API_ERRORS.AI_PROPOSAL_STALE };
      }
    }

    const claimed = await tx.aiProposal.updateMany({ where: { id: proposalId, campaignId, status: "pending" }, data: { status: "applied" } });

    if (claimed.count === 0) return { ok: false, status: 409, error: API_ERRORS.AI_PROPOSAL_DONE };

    const result = await applyClaimed(tx, campaignId, userId, proposal, locale);

    if (result.ok) {
      await reconcileLegacyProposal(tx, campaignId, proposalId, "applied", scenarioResult("page" in result ? { page: result.page } : { deck: result.deck }, undefined, locale), executingIntentId);

      return result;
    }

    if ("settled" in result) {
      await reconcileLegacyProposal(tx, campaignId, proposalId, result.settled);

      const { settled: _settled, ...failure } = result;

      return failure;
    }

    await tx.aiProposal.updateMany({ where: { id: proposalId }, data: { status: "pending" } });

    return result;
  });
}

// a failure with `settled` has already persisted its terminal status; any other failure hands the claim back
type Settled = Extract<ApplyResult, { ok: false }> & { settled: "stale" | "rejected" };

async function settle(tx: Tx, proposalId: string, settled: Settled["settled"], status: Settled["status"], error: string): Promise<Settled> {
  await tx.aiProposal.update({ where: { id: proposalId }, data: { status: settled } });

  return { ok: false, status, error, settled };
}

async function applyClaimed(tx: Tx, campaignId: string, userId: string, proposal: Row, locale: Locale): Promise<ApplyResult | Settled> {
  const proposalId = proposal.id;

  const ops = proposal.ops as unknown as AiProposalOp[];

  const slideOps = ops.filter((o): o is AddSlideAiOp => o.op === "addSlide");

  if (slideOps.length > 0) return slideOps.length === ops.length ? applySlideOps(tx, campaignId, proposal, slideOps, locale) : { ok: false, status: 400, error: API_ERRORS.AI_PROPOSAL_INVALID };

  const page = await tx.scenarioPage.findFirst({ where: { id: proposal.pageId, campaignId }, select: OWNED_WITH_CONTENT_SELECT });

  if (!page) return { ok: false, status: 404, error: API_ERRORS.SCENARIO_NOT_FOUND };

  const scenarioOps = ops as ScenarioAiOp[];

  const newcomers = scenarioOps.filter((o): o is Extract<ScenarioAiOp, { op: "createAcquaintance" }> => o.op === "createAcquaintance");

  if (newcomers.length > 0) {
    const campaign = await tx.campaign.findUnique({ where: { id: campaignId }, select: { acquaintancesEnabled: true } });

    if (!campaign?.acquaintancesEnabled) return { ok: false, status: 403, error: API_ERRORS.ACQUAINTANCES_DISABLED };
  }

  const content = readContentStrict(page.content);

  let applied = applyAiOps(content, scenarioOps);

  if (!applied.ok) return settle(tx, proposalId, "stale", 409, API_ERRORS.AI_PROPOSAL_STALE);

  const ids = new Map<string, string>();

  const byName = await findAcquaintancesByNames(tx, campaignId, newcomers.map((n) => n.name));

  const created: { id: string; name: string; description: string }[] = [];

  for (const n of newcomers) {
    const key = n.name.trim().toLowerCase();

    const existing = byName.get(key);

    const id = existing ?? randomUUID();

    byName.set(key, id);
    ids.set(n.ref, id);

    if (!existing) created.push({ id, name: n.name.trim(), description: n.description });
  }

  const finalOps = newcomers.length > 0 ? substituteRefs(scenarioOps, ids) : scenarioOps;

  if (hasRefPlaceholder(finalOps)) return settle(tx, proposalId, "rejected", 400, API_ERRORS.AI_PROPOSAL_INVALID);

  const foreign = acquaintanceMentionIds(finalOps).filter((id) => !created.some((c) => c.id === id));

  if (foreign.length > 0 && (await tx.acquaintance.count({ where: { campaignId, id: { in: foreign } } })) !== foreign.length) return { ok: false, status: 404, error: API_ERRORS.ACQUAINTANCE_NOT_FOUND };

  if (newcomers.length > 0) applied = applyAiOps(content, finalOps);

  if (!applied.ok) return settle(tx, proposalId, "stale", 409, API_ERRORS.AI_PROPOSAL_STALE);

  if (!scenarioContentSchema.safeParse(applied.content).success) return { ok: false, status: 400, error: API_ERRORS.AI_PROPOSAL_INVALID };

  if (Buffer.byteLength(JSON.stringify(applied.content)) > SCENARIO_MAX_CONTENT_BYTES) return { ok: false, status: 413, error: API_ERRORS.SCENARIO_TOO_LARGE };

  const sources = new Map(created.map((n) => [n.id, sectionOfMention(finalOps, n.id) ?? applied.content.sections[0]?.id]));

  if ([...sources.values()].some((v) => !v)) return { ok: false, status: 400, error: API_ERRORS.AI_PROPOSAL_INVALID };

  await snapshotIfDue(tx, page.id, userId, { force: true });
  await pruneVersions(tx, page.id);

  const { count } = await tx.scenarioPage.updateMany({ where: { id: page.id, version: page.version }, data: { ...contentWrite(page.title, applied.content), version: { increment: 1 } } });

  if (count === 0) return { ok: false, status: 409, error: API_ERRORS.SCENARIO_CONFLICT };

  for (const n of created) await createAcquaintance(tx, campaignId, { id: n.id, kind: "micro", name: n.name, description: n.description, sourcePageId: page.id, sourceSectionId: sources.get(n.id) as string });

  await tx.aiProposal.update({ where: { id: proposalId }, data: { status: "applied", appliedVersion: page.version + 1 } });

  return { ok: true, page: toPage({ ...page, content: applied.content, version: page.version + 1, updatedAt: new Date() }) };
}

type Tx = Prisma.TransactionClient;

async function applySlideOps(tx: Tx, campaignId: string, proposal: Pick<Row, "id" | "pageId">, ops: AddSlideAiOp[], locale: Locale): Promise<ApplyResult | Settled> {
  const stale = () => settle(tx, proposal.id, "stale", 409, API_ERRORS.AI_PROPOSAL_STALE_DECK);

  const slides = ops.map((o) => o.slide);

  let deck = null;

  const deckId = ops[0].deckId;

  if (deckId) {
    deck = await tx.slideDeck.findFirst({ where: { id: deckId, campaignId } });

    if (!deck) return stale();
  } else {
    const page = await tx.scenarioPage.findFirst({ where: { id: proposal.pageId, campaignId }, select: { title: true } });

    if (!page) return { ok: false, status: 404, error: API_ERRORS.SCENARIO_NOT_FOUND };

    const existing = await tx.slideDeck.aggregate({ where: { campaignId }, _count: true, _max: { sortOrder: true } });

    if (existing._count >= MAX_DECKS_PER_CAMPAIGN) return { ok: false, status: 409, error: API_ERRORS.DECK_LIMIT };

    deck = await tx.slideDeck.create({ data: { campaignId, title: page.title.slice(0, DECK_TITLE_MAX) || (await getTranslator(locale, "scenario"))("pageKinds.scene"), scenarioPageId: proposal.pageId, sortOrder: (existing._max.sortOrder ?? -1) + 1 } });
  }

  const stored = slidesSchema.safeParse(deck.slides);

  if (!stored.success) return { ok: false, status: 409, error: API_ERRORS.DECK_CORRUPT };

  const merged = [...stored.data, ...slides];

  if (merged.length > MAX_SLIDES_PER_DECK) return { ok: false, status: 409, error: API_ERRORS.DECK_SLIDES_LIMIT };

  const { count } = await tx.slideDeck.updateMany({ where: { id: deck.id, updatedAt: deck.updatedAt }, data: { slides: merged as unknown as Prisma.InputJsonValue } });

  if (count === 0) return { ok: false, status: 409, error: API_ERRORS.DECK_CONFLICT };

  await tx.aiProposal.update({ where: { id: proposal.id }, data: { status: "applied" } });

  return { ok: true, deck: toSlideDeck(await tx.slideDeck.findUniqueOrThrow({ where: { id: deck.id } })) };
}

export { discardSlideFiles, pendingSlideUrls } from "./proposal-media";

export async function rejectProposal(campaignId: string, proposalId: string): Promise<AiProposal | null> {
  return withCampaignContentWrite(campaignId, async (tx) => {
  const { count } = await tx.aiProposal.updateMany({ where: { id: proposalId, campaignId, status: { in: ["pending", "stale"] } }, data: { status: "rejected" } });

  if (count === 0) return null;

  const row = await tx.aiProposal.findUnique({ where: { id: proposalId }, select: SELECT });

  await reconcileLegacyProposal(tx, campaignId, proposalId, "rejected");

  if (row) afterContentCommit(() => discardSlideFiles(campaignId, slideUrls(row.ops as unknown as AiProposalOp[])));

  return row && toProposal(row);
  });
}
