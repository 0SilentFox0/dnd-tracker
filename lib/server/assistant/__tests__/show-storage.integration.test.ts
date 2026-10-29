import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { SHOW_ACTIONS } from "@/lib/server/assistant/actions/show";
import { createActionCatalog } from "@/lib/server/assistant/catalog";
import { createAssistantExecutor } from "@/lib/server/assistant/execute";
import type { AssistantCaller, AssistantWriteAction } from "@/lib/server/assistant/types";
import { currentContentWrite } from "@/lib/server/content/write-context";
import { runShowOperation } from "@/lib/server/show/action-service";
import { isLocalDevDatabaseEnv, singleConnectionDatabaseUrl } from "@/lib/server/test-support/local-db";

const generation = vi.hoisted(() => ({ run: undefined as (() => Promise<{ url: string }>) | undefined }));

vi.mock("@/lib/ai/images", () => ({ generateSlideImage: () => { if (!generation.run) throw Error("UNEXPECTED_PROVIDER");

 return generation.run(); } }));
vi.mock("@/lib/pusher/server", () => ({ pusherServer: {} }));
vi.mock("@/lib/utils/api/rate-limit", () => ({ BATTLE_RATE_LIMITS: { show: {} }, checkRateLimit: async () => ({ allowed: true }) }));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/supabase/scene-slide-storage", () => ({ ensureSlidesBucket: async () => ({ ok: true }), removeSlideFiles: () => { throw Error("UNEXPECTED_STORAGE_DELETE"); } }));
vi.mock("@/lib/utils/common/image-url", async (original) => ({ ...await original<object>(), isHostedOnProjectStorage: (url: string) => url === "https://example.invalid/mirrored.webp" }));
vi.mock("@/lib/supabase/image-storage", () => ({
  resolveImageForPersistence: async () => {
    expect(currentContentWrite()).toBeUndefined();
    expect(await db.assistantReceipt.count({ where: { campaignId, status: "unknown" } })).toBeGreaterThan(0);

    return { ok: true, value: "https://example.invalid/mirrored.webp" };
  },
}));

const database = vi.hoisted(() => ({ client: undefined as PrismaClient | undefined }));

vi.mock("@/lib/db", async () => {
  const { createScopedDatabase } = await import("@/lib/server/content/write-context");

  const base = new Proxy({} as PrismaClient, {
    get(_target, property) {
      if (!database.client) throw new Error("FIXTURE_DATABASE_NOT_READY");

      const value = Reflect.get(database.client, property);

      return typeof value === "function" ? value.bind(database.client) : value;
    }
  });

  return { prisma: createScopedDatabase(base) };
});

const localUrl = (name: "DATABASE_URL" | "DIRECT_URL") => singleConnectionDatabaseUrl(name);

const databaseUrl = localUrl("DATABASE_URL");

localUrl("DIRECT_URL");

const db = new PrismaClient({ datasources: { db: { url: databaseUrl } }, log: [] });

database.client = db;


const marker = `stage6-show-${randomUUID()}`;

const userId = marker;

let campaignId: string;

let threadId: string;

let deckId: string;

let failReceipt = false;

const actor = () => ({ campaignId, userId, isDM: true, via: "session", scopes: null } as const);

const caller = (runId?: string): AssistantCaller => ({ actor: actor(), channel: "chat", threadId, tokenId: null, runId, locale: "uk" as const });

const published = vi.fn();

const faultDb = new Proxy(db, { get(target, key) {
  if (key === "$transaction") return (callback: (tx: unknown) => unknown, options: unknown) => target.$transaction(async tx => callback(new Proxy(tx, { get(transaction, property) {
    if (property === "assistantReceipt" && failReceipt) return new Proxy(transaction.assistantReceipt, { get(delegate, method) {
      if (method === "create") return async () => { await transaction.$executeRawUnsafe("SELECT 1 / 0"); };

      return Reflect.get(delegate, method);
    } });

    const value = Reflect.get(transaction, property);

    return typeof value === "function" ? value.bind(transaction) : value;
  } })), options as never);

  const value = Reflect.get(target, key);

  return typeof value === "function" ? value.bind(target) : value;
} });

