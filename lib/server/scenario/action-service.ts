import { characterInCampaign } from "./loaders";
import { searchScenarioMentions } from "./mentions";
import { contentWrite, listPages, OWNED_WITH_CONTENT_SELECT, readContent, readContentStrict, SUMMARY_SELECT, toPage, toSummary } from "./page-store";
import { searchScenarioPages } from "./search";
import { pruneVersions, snapshotIfDue } from "./versions";

import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { SCENARIO_MAX_CONTENT_BYTES, SCENARIO_MAX_VERSIONS } from "@/lib/constants/scenario";
import { prisma } from "@/lib/db";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/translator";
import { createScenarioPageSchema, scenarioContentSchema, scenarioSectionPatchSchema, updateScenarioMetaSchema } from "@/lib/schemas/scenario";
import { notifyRevealForContentChange } from "@/lib/server/acquaintances/reveal";
import { stampDigest } from "@/lib/server/assistant/digest";
import { actionResult, requestDigest } from "@/lib/server/assistant/json";
import { resultLabel } from "@/lib/server/assistant/result-labels";
import type { ActionResult } from "@/lib/server/assistant/types";
import { assertCan } from "@/lib/server/content/access";
import { ContentError, parseInput } from "@/lib/server/content/errors";
import { withCampaignContentWrite } from "@/lib/server/content/write";
import { afterContentCommit } from "@/lib/server/content/write-context";
import type { Actor } from "@/lib/utils/api/actor";
import { localeOrRequest } from "@/lib/utils/api/translate-error";
import { buildDefaultLegend } from "@/lib/utils/scenario/default-legend";
import { moveRow, moveSection, newSection, removeRow, removeSection, updateSection } from "@/lib/utils/scenario/structure";
import type { ScenarioContent } from "@/types/scenario";

export const scenarioFingerprint = requestDigest;

export const scenarioResult = (data: unknown, id = "all", locale: Locale = DEFAULT_LOCALE): ActionResult => actionResult("scenario", resultLabel(locale, "scenario"))(data, id);
export async function scenarioState(actor: Actor, id?: string) {
  const where = { campaignId: actor.campaignId };

  const page = id ? await prisma.scenarioPage.findFirst({ where: { id, ...where }, select: OWNED_WITH_CONTENT_SELECT }) : undefined;

  if (id && !page) throw new ContentError(API_ERRORS.SCENARIO_NOT_FOUND, 404);

  // Bindings and metadata are dependencies even when page.version did not change.
  const [pages, decks, battles, characters] = await Promise.all([
    stampDigest(prisma, "ScenarioPage", where, { version: true }),
    stampDigest(prisma, "SlideDeck", where),
    prisma.battleScene.findMany({ where, select: { id: true }, orderBy: { id: "asc" } }),
    prisma.character.findMany({ where, select: { id: true }, orderBy: { id: "asc" } }),
  ]);

  return { page, pages, decks, battles, characters };
}
export function transformScenarioContent(content: ScenarioContent, operation: string, input: { sectionId: string; rowId?: string; direction?: -1 | 1; played?: boolean; revealed?: boolean }): ScenarioContent {
  const section = content.sections.find(s => s.id === input.sectionId);

  if (!section) throw new ContentError(API_ERRORS.SCENARIO_SECTION_NOT_FOUND, 404);

  if (operation.startsWith("row.") && !section.rows.some(r => r.id === input.rowId)) throw new ContentError(API_ERRORS.ASSISTANT_ROW_NOT_FOUND, 404);

  if (operation === "section.delete") return removeSection(content, input.sectionId);

  const direction = () => {
    if (input.direction !== 1 && input.direction !== -1) throw new ContentError(API_ERRORS.INVALID_BODY, 400);

    return input.direction;
  };

  const rowId = () => {
    if (!input.rowId) throw new ContentError(API_ERRORS.ASSISTANT_ROW_NOT_FOUND, 404);

    return input.rowId;
  };

  if (operation === "section.move") return moveSection(content, input.sectionId, direction());

  if (operation === "row.delete") return removeRow(content, input.sectionId, rowId());

  if (operation === "row.move") return moveRow(content, input.sectionId, rowId(), direction());

  if (operation === "section.patch") {
    const patch = parseInput(scenarioSectionPatchSchema, input);

    return updateSection(content, input.sectionId, { ...(patch.played !== undefined && { played: patch.played }), ...(patch.revealed !== undefined && { revealedAt: patch.revealed ? new Date().toISOString() : null }) });
  }

  throw new ContentError(API_ERRORS.ASSISTANT_UNKNOWN_SCENARIO_ACTION, 400);
}

