import { Prisma, PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

import { runToolResult } from "@/lib/ai/tools/define";
import { prisma } from "@/lib/db";
import { CONTENT_ACTIONS } from "@/lib/server/assistant/actions/content";
import { CONTENT_EFFECT_HANDLERS } from "@/lib/server/assistant/actions/content-effects";
import { createActionCatalog } from "@/lib/server/assistant/catalog";
import { createAssistantExecutor } from "@/lib/server/assistant/execute";
import { assertConstructorDatabaseUrls } from "@/lib/server/assistant/test-support";
import type { ActionExecutionContext, AssistantCaller } from "@/lib/server/assistant/types";
import { ContentError } from "@/lib/server/content/errors";
import { DEFAULT_IMPORT_DEPS } from "@/lib/server/content/import/import-content";
import { runContentOperation } from "@/lib/server/content/operation-service";
import { CONTENT_RESOURCES } from "@/lib/server/content/resources";
import { createContent, updateContent } from "@/lib/server/content/service";
import { runContentWriteContext } from "@/lib/server/content/write-context";
import { getSourceDiff } from "@/lib/server/templates/sync/service";

const database = vi.hoisted(() => ({ client: undefined as PrismaClient | undefined }));

const routeAuth = vi.hoisted(() => ({ userId: "" }));

vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: async () => ({ userId: routeAuth.userId }), requireCampaignAccess: async () => ({ userId: routeAuth.userId, isDM: true }) }));
vi.mock("@/lib/db", async () => {
  const { createScopedDatabase } = await import("@/lib/server/content/write-context");

  const base = new Proxy({} as PrismaClient, { get(_target, key) {
    if (!database.client) throw new Error("FIXTURE_DATABASE_NOT_READY");

    const value = Reflect.get(database.client, key);

    return typeof value === "function" ? value.bind(database.client) : value;
  } });

  return { prisma: createScopedDatabase(base) };
});

assertConstructorDatabaseUrls({ DATABASE_URL: process.env.DATABASE_URL, DIRECT_URL: process.env.DIRECT_URL });

function localUrl(name: string): string {
  const url = new URL(process.env[name] ?? "");

  if (!["postgres:", "postgresql:"].includes(url.protocol) || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.port !== "54322" || url.pathname !== "/constructor") throw new Error("ASSISTANT_TEST_REQUIRES_LOCAL_CONSTRUCTOR");

  url.searchParams.set("connection_limit", "1");

  return url.toString();
}

// Validate BOTH URLs before constructing clients or performing fixture writes.
const databaseUrl = localUrl("DATABASE_URL");

localUrl("DIRECT_URL");
process.env.DATABASE_URL = databaseUrl;
process.env.DIRECT_URL = localUrl("DIRECT_URL");

const db = new PrismaClient({ datasources: { db: { url: databaseUrl } }, log: [] });

database.client = db;

const marker = `stage6-content-${randomUUID()}`;

const userId = marker;

let campaignId: string;

let threadId: string;

let ready = false;

const actor = () => ({ campaignId, userId, isDM: true, via: "session", scopes: null } as const);

const caller = (): AssistantCaller => ({ actor: actor(), channel: "chat", tokenId: null, threadId });