const executor = (actions = SHOW_ACTIONS) => createAssistantExecutor({ db: faultDb, catalog: createActionCatalog(actions), effects: { publish: async payload => {
  expect(await db.assistantReceipt.count({ where: { campaignId, status: "applied" } })).toBeGreaterThan(0);
  published(payload);
} } });

const pending = async (operation: string, input: unknown, requestId: string, runId?: string) => {
  const p = await executor().dispatchAction(caller(runId), { actionId: `show.${operation}`, input, requestId });

  if (p.kind !== "pending") throw Error("EXPECTED_REVIEW");

  return p.intent.id;
};

const slide = { id: "slide0001", imageUrl: "https://example.invalid/public.webp" };

describe.skipIf(!isLocalDevDatabaseEnv())("T12 real constructor single connection", () => {
  beforeAll(async () => {
    await db.user.create({ data: { id: userId, email: `${marker}@example.invalid`, displayName: marker } });
    campaignId = (await db.campaign.create({ data: { name: marker, dmUserId: userId, inviteCode: randomUUID(), members: { create: { userId, role: "dm" } } } })).id;
    threadId = (await db.aiThread.create({ data: { campaignId, userId, title: marker, provider: "anthropic", model: "synthetic", mode: "scenario" } })).id;
    deckId = (await db.slideDeck.create({ data: { campaignId, title: marker, slides: [slide] } })).id;
  });
  afterAll(async () => {
    if (campaignId) {
      const row = await db.campaign.findUniqueOrThrow({ where: { id: campaignId }, include: { members: true } });

      if (row.name !== marker || row.dmUserId !== userId || row.members.some(m => m.userId !== userId)) throw Error("FIXTURE_OWNERSHIP_MISMATCH");

      await db.campaign.delete({ where: { id: campaignId } });
      await db.assistantReceipt.deleteMany({ where: { campaignId, userId } });
    }

    const row = await db.user.findUnique({ where: { id: userId } });

    if (row?.email !== `${marker}@example.invalid`) throw Error("FIXTURE_USER_MISMATCH");

    await db.user.delete({ where: { id: userId } });
    await db.$disconnect();
  });
  it("show save and receipt roll back together; repeat seq/publication once", async () => {
    const id = await pending("command", { body: { action: "open", deckId } }, "open");

    failReceipt = true;
    await expect(executor().confirmIntent(actor(), id)).rejects.toThrow();
    failReceipt = false;
    expect(await db.campaignShow.findUnique({ where: { campaignId } })).toBeNull();
    expect(await db.assistantReceipt.count({ where: { intentId: id } })).toBe(0);

    const result = await executor().confirmIntent(actor(), id);

    expect(result).toMatchObject({ status: "applied", result: { data: { show: { seq: 1 } } } });
    expect(await executor().confirmIntent(actor(), id)).toEqual(result);
    expect(published).toHaveBeenCalledTimes(1);
  });
  it("binding preserves updatedAt but stales save; audio/show seq also stales", async () => {
    const deck = await db.slideDeck.findUniqueOrThrow({ where: { id: deckId } });

    const id = await pending("decks.save", { deckId, body: { title: marker, slides: [slide], expectedUpdatedAt: deck.updatedAt.toISOString() } }, "bind-stale");

    const scene = await db.scenarioPage.create({ data: { campaignId, kind: "scene", title: marker } });

    await runShowOperation(actor(), "decks.scene", { deckId, body: { scenarioPageId: scene.id } });
    expect((await db.slideDeck.findUniqueOrThrow({ where: { id: deckId } })).updatedAt).toEqual(deck.updatedAt);
    await expect(executor().confirmIntent(actor(), id)).rejects.toMatchObject({ status: 409 });

    const seqIntent = await pending("command", { body: { action: "end" } }, "seq-stale");

    await db.campaignShow.update({ where: { campaignId }, data: { seq: { increment: 1 } } });
    await expect(executor().confirmIntent(actor(), seqIntent)).rejects.toMatchObject({ status: 409 });
  });
  it("deck copy finalizes persisted result; CRUD, slide order and audio keep current semantics", async () => {
    const deck = await db.slideDeck.findUniqueOrThrow({ where: { id: deckId } });

    const id = await pending("decks.save", { deckId, body: { title: "Copied", slides: [slide, { id: "slide0002", imageUrl: "https://external.invalid/new.webp" }], expectedUpdatedAt: deck.updatedAt.toISOString() } }, "copy");

    const saved = await executor().confirmIntent(actor(), id);

    expect(saved).toMatchObject({ status: "applied", result: { data: { slides: [slide, { id: "slide0002", imageUrl: "https://example.invalid/mirrored.webp" }] } } });
    expect(await executor().confirmIntent(actor(), id)).toEqual(saved);

    const track = await db.campaignTrack.create({ data: { campaignId, title: marker, kind: "youtube", youtubeId: "dQw4w9WgXcQ" } });

    const audio = await pending("command", { body: { action: "audio", command: { action: "play", trackId: track.id } } }, "audio");

    expect(await executor().confirmIntent(actor(), audio)).toMatchObject({ status: "applied", result: { data: { show: { audio: { trackId: track.id, seq: 1 } } } } });

    const created = await pending("decks.create", { body: { title: "New fixture" } }, "new-deck");

    const r = await executor().confirmIntent(actor(), created);

    const createdId = (r.result?.data as { id: string }).id;

    expect(await runShowOperation(actor(), "decks.get", { deckId: createdId })).toMatchObject({ data: { title: "New fixture", slides: [] } });

    const deleted = await pending("decks.delete", { deckId: createdId }, "delete-deck");

    await executor().confirmIntent(actor(), deleted);
    await executor().confirmIntent(actor(), deleted);
    expect(await db.slideDeck.findUnique({ where: { id: createdId } })).toBeNull();
  });
  it("external started/result durable outside tx; crash-after-result finalizes once without regeneration", async () => {
    const id = await pending("generate", { explicitRequest: true, body: { prompt: "Synthetic test", provider: "openai", model: "gpt-image-2", aspect: "16:9", useCampaignStyle: false } }, "generate", "trusted-run");

    let calls = 0;

    generation.run = async () => {
      calls++;
      expect(currentContentWrite()).toBeUndefined();
      expect(await db.assistantReceipt.findUnique({ where: { intentId: id } })).toMatchObject({ status: "unknown", effects: { external: { phase: "started" } } });

      return { url: "https://example.invalid/generated.webp" };
    };

    const original = SHOW_ACTIONS.find(a => a.id === "show.generate") as AssistantWriteAction;

    const crash = executor(SHOW_ACTIONS.map(a => a.id === original.id ? { ...original, execute: async () => { throw Error("CRASH_AFTER_RESULT"); } } : a));

    await expect(crash.confirmIntent(actor(), id)).rejects.toThrow("CRASH_AFTER_RESULT");
    expect(await db.assistantReceipt.findUnique({ where: { intentId: id } })).toMatchObject({ status: "executing", effects: { external: { phase: "result" } } });
    expect(await executor().confirmIntent(actor(), id)).toMatchObject({ status: "applied", result: { data: { url: "https://example.invalid/generated.webp" } } });
    expect(calls).toBe(1);
  });
  it("crash-before-result remains unknown after process recreation and never repeats charge", async () => {
    const id = await pending("generate", { explicitRequest: true, body: { prompt: "Synthetic unknown", provider: "openai", model: "gpt-image-2", aspect: "16:9", useCampaignStyle: false } }, "unknown", "trusted-run-2");

    let calls = 0;

    generation.run = async () => { calls++; throw Error("UNKNOWN_PROVIDER_OUTCOME"); };
    expect(await executor().confirmIntent(actor(), id)).toMatchObject({ status: "unknown", result: null, effectsStatus: "unknown" });
    expect(await executor().confirmIntent(actor(), id)).toMatchObject({ status: "unknown" });
    expect(calls).toBe(1);
  });
});
