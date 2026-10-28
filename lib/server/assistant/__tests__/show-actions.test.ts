import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { executorDatabase } from "./fixtures/executor-db";

import { SHOW_ACTIONS } from "@/lib/server/assistant/actions/show";
import { SHOW_ACTION_COVERAGE } from "@/lib/server/assistant/actions/show-coverage";
import { createActionCatalog } from "@/lib/server/assistant/catalog";
import { ASSISTANT_ROUTE_COVERAGE, exportedHttpMethods } from "@/lib/server/assistant/coverage";
import { createAssistantExecutor } from "@/lib/server/assistant/execute";
import { confirmationFor } from "@/lib/server/assistant/policy";
import type { AssistantCaller, AssistantWriteAction } from "@/lib/server/assistant/types";
import { prepareShowAction, runShowOperation } from "@/lib/server/show/action-service";

const f = vi.hoisted(() => ({ deck: {} as Record<string, unknown>, show: null as Record<string, unknown> | null, writes: 0, deleted: [] as string[], dm: true }));

vi.mock("@/lib/db", () => ({ prisma: {
  $queryRaw: async () => [{ digest: "tracks" }], aiProposal: { findMany: async () => [] }, assistantReceipt: { findMany: async () => [] },
  campaignMember: { findMany: async () => f.dm ? [{ role: "dm" }] : [] },
  slideDeck: { findMany: async () => [f.deck], findFirst: async () => f.deck, update: async ({ data }: { data: object }) => { f.writes++; Object.assign(f.deck, data);

 return f.deck; } },
  scenarioPage: { findMany: async () => [{ id: "scene", kind: "scene" }] },
  campaignTrack: { findMany: async () => [] }, battleScene: { findMany: async () => [] },
  campaignShow: { findUnique: async () => f.show, updateMany: async ({ where, data }: { where: { seq: number }; data: object }) => { if (f.show?.seq !== where.seq) return { count: 0 };

 Object.assign(f.show, data);

 return { count: 1 }; } },
} }));
vi.mock("@/lib/server/content/write", () => ({ withCampaignContentWrite: async (_id: string, cb: () => unknown) => cb() }));
vi.mock("@/lib/server/show/show-store", async (original) => ({ ...await original<object>(), publishShow: vi.fn() }));
vi.mock("@/lib/supabase/scene-slide-storage", () => ({ ownedSlidePath: (_c: string, url: string) => url.startsWith("https://owned/c/") ? "c/x.webp" : null, removeSlideFiles: async (_c: string, urls: string[]) => { f.deleted.push(...urls); } }));
vi.mock("@/lib/supabase/image-storage", () => ({ isHostedOnProjectStorage: (url: string) => url.startsWith("https://owned/") }));

const caller: AssistantCaller = { actor: { campaignId: "campaign", userId: "dm", isDM: true, via: "session", scopes: null }, channel: "chat", threadId: "thread", tokenId: null, runId: "run" };

const slide = { id: "slide0001", imageUrl: "https://owned/c/x.webp" };

const save = () => ({ deckId: "deck", body: { title: "Deck", slides: [slide], expectedUpdatedAt: new Date(0).toISOString() } });

beforeEach(() => { f.deck = { id: "deck", title: "Deck", campaignId: "campaign", slides: [slide], scenarioPageId: null, updatedAt: new Date(0) }; f.show = { deckId: "deck", deckTitle: "Deck", slide, nextImageUrl: null, audio: null, seq: 19 }; f.writes = 0; f.deleted = []; f.dm = true; });