async function validateBindings(actor: Actor, content: ScenarioContent) {
  for (const section of content.sections) {
    if (section.reveal?.mode === "afterSection") {
      const page = await prisma.scenarioPage.findFirst({ where: { campaignId: actor.campaignId, id: section.reveal.pageId }, select: { content: true } });

      if (!page || !readContentStrict(page.content).sections.some(s => s.id === (section.reveal as { sectionId: string }).sectionId)) throw new ContentError(API_ERRORS.ASSISTANT_OPEN_SECTION_UNAVAILABLE, 422);
    }

    for (const row of section.rows) {
      if (row.battleId && !await prisma.battleScene.findFirst({ where: { id: row.battleId, campaignId: actor.campaignId }, select: { id: true } })) throw new ContentError(API_ERRORS.BATTLE_UNAVAILABLE, 422);

      if (row.slide) {
        const deck = await prisma.slideDeck.findFirst({ where: { id: row.slide.deckId, campaignId: actor.campaignId }, select: { slides: true } });

        if (!deck || !Array.isArray(deck.slides) || !deck.slides.some(s => s && typeof s === "object" && "id" in s && s.id === row.slide!.slideId)) throw new ContentError(API_ERRORS.SCENARIO_SLIDE_UNAVAILABLE, 422);
      }
    }
  }
}

async function writeScenarioContent(actor: Actor, id: string, raw: unknown, expectedVersion: number, force = true) {
  const content = parseInput(scenarioContentSchema, raw);

  if (Buffer.byteLength(JSON.stringify(content)) > SCENARIO_MAX_CONTENT_BYTES) throw new ContentError(API_ERRORS.SCENARIO_TOO_LARGE, 413);

  const page = await prisma.scenarioPage.findFirst({ where: { id, campaignId: actor.campaignId }, select: OWNED_WITH_CONTENT_SELECT });

  if (!page) throw new ContentError(API_ERRORS.SCENARIO_NOT_FOUND, 404);

  if (page.version !== expectedVersion) throw new ContentError(API_ERRORS.SCENARIO_CONFLICT, 409);

  await validateBindings(actor, content);

  if (await snapshotIfDue(prisma, id, actor.userId, { force })) await pruneVersions(prisma, id);

  const changed = await prisma.scenarioPage.updateMany({ where: { id, campaignId: actor.campaignId, version: expectedVersion }, data: { ...contentWrite(page.title, content), version: { increment: 1 } } });

  if (!changed.count) throw new ContentError(API_ERRORS.SCENARIO_CONFLICT, 409);

  await notifyRevealForContentChange(actor.campaignId, id, readContent(page.content), content);

  return toPage({ ...page, content, version: expectedVersion + 1, updatedAt: new Date() });
}

export async function saveScenarioContent(actor: Actor, id: string, raw: unknown, expectedVersion: number, force = true) {
  assertCan(actor, { access: "dm", scope: "scenario:write" });

  return withCampaignContentWrite(actor.campaignId, () => writeScenarioContent(actor, id, raw, expectedVersion, force));
}
type ScenarioRun = {
  actor: Actor;
  input: Record<string, unknown>;
  locale: Locale;
  id: string | undefined;
  page: NonNullable<Awaited<ReturnType<typeof scenarioState>>["page"]>;
  result: (data: unknown, id?: string) => ActionResult;
};

type PageHandler = (run: ScenarioRun) => Promise<ActionResult>;

const characterOk = async (actor: Actor, characterId: string | null | undefined) => {
  if (!await characterInCampaign(actor.campaignId, characterId)) throw new ContentError(API_ERRORS.SCENARIO_CHARACTER_INVALID, 400);
};

async function createPage({ actor, input, locale, result }: Omit<ScenarioRun, "page" | "id">): Promise<ActionResult> {
  const body = parseInput(createScenarioPageSchema, input.data);

  await characterOk(actor, body.characterId);

  const content: ScenarioContent = { legend: body.kind === "scene" ? buildDefaultLegend(await getTranslator(locale, "scenario")) : [], sections: [newSection((await getTranslator(locale, "assistant"))(body.kind === "hero" ? "defaults.firstChapter" : "defaults.firstSection"))] };

  const last = await prisma.scenarioPage.aggregate({ where: { campaignId: actor.campaignId }, _max: { sortOrder: true } });

  return result(toSummary(await prisma.scenarioPage.create({ data: { ...body, campaignId: actor.campaignId, sortOrder: (last._max.sortOrder ?? -1) + 1, ...contentWrite(body.title, content) }, select: SUMMARY_SELECT })));
}