describe("content adapters real constructor, connection_limit=1", () => {
  beforeAll(async () => {
    routeAuth.userId = userId;

    const migration = await db.$queryRaw<Array<{ migration_name: string }>>`SELECT migration_name FROM _prisma_migrations WHERE migration_name = '20261108000000_assistant_intents' AND finished_at IS NOT NULL`;

    expect(migration).toHaveLength(1);
    await db.user.create({ data: { id: userId, email: `${marker}@example.invalid`, displayName: marker } });

    const campaign = await db.campaign.create({ data: { name: marker, dmUserId: userId, inviteCode: randomUUID(), maxLevel: 10, members: { create: { userId, role: "dm" } } } });

    campaignId = campaign.id;

    const thread = await db.aiThread.create({ data: { campaignId, userId, title: marker, mode: "scenario", provider: "anthropic", model: "synthetic", executionMode: "review" } });

    threadId = thread.id;
    ready = true;
  });

  beforeEach(async () => {
    await db.campaign.update({ where: { id: campaignId }, data: { maxLevel: 10 } });
    await db.aiThread.update({ where: { id: threadId }, data: { executionMode: "review" } });
  });

  afterAll(async () => {
    if (campaignId) {
      const owned = await db.campaign.findUnique({ where: { id: campaignId }, select: { name: true, dmUserId: true, members: { select: { userId: true, role: true } } } });

      if (owned && (owned.name !== marker || owned.dmUserId !== userId || owned.members.length !== 1 || owned.members[0].userId !== userId || owned.members[0].role !== "dm")) throw new Error("FIXTURE_OWNERSHIP_MISMATCH");

      await db.assistantReceipt.deleteMany({ where: { campaignId, userId } });

      if (owned) await db.campaign.delete({ where: { id: campaignId } });
    }

    const user = await db.user.findUnique({ where: { id: userId }, select: { displayName: true, email: true, campaignMembers: { select: { id: true } }, dmCampaigns: { select: { id: true } } } });

    if (user) {
      if (user.displayName !== marker || user.email !== `${marker}@example.invalid` || user.campaignMembers.length || user.dmCampaigns.length) throw new Error("FIXTURE_USER_MISMATCH");

      await db.user.delete({ where: { id: userId } });
    }

    if (ready) expect(await db.campaign.count({ where: { id: campaignId } })).toBe(0);

    await db.$disconnect();
    await prisma.$disconnect();
  });

  it("real content review and concurrent confirm create exactly one row and receipt", async () => {
    const executor = createAssistantExecutor({ db, catalog: createActionCatalog(CONTENT_ACTIONS), effects: CONTENT_EFFECT_HANDLERS });

    const prepared = await executor.dispatchAction(caller(), { actionId: "content.units.create", requestId: randomUUID(), input: { data: { name: marker } } });

    if (prepared.kind !== "pending") throw new Error("review required");

    expect(await db.unit.count({ where: { campaignId, name: marker } })).toBe(0);

    const receipts = await Promise.all([executor.confirmIntent(actor(), prepared.intent.id), executor.confirmIntent(actor(), prepared.intent.id)]);

    expect(receipts[0].id).toBe(receipts[1].id);
    expect(await db.unit.count({ where: { campaignId, name: marker } })).toBe(1);
    expect(await db.assistantReceipt.count({ where: { intentId: prepared.intent.id } })).toBe(1);
  });

  it.each(["class", "feat"] as const)("abilities contract serves local %s owners and scopes discovery", async kind => {
    const ability = { id: "note", name: "Note", trigger: { event: "passive" }, effects: [{ kind: "note", text: "Own ability" }] };

    const row = kind === "class"
      ? await db.gameClass.create({ data: { campaignId, name: `Ability class ${randomUUID()}`, features: [{ level: 1, abilities: [ability] }], subclasses: [{ id: "school", name: "School", features: [{ level: 3, abilities: [{ ...ability, id: "subclass-note" }] }] }] } })
      : await db.feat.create({ data: { campaignId, name: `Ability feat ${randomUUID()}`, abilities: [ability] } });

    const result = await runContentOperation("abilities.get", actor(), { kind, ownerId: row.id });

    expect(result).toMatchObject({ abilities: kind === "class" ? [{ id: "note" }, { id: "subclass-note" }] : [{ id: "note" }] });
    expect(await runContentOperation("abilities.sources", actor(), {})).toMatchObject({ sources: expect.arrayContaining([{ kind, id: row.id, name: row.name }]) });
    await expect(runContentOperation("abilities.get", { ...actor(), campaignId: "foreign" }, { kind, ownerId: row.id })).rejects.toMatchObject({ status: 404 });
  });

  it.each(["class-features", "subclass-features", "feat-choices"] as const)("canonical writers reject foreign nested spells in %s before writes", async branch => {
    const foreign = await db.campaign.create({ data: { name: marker, dmUserId: userId, inviteCode: randomUUID() } });

    try {
      const spell = await db.spell.create({ data: { campaignId: foreign.id, name: "Foreign", type: "damage", damageType: "fire" } });

      const choices = [{ id: "gift", label: "Gift", level: 1, count: 1, kind: "option", options: [{ id: "magic", name: "Magic", spells: [{ level: 1, spellId: spell.id }] }] }];

      const patch = branch === "class-features" ? { features: [{ level: 1, abilities: [], choices }] } : branch === "subclass-features" ? { subclasses: [{ id: "school", name: "School", features: [{ level: 1, abilities: [], choices }] }] } : { choices };

      const resource = branch === "feat-choices" ? CONTENT_RESOURCES.feats : CONTENT_RESOURCES.classes;

      const name = `Foreign ref ${branch}`;

      await expect(createContent(resource, actor(), { name, ...patch })).rejects.toMatchObject({ status: 400 });
      expect(await db.gameClass.count({ where: { campaignId, name } })).toBe(0);
      expect(await db.feat.count({ where: { campaignId, name } })).toBe(0);

      const existing = await createContent(resource, actor(), { name });

      await expect(updateContent(resource, actor(), (existing as { id: string }).id, patch)).rejects.toMatchObject({ status: 400 });

      const ownSpell = await db.spell.create({ data: { campaignId, name: `Own ${branch}`, type: "damage", damageType: "fire" } });

      const ownPatch = JSON.parse(JSON.stringify(patch).replaceAll(spell.id, ownSpell.id));

      await expect(updateContent(resource, actor(), (existing as { id: string }).id, ownPatch)).resolves.toBeDefined();
      await expect(createContent(resource, actor(), { name: `${name} own`, ...ownPatch })).resolves.toBeDefined();

      // Old stale refs must not prevent unrelated metadata edits, matching races.
      const id = (existing as { id: string }).id;

      if (branch === "feat-choices") await db.feat.update({ where: { id }, data: { choices } });
      else await db.gameClass.update({ where: { id }, data: patch });

      await expect(updateContent(resource, actor(), id, { name: `${name} renamed` })).resolves.toBeDefined();
    } finally {
      await db.campaign.delete({ where: { id: foreign.id } });
    }
  });

  it("real source contention fails NOWAIT before intent creation and maps to a sanitized transport error", async () => {
    const source = await db.campaign.create({ data: { name: marker, dmUserId: userId, inviteCode: randomUUID(), kind: "template", visibility: "official" } });

    const other = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

    let unlock = () => {};

    let holding: Promise<void> | undefined;

    try {
      await db.campaign.update({ where: { id: campaignId }, data: { createdFromId: source.id } });
      await db.spell.create({ data: { campaignId: source.id, name: "Contended source", type: "damage", damageType: "fire" } });

      const item = (await getSourceDiff(actor())).items.find(item => item.scope === "spells");

      if (!item) throw Error("MISSING_SOURCE_FIXTURE");

      const [{ pid }] = await db.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`;

      let markReady = () => {};

      let rejectReady: (error: unknown) => void = () => {};

      const ready = new Promise<void>((resolve, reject) => { markReady = resolve; rejectReady = reject; });

      const release = new Promise<void>(resolve => { unlock = resolve; });

      holding = other.$transaction(async tx => {
        const [peer] = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`;

        expect(peer.pid).not.toBe(pid);
        await tx.$queryRaw`SELECT id FROM campaigns WHERE id = ${source.id} FOR UPDATE`;
        markReady();
        await release;
      }, { timeout: 10000 }).catch(error => { rejectReady(error); throw error; });
      await ready;

      const intentsBefore = await db.assistantIntent.count({ where: { campaignId } });

      const executor = createAssistantExecutor({ db, catalog: createActionCatalog(CONTENT_ACTIONS), effects: CONTENT_EFFECT_HANDLERS });

      let sqlCode: unknown;

      const result = await runToolResult({ name: "source-contention", title: "Synthetic", description: "Synthetic", scopes: [], input: z.unknown(), handler: async () => {
        try { return await executor.dispatchAction(caller(), { actionId: "source.apply", requestId: randomUUID(), input: { body: { apply: [{ scope: item.scope, key: item.key, sourceHash: item.sourceHash, status: item.status }], ignore: [] } } }); }
        catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError) sqlCode = error.meta?.code;

          throw error;
        }
      } }, { campaignId, userId, scopes: [], threadId }, {});

      expect(sqlCode).toBe("55P03");
      expect(result).toEqual({ version: 2, kind: "error", error: { code: "ASSISTANT_FAILED", status: 500, message: "Внутрішня помилка сервера. Спробуй ще раз пізніше." } });
      expect(await db.assistantIntent.count({ where: { campaignId } })).toBe(intentsBefore);
      expect(await db.spell.count({ where: { campaignId, name: "Contended source" } })).toBe(0);
    } finally {
      unlock();
      await holding;
      await other.$disconnect();
      await db.campaign.update({ where: { id: campaignId }, data: { createdFromId: null } });
      await db.campaign.delete({ where: { id: source.id } });
    }
  });

  it("real newly added inventory reference makes a deletion stale", async () => {
    const artifact = await db.artifact.create({ data: { campaignId, name: marker, slot: "weapon", rarity: "common" } });

    const executor = createAssistantExecutor({ db, catalog: createActionCatalog(CONTENT_ACTIONS), effects: CONTENT_EFFECT_HANDLERS });

    const prepared = await executor.dispatchAction(caller(), { actionId: "content.artifacts.delete", requestId: randomUUID(), input: { id: artifact.id } });

    if (prepared.kind !== "pending") throw new Error("review required");

    const character = await db.character.create({ data: { campaignId, controlledBy: userId, type: "hero", name: marker, class: "", race: "", inventory: { create: { backpack: [artifact.id] } } } });

    await expect(executor.confirmIntent(actor(), prepared.intent.id)).rejects.toMatchObject({ status: 409 });
    expect(await db.artifact.count({ where: { id: artifact.id } })).toBe(1);
    expect(await db.assistantReceipt.count({ where: { intentId: prepared.intent.id } })).toBe(0);
    expect(await db.characterInventory.findUnique({ where: { characterId: character.id } })).toMatchObject({ backpack: [artifact.id] });
  });

  it("real partial importer report and receipt commit on the sole transaction connection", async () => {
    const executor = createAssistantExecutor({ db, catalog: createActionCatalog(CONTENT_ACTIONS), effects: CONTENT_EFFECT_HANDLERS });

    const name = `${marker}-import`;

    const prepared = await executor.dispatchAction(caller(), { actionId: "content.import", requestId: randomUUID(), input: { kind: "units", body: { rows: [{ name }, {}] } } });

    if (prepared.kind !== "pending") throw new Error("review required");

    const receipt = await executor.confirmIntent(actor(), prepared.intent.id);

    expect(receipt).toMatchObject({ status: "applied", result: { data: { counts: { created: 1, error: 1 } }, warnings: [expect.stringContaining("частково")] } });
    expect(await db.unit.count({ where: { campaignId, name } })).toBe(1);
    expect(await executor.confirmIntent(actor(), prepared.intent.id)).toEqual(receipt);
  });
  it("a database error rolls back only its import row, then later rows and receipt commit", async () => {
    const executor = createAssistantExecutor({ db, catalog: createActionCatalog(CONTENT_ACTIONS), effects: CONTENT_EFFECT_HANDLERS });

    const original = DEFAULT_IMPORT_DEPS.resource;

    const spy = vi.spyOn(DEFAULT_IMPORT_DEPS, "resource").mockImplementation((kind) => {
      if (kind !== "units") return original(kind);

      return { ...CONTENT_RESOURCES.units, create: async (who, input) => {
        const row = await CONTENT_RESOURCES.units.create(who, input);

        if (input.name.endsWith("-sql-fault")) await prisma.$queryRaw`SELECT 1 / 0`;

        return row;
      } };
    });

    const bad = `${marker}-sql-fault`, good = `${marker}-sql-good`;

    try {
      const prepared = await executor.dispatchAction(caller(), { actionId: "content.import", requestId: randomUUID(), input: { kind: "units", body: { rows: [{ name: bad }, { name: good }] } } });

      if (prepared.kind !== "pending") throw new Error("review required");

      const receipt = await executor.confirmIntent(actor(), prepared.intent.id);

      expect(receipt).toMatchObject({ status: "applied", effectsStatus: "complete", result: { data: { counts: { created: 1, error: 1 } } } });
      expect(await db.unit.count({ where: { campaignId, name: bad } })).toBe(0);
      expect(await db.unit.count({ where: { campaignId, name: good } })).toBe(1);
    } finally { spy.mockRestore(); }
  });

  const executor = () => createAssistantExecutor({ db, catalog: createActionCatalog(CONTENT_ACTIONS), effects: CONTENT_EFFECT_HANDLERS });

  async function pending(actionId: string, input: unknown) {
    const result = await executor().dispatchAction(caller(), { actionId, input, requestId: randomUUID() });

    if (result.kind !== "pending") throw new Error("EXPECTED_PENDING");

    return result.intent.id;
  }

  async function assertStale(intentId: string) {
    await expect(executor().confirmIntent(actor(), intentId)).rejects.toMatchObject({ status: 409 });
    expect(await db.assistantIntent.findUniqueOrThrow({ where: { id: intentId } })).toMatchObject({ status: "stale" });
    expect(await db.assistantReceipt.count({ where: { intentId } })).toBe(0);
  }

  it("nestedRefEditMakesPreviewStale", async () => {
    const spell = await db.spell.create({ data: { campaignId, name: `${marker}-nested`, type: "damage", damageType: "fire" } });

    const hero = await db.character.create({ data: { campaignId, controlledBy: userId, type: "hero", name: marker, class: "", race: "", raceChoices: { nested: [{ spellId: spell.id, option: "before" }] } } });

    const intentId = await pending("content.spells.update", { id: spell.id, patch: { description: "must not apply" } });

    await db.character.update({ where: { id: hero.id }, data: { raceChoices: { nested: [{ spellId: spell.id, option: "after" }] } } });
    await assertStale(intentId);
    expect(await db.spell.findUniqueOrThrow({ where: { id: spell.id } })).toMatchObject({ description: null });
    expect(await db.character.findUniqueOrThrow({ where: { id: hero.id } })).toMatchObject({ raceChoices: { nested: [{ spellId: spell.id, option: "after" }] } });
  });

  it("unrelatedContentEditKeepsConservativeStale", async () => {
    const artifact = await db.artifact.create({ data: { campaignId, name: `${marker}-unrelated`, slot: "weapon" } });

    const before = (await db.campaign.findUniqueOrThrow({ where: { id: campaignId } })).rules;

    const intentId = await pending("rules.update", { body: { morale: { cap: 4 } } });

    await db.artifact.update({ where: { id: artifact.id }, data: { description: "unrelated edit" } });
    await assertStale(intentId);
    expect((await db.campaign.findUniqueOrThrow({ where: { id: campaignId } })).rules).toEqual(before);
  });

  it("deleteCascadeRollsBackOnConflict", async () => {
    const group = await db.spellGroup.create({ data: { campaignId, name: `${marker}-cascade` } });

    const spell = await db.spell.create({ data: { campaignId, name: marker, type: "damage", damageType: "fire", groupId: group.id } });

    const skill = await db.skill.create({ data: { campaignId, name: marker, spellGroupId: group.id } });

    const intentId = await pending("content.spell-groups.delete", { id: group.id });

    await db.skill.update({ where: { id: skill.id }, data: { abilities: [{ nested: { ref: group.id } }] } });
    await assertStale(intentId);
    expect(await db.spellGroup.count({ where: { id: group.id } })).toBe(1);
    expect(await db.spell.findUniqueOrThrow({ where: { id: spell.id } })).toMatchObject({ groupId: group.id });
    expect(await db.skill.findUniqueOrThrow({ where: { id: skill.id } })).toMatchObject({ spellGroupId: group.id });
  });

  it("rolls back an actual cascade when a later writer raises 409", async () => {
    const group = await db.spellGroup.create({ data: { campaignId, name: `${marker}-rollback` } });

    const spell = await db.spell.create({ data: { campaignId, name: marker, type: "damage", damageType: "fire", groupId: group.id } });

    const original = CONTENT_ACTIONS.find(action => action.id === "content.spell-groups.delete");

    if (!original || original.effect !== "write") throw new Error("EXPECTED_DELETE_ACTION");

    const engine = createAssistantExecutor({ db, catalog: createActionCatalog([{ ...original, execute: async (ctx: ActionExecutionContext, input: unknown) => {
      await original.execute(ctx, input);
      expect(await ctx.db.spell.findUniqueOrThrow({ where: { id: spell.id } })).toMatchObject({ groupId: null });
      throw new ContentError("SYNTHETIC_POST_CASCADE_CONFLICT", 409);
    } }]), effects: CONTENT_EFFECT_HANDLERS });

    const prepared = await engine.dispatchAction(caller(), { actionId: original.id, input: { id: group.id }, requestId: randomUUID() });

    if (prepared.kind !== "pending") throw new Error("EXPECTED_PENDING");

    await expect(engine.confirmIntent(actor(), prepared.intent.id)).rejects.toMatchObject({ status: 409 });
    expect(await db.spellGroup.count({ where: { id: group.id } })).toBe(1);
    expect(await db.spell.findUniqueOrThrow({ where: { id: spell.id } })).toMatchObject({ groupId: group.id });
    expect(await db.assistantReceipt.count({ where: { intentId: prepared.intent.id } })).toBe(0);
  });

  it("competing native HTTP PATCH holds the campaign lock and invalidates preview on two one-connection pools", async () => {
    const other = new PrismaClient({ datasources: { db: { url: databaseUrl } }, log: [] });

    let notify = () => {};

    const nativeReady = new Promise<void>(resolve => { notify = resolve; });

    try {
      const spell = await db.spell.create({ data: { campaignId, name: `${marker}-http`, type: "damage", damageType: "fire" } });

      const intentId = await pending("content.spells.update", { id: spell.id, patch: { description: "assistant" } });

      const [{ pid: confirmPid }] = await db.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`;

      const { PATCH } = await import("@/app/api/campaigns/[id]/spells/[spellId]/route");

      const native = other.$transaction(async tx => {
        const [{ pid: nativePid }] = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`;

        expect(nativePid).not.toBe(confirmPid);
        await tx.$queryRaw`SELECT id FROM campaigns WHERE id = ${campaignId} FOR UPDATE`;

        const response = await runContentWriteContext(campaignId, tx, () => PATCH(new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ description: "native HTTP" }) }), { params: Promise.resolve({ id: campaignId, spellId: spell.id }) }));

        expect(response.status).toBe(200);
        notify();

        let blocked = false;

        for (let attempt = 0; attempt < 100; attempt++) {
          await tx.$executeRaw`SELECT pg_stat_clear_snapshot()`;

          const [activity] = await tx.$queryRaw<Array<{ blocked: boolean }>>`SELECT wait_event_type = 'Lock' AS blocked FROM pg_stat_activity WHERE pid = ${confirmPid}`;

          if (activity?.blocked) { blocked = true; break; }

          await new Promise(resolve => setTimeout(resolve, 10));
        }

        expect(blocked).toBe(true);
      }, { timeout: 10_000 });

      // Observe native transaction errors too, so a failed readiness check cannot hang.
      await Promise.race([nativeReady, native.then(() => { throw new Error("NATIVE_DID_NOT_SIGNAL"); })]);

      const confirming = executor().confirmIntent(actor(), intentId).then(value => ({ value, error: null }), error => ({ value: null, error }));

      await native;
      expect((await confirming).error).toMatchObject({ status: 409 });
      expect(await db.spell.findUniqueOrThrow({ where: { id: spell.id } })).toMatchObject({ description: "native HTTP" });
      expect(await db.assistantIntent.findUniqueOrThrow({ where: { id: intentId } })).toMatchObject({ status: "stale" });
      expect(await db.assistantReceipt.count({ where: { intentId } })).toBe(0);
    } finally { notify(); await other.$disconnect(); }
  });

});