function externalFixture() {
  const { db, state } = executorDatabase();

  let calls = 0;

  let failFinalize = true;

  const action: AssistantWriteAction = { id: "show.generate", title: "Image", description: "Image", input: z.object({}), need: { access: "dm", scope: "show:write" }, effect: "paid", confirmation: "always",
    prepare: async () => ({ summary: "Image", targets: [], changes: [], warnings: [], effects: [{ kind: "paid", targets: [], description: "Image" }], preconditions: {} }),
    external: async () => { calls++;

 return { url: "https://owned/c/x.webp" }; },
    execute: async (ctx) => { if (failFinalize) throw new Error("after upload");

 state.counter++;

 return { data: ctx.externalResult ?? null, affected: [], warnings: [] }; },
  };

  const executor = createAssistantExecutor({ db, catalog: createActionCatalog([action]) });

  return { db, state, executor, action, calls: () => calls, allowFinalize: () => { failFinalize = false; } };
}

describe("T12 show/media", () => {
  it("all show/deck methods have canonical actions, schemas and acceptance owners", () => {
    const expected = ASSISTANT_ROUTE_COVERAGE.filter(r => r.task === 12).flatMap(r => r.methods.map(m => `${m} ${r.route}`)).sort();

    expect(SHOW_ACTION_COVERAGE.map(r => `${r.method} ${r.route}`).sort()).toEqual(expected);
    for (const row of SHOW_ACTION_COVERAGE) {
      expect(exportedHttpMethods(readFileSync(`app/api/${row.route}/route.ts`, "utf8"))).toContain(row.method);
      expect(SHOW_ACTIONS.some(a => a.id === row.actionId)).toBe(true);
    }
  });
  it("deckUpdatedAtConflictNoOverwrite", async () => { const p = await prepareShowAction(caller, "decks.save", save());

 f.deck.updatedAt = new Date(1); await expect(runShowOperation(caller.actor, "decks.save", save(), p.preconditions)).rejects.toMatchObject({ status: 409 }); expect(f.writes).toBe(0); });
  it("showSeqNeverResets", async () => { const r = await runShowOperation(caller.actor, "command", { body: { action: "end" } });

 expect(r.data).toMatchObject({ show: { seq: 20 } }); expect(f.show?.seq).toBe(20); });
  it("sceneBindingChangeCapturedDespiteSameUpdatedAt", async () => { const p = await prepareShowAction(caller, "decks.save", save());

 f.deck.scenarioPageId = "scene"; await expect(runShowOperation(caller.actor, "decks.save", save(), p.preconditions)).rejects.toMatchObject({ status: 409 }); expect(f.writes).toBe(0); });
  it("generationRequiresExplicitRequest", () => { const a = SHOW_ACTIONS.find(a => a.id === "show.generate") as AssistantWriteAction;

 expect(a.input.safeParse({ body: { prompt: "Image" } }).success).toBe(false); });
  it("oneImagePerRun", async () => { const x = externalFixture();

 const p = await x.executor.dispatchAction(caller, { actionId: x.action.id, input: {}, requestId: "first" });

 if (p.kind !== "pending") throw Error();

 x.allowFinalize(); await x.executor.confirmIntent(caller.actor, p.intent.id);

 const next = await x.executor.dispatchAction(caller, { actionId: x.action.id, input: {}, requestId: "second" });

 if (next.kind !== "pending") throw Error();

 await expect(x.executor.confirmIntent(caller.actor, next.intent.id)).rejects.toMatchObject({ status: 409 }); expect(x.calls()).toBe(1); });
  it("rejectOnlyDeletesOwnedUnusedAsset", async () => { const { discardGeneratedImage } = await import("@/lib/ai/generated-images");

 expect(await discardGeneratedImage("c", "https://foreign/x.webp")).toBe("foreign"); expect(await discardGeneratedImage("c", slide.imageUrl)).toBe("kept"); expect(f.deleted).toEqual([]); });
  it("failureAfterUploadDoesNotRegenerate / crash-after-result", async () => { const x = externalFixture();

 const p = await x.executor.dispatchAction(caller, { actionId: x.action.id, input: {}, requestId: "first" });

 if (p.kind !== "pending") throw Error();

 await expect(x.executor.confirmIntent(caller.actor, p.intent.id)).rejects.toThrow("after upload"); expect(x.calls()).toBe(1); expect(x.state.receipts.get(p.intent.id)?.status).toBe("executing"); x.allowFinalize(); expect(await x.executor.confirmIntent(caller.actor, p.intent.id)).toMatchObject({ status: "applied" }); expect(x.calls()).toBe(1); expect(x.state.counter).toBe(1); });
  it("crash-before-result and cancelled generation never retry charge", async () => { const x = externalFixture();

 x.action.external = async () => { throw new DOMException("cancelled", "AbortError"); };

 const p = await x.executor.dispatchAction(caller, { actionId: x.action.id, input: {}, requestId: "first" });

 if (p.kind !== "pending") throw Error();

 expect(await x.executor.confirmIntent(caller.actor, p.intent.id)).toMatchObject({ status: "unknown", result: null, effectsStatus: "unknown" }); expect(await x.executor.confirmIntent(caller.actor, p.intent.id)).toMatchObject({ status: "unknown" }); expect(x.state.counter).toBe(0); });
  it("cleanup keeps shown/cover/next and pending proposals; removes only unused owned assets", async () => {
    const { runShowMediaCleanup } = await import("@/lib/server/show/media-effects");

    f.deck.slides = [];
    await runShowMediaCleanup({ campaignId: "c", urls: [slide.imageUrl, "https://foreign/x.webp"] });
    expect(f.deleted).toEqual([]);
    f.show = null;
    await runShowMediaCleanup({ campaignId: "c", urls: [slide.imageUrl] });
    expect(f.deleted).toEqual([slide.imageUrl]);
  });
  it("image budget survives publication reconciliation", async () => {
    const x = externalFixture();

 x.allowFinalize();
    x.action.execute = async ctx => { ctx.afterCommit({ key: "event", kind: "publish", payload: {} });

 return { data: ctx.externalResult ?? null, affected: [], warnings: [] }; };

    const p = await x.executor.dispatchAction(caller, { actionId: x.action.id, input: {}, requestId: "one" });

    if (p.kind !== "pending") throw Error();

    await x.executor.confirmIntent(caller.actor, p.intent.id);
    await x.executor.reconcileEffects(caller, p.intent.id);

    const n = await x.executor.dispatchAction(caller, { actionId: x.action.id, input: {}, requestId: "two" });

    if (n.kind !== "pending") throw Error();

    await expect(x.executor.confirmIntent(caller.actor, n.intent.id)).rejects.toMatchObject({ status: 409 });
    expect(x.calls()).toBe(1);
  });
  it("stored signed media URLs never enter results or previews", async () => {
    f.deck.slides = [{ ...slide, imageUrl: "https://owned/c/x.webp?token=SECRET" }];

    const r = await runShowOperation(caller.actor, "decks.get", { deckId: "deck" });

    const p = await prepareShowAction(caller, "decks.save", save());

    expect(JSON.stringify([r, p])).not.toContain("SECRET");
  });
  it("replacing an image under the same slide id requires human review", async () => {
    const input = save();

 input.body.slides = [{ ...slide, imageUrl: "https://owned/c/replacement.webp" }];

    const preview = await prepareShowAction(caller, "decks.save", input);

    expect(confirmationFor(SHOW_ACTIONS.find(a => a.id === "show.decks.save") as AssistantWriteAction, "auto", preview)).toBe("human");
  });
  it("paid adapter without a trusted run identity fails closed", async () => {
    const x = externalFixture();

    await expect(x.executor.dispatchAction({ ...caller, runId: undefined }, { actionId: x.action.id, input: {}, requestId: "no-run" })).rejects.toMatchObject({ status: 409 });
    expect(x.calls()).toBe(0);
  });
  it("revoked membership prevents shared writer", async () => { f.dm = false; await expect(runShowOperation(caller.actor, "command", { body: { action: "end" } })).rejects.toMatchObject({ status: 403 }); expect(f.show?.seq).toBe(19); });
});