async function deletePage({ actor, page, id, result }: ScenarioRun): Promise<ActionResult> {
  const { pendingSlideUrls, discardSlideFiles } = await import("@/lib/ai/proposal-media");

  const orphanUrls = await pendingSlideUrls(actor.campaignId, page.id);

  afterContentCommit(() => discardSlideFiles(actor.campaignId, orphanUrls));
  await prisma.scenarioPage.delete({ where: { id: page.id } });
  await prisma.compendiumEntry.deleteMany({ where: { campaignId: actor.campaignId, kind: "scenarioPages", localId: page.id } });

  return result({ deleted: true }, id);
}

async function saveContent(run: ScenarioRun, operation: string): Promise<ActionResult> {
  const { actor, input, page, id, result } = run;

  let next: unknown = input.content;

  if (operation === "restore") {
    const version = await prisma.scenarioPageVersion.findFirst({ where: { id: String(input.versionId), pageId: page.id } });

    if (!version) throw new ContentError(API_ERRORS.SCENARIO_VERSION_NOT_FOUND, 404);

    next = readContentStrict(version.content);
  } else if (operation !== "save") next = transformScenarioContent(readContentStrict(page.content), operation, input as Parameters<typeof transformScenarioContent>[2]);

  return result(await saveScenarioContent(actor, page.id, next, page.version), id);
}

const PAGE_HANDLERS: Record<string, PageHandler> = {
  meta: async ({ actor, input, page, id, result }) => {
    const body = parseInput(updateScenarioMetaSchema, input.patch);

    await characterOk(actor, body.characterId);

    return result(toSummary(await prisma.scenarioPage.update({ where: { id: page.id }, data: { ...body, ...contentWrite(body.title ?? page.title, readContentStrict(page.content)) }, select: SUMMARY_SELECT })), id);
  },
  delete: deletePage,
};

type ReadHandler = (actor: Actor, input: Record<string, unknown>) => Promise<unknown>;

const READ_HANDLERS: Record<string, ReadHandler> = {
  list: (actor) => listPages(actor.campaignId),
  mentions: (actor, input) => searchScenarioMentions(actor.campaignId, String(input.query ?? "").trim().slice(0, 60)),
  search: (actor, input) => searchScenarioPages(actor.campaignId, String(input.query).trim().slice(0, 200)),
};

const READ_OPERATIONS = new Set([...Object.keys(READ_HANDLERS), "get", "versions"]);

export async function runScenarioOperation(actor: Actor, operation: string, input: Record<string, unknown>, expected?: string, explicitLocale?: Locale): Promise<ActionResult> {
  const locale = await localeOrRequest(explicitLocale);

  const result = (data: unknown, id?: string) => scenarioResult(data, id, locale);

  assertCan(actor, { access: "dm", scope: READ_OPERATIONS.has(operation) ? "scenario:read" : "scenario:write" });

  const id = input.id as string | undefined;

  if (Object.hasOwn(READ_HANDLERS, operation)) return result(await READ_HANDLERS[operation](actor, input));

  return withCampaignContentWrite(actor.campaignId, async () => {
    const state = expected ? await scenarioState(actor, id) : { page: id ? await prisma.scenarioPage.findFirst({ where: { id, campaignId: actor.campaignId }, select: OWNED_WITH_CONTENT_SELECT }) : undefined };

    if (expected && scenarioFingerprint(state) !== expected) throw new ContentError(API_ERRORS.SCENARIO_CONFLICT, 409);

    const page = state.page;

    if (operation === "get") {
      if (!page) throw new ContentError(API_ERRORS.SCENARIO_NOT_FOUND, 404);

      return result(toPage(page), id);
    }

    if (operation === "versions") {
      if (!page) throw new ContentError(API_ERRORS.SCENARIO_NOT_FOUND, 404);

      return result(await prisma.scenarioPageVersion.findMany({ where: { pageId: page.id }, select: { id: true, createdAt: true, createdBy: true }, orderBy: { createdAt: "desc" }, take: SCENARIO_MAX_VERSIONS }), id);
    }

    if (operation === "create") return createPage({ actor, input, locale, result });

    if (!page) throw new ContentError(API_ERRORS.SCENARIO_NOT_FOUND, 404);

    const run: ScenarioRun = { actor, input, locale, id, page, result };

    return Object.hasOwn(PAGE_HANDLERS, operation) ? PAGE_HANDLERS[operation](run) : saveContent(run, operation);
  });
}
