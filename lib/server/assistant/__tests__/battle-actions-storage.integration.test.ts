import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { BATTLE_ACTIONS } from "@/lib/server/assistant/actions/battles";
import { createActionCatalog } from "@/lib/server/assistant/catalog";
import { createAssistantExecutor } from "@/lib/server/assistant/execute";
import type { AssistantCaller } from "@/lib/server/assistant/types";
import { executeBattleOperation } from "@/lib/server/battles/execute-battle-operation";
import { isLocalDevDatabaseEnv, singleConnectionDatabaseUrl } from "@/lib/server/test-support/local-db";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { loadBattle, saveBattle } from "@/lib/utils/battle/store";

const session = vi.hoisted(() => ({ userId: "" }));

vi.mock("@/lib/auth", () => ({ getSessionUserId: async () => session.userId }));
vi.mock("next/server", async original => ({ ...await original<typeof import("next/server")>(), after: () => { throw Error("UNEXPECTED_EXTERNAL_PUBLICATION"); } }));

// Route helpers and the injected executor use the SAME one-connection client.
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


const marker = `stage6-battle-${randomUUID()}`;

const userId = marker;

let campaignId: string;

let battleId: string;

let threadId: string;

let failReceipt = false;

const published = vi.fn();

const actor = () => ({ campaignId, userId, isDM: true, via: "session", scopes: null } as const);

const caller = (): AssistantCaller => ({ actor: actor(), channel: "chat", threadId, tokenId: null });

const faultDb = new Proxy(db, { get(target, property) {
  if (property === "$transaction") return (callback: (tx: unknown) => unknown, options: unknown) => target.$transaction(async tx => callback(new Proxy(tx, { get(transaction, key) {
    if (key === "assistantReceipt" && failReceipt) return new Proxy(transaction.assistantReceipt, { get(delegate, method) {
      if (method === "create") return async () => { await transaction.$executeRawUnsafe("SELECT 1 / 0"); };

      return Reflect.get(delegate, method);
    } });

    const value = Reflect.get(transaction, key);

    return typeof value === "function" ? value.bind(transaction) : value;
  } })), options as never);

  const value = Reflect.get(target, property);

  return typeof value === "function" ? value.bind(target) : value;
} });

const executor = () => createAssistantExecutor({ db: faultDb, catalog: createActionCatalog(BATTLE_ACTIONS), effects: { publish: async payload => {
  expect(await db.assistantReceipt.count({ where: { campaignId } })).toBeGreaterThan(0);
  published(payload);
} } });

describe.skipIf(!isLocalDevDatabaseEnv())("T11 battle adapters real constructor, single connection", () => {
  beforeAll(async () => {
    await db.user.create({ data: { id: userId, email: `${marker}@example.invalid`, displayName: marker } });

    const campaign = await db.campaign.create({ data: { name: marker, dmUserId: userId, inviteCode: randomUUID(), members: { create: { userId, role: "dm" } } } });

    campaignId = campaign.id;

    const battle = await db.battleScene.create({ data: { campaignId, name: marker } });

    battleId = battle.id;
    threadId = (await db.aiThread.create({ data: { campaignId, userId, title: marker, provider: "anthropic", model: "synthetic", mode: "scenario" } })).id;
    session.userId = userId;
  });
  afterAll(async () => {
    if (campaignId) {
      const owned = await db.campaign.findUniqueOrThrow({ where: { id: campaignId }, include: { members: true } });

      if (owned.name !== marker || owned.dmUserId !== userId || owned.members.some(member => member.userId !== userId)) throw Error("FIXTURE_OWNERSHIP_MISMATCH");

      await db.campaign.delete({ where: { id: campaignId } });
      await db.assistantReceipt.deleteMany({ where: { campaignId, userId } });
    }

    const user = await db.user.findUnique({ where: { id: userId } });

    if (user?.email !== `${marker}@example.invalid`) throw Error("FIXTURE_USER_MISMATCH");

    await db.user.delete({ where: { id: userId } });
    await db.$disconnect();
  });
  it("T10 actor entry point also guards record creation and patch version", async () => {
    const created = await executeBattleOperation(actor(), { operation: "create", battleId: "", input: { name: `${marker}-pipeline`, participants: [] }, expectedVersion: 0 });

    const id = (created.data as { battleId: string }).battleId;

    expect(await db.battleScene.findUnique({ where: { id } })).toMatchObject({ campaignId, version: 0 });
    await expect(executeBattleOperation(actor(), { operation: "patch", battleId: id, input: { name: "stale" }, expectedVersion: 1 })).rejects.toMatchObject({ status: 409 });
    expect(await db.battleScene.findUnique({ where: { id } })).toMatchObject({ name: `${marker}-pipeline`, version: 0 });
    await db.battleScene.delete({ where: { id } }); // owned fixture cleanup
  });
  it("attackRepeatKeepsSameRollAndEvent and receipt rollback", async () => {
    const hero = createMockParticipant();

    hero.basicInfo = { ...hero.basicInfo, id: `${marker}-hero`, sourceType: "unit", sourceId: "fixture", battleId, controlledBy: userId };
    hero.battleData.attacks = [{ id: "sword", name: "Sword", type: "melee", damageDice: "1d6", attackBonus: 5, damageType: "slashing" }];

    const enemy = createMockParticipant({ basicInfo: { ...hero.basicInfo, id: `${marker}-enemy`, side: "enemy" }, combatStats: { ...hero.combatStats, currentHp: 1000, maxHp: 1000 } });

    const before = await loadBattle(prisma, { battleId, campaignId, userId });

    if (!before) throw Error("fixture missing");

    await saveBattle(prisma, before, { participants: [hero, enemy], pending: [], events: [], scene: { status: "active" } });

    const raw = { battleId, body: { attackerId: hero.basicInfo.id, targetId: enemy.basicInfo.id } };

    const prepared = await executor().dispatchAction(caller(), { actionId: "battles.attack", requestId: randomUUID(), input: raw });

    if (prepared.kind !== "pending") throw Error("pending required");

    expect(await db.battleEvent.count({ where: { battleId } })).toBe(0);
    failReceipt = true;
    await expect(executor().confirmIntent(actor(), prepared.intent.id)).rejects.toThrow();
    expect(await db.battleScene.findUnique({ where: { id: battleId } })).toMatchObject({ version: 1 });
    expect(await db.battleEvent.count({ where: { battleId } })).toBe(0);
    expect(await db.assistantReceipt.count({ where: { campaignId } })).toBe(0);
    failReceipt = false;

    const receipt = await executor().confirmIntent(actor(), prepared.intent.id);

    const events = await db.battleEvent.findMany({ where: { battleId } });

    expect(events.length).toBeGreaterThan(0);
    expect(JSON.stringify(events)).toContain('"server":true');
    expect(await executor().confirmIntent(actor(), prepared.intent.id)).toMatchObject({ id: receipt.id });
    expect(await db.battleEvent.findMany({ where: { battleId } })).toEqual(events);
    expect(published).toHaveBeenCalledTimes(1);
  });
  it("CRUD create retry and clear-history remain human in auto", async () => {
    await db.aiThread.update({ where: { id: threadId }, data: { executionMode: "auto" } });

    const request = { actionId: "battles.create", requestId: randomUUID(), input: { body: { name: `${marker}-new`, participants: [] } } };

    const first = await executor().dispatchAction(caller(), request);

    expect(first.kind).toBe("result");
    expect(await executor().dispatchAction(caller(), request)).toEqual(first);
    expect(await db.battleScene.count({ where: { campaignId, name: `${marker}-new` } })).toBe(1);
    for (const actionId of ["battles.delete", "battles.reset", "battles.rollback", "battles.clear-history"]) {
      const input = actionId === "battles.clear-history" ? {} : { battleId, body: actionId === "battles.rollback" ? { actionIndex: 1 } : {} };

      const pending = await executor().dispatchAction(caller(), { actionId, requestId: randomUUID(), input });

      expect(pending.kind).toBe("pending");
    }
    expect(await db.battleScene.count({ where: { campaignId } })).toBe(2);
  });
  it("targetAndTurnChangeStale", async () => {
    await db.aiThread.update({ where: { id: threadId }, data: { executionMode: "review" } });

    const prepared = await executor().dispatchAction(caller(), { actionId: "battles.reset", requestId: randomUUID(), input: { battleId } });

    if (prepared.kind !== "pending") throw Error("pending required");

    await db.battleScene.update({ where: { id: battleId }, data: { currentTurnIndex: 1 } });
    await expect(executor().confirmIntent(actor(), prepared.intent.id)).rejects.toMatchObject({ status: 409 });
    expect(await db.assistantIntent.findUnique({ where: { id: prepared.intent.id } })).toMatchObject({ status: "stale" });
  });
  it("audio seq conflicts without battle.version and all read/balance adapters", async () => {
    const first = await executor().dispatchAction(caller(), { actionId: "battles.audio", requestId: randomUUID(), input: { battleId, body: { action: "stop" } } });

    const second = await executor().dispatchAction(caller(), { actionId: "battles.audio", requestId: randomUUID(), input: { battleId, body: { action: "stop" } } });

    if (first.kind !== "pending" || second.kind !== "pending") throw Error("pending required");

    const before = await db.battleScene.findUniqueOrThrow({ where: { id: battleId } });

    await executor().confirmIntent(actor(), first.intent.id);
    expect(await db.battleScene.findUnique({ where: { id: battleId } })).toMatchObject({ version: before.version, audio: { seq: 1 } });
    await expect(executor().confirmIntent(actor(), second.intent.id)).rejects.toMatchObject({ status: 409 });
    for (const operation of ["list", "active", "get", "version", "events", "summary", "audio.get", "balance.get", "balance"]) {
      const read = await executor().dispatchAction(caller(), { actionId: `battles.${operation}`, requestId: randomUUID(), input: { battleId, body: operation === "events" ? { before: 999, limit: 10 } : {} } });

      expect(read.kind, operation).toBe("result");
    }
  });
  it("HTTP metadata patch invalidates prepared intent; delete and clear remove exact scenes after human confirmation", async () => {
    const pending = await executor().dispatchAction(caller(), { actionId: "battles.reset", requestId: randomUUID(), input: { battleId } });

    if (pending.kind !== "pending") throw Error("pending required");

    const { PATCH } = await import("@/app/api/campaigns/[id]/battles/[battleId]/route");

    const response = await PATCH(new Request("http://local", { method: "PATCH", body: JSON.stringify({ name: `${marker}-patched` }) }), { params: Promise.resolve({ id: campaignId, battleId }) });

    expect(response.status).toBe(200);
    await expect(executor().confirmIntent(actor(), pending.intent.id)).rejects.toMatchObject({ status: 409 });

    const remove = await executor().dispatchAction(caller(), { actionId: "battles.delete", requestId: randomUUID(), input: { battleId } });

    if (remove.kind !== "pending") throw Error("pending required");

    await executor().confirmIntent(actor(), remove.intent.id);
    expect(await db.battleScene.findUnique({ where: { id: battleId } })).toBeNull();
    expect(await db.battleScene.count({ where: { campaignId } })).toBe(1);

    const clear = await executor().dispatchAction(caller(), { actionId: "battles.clear-history", requestId: randomUUID(), input: {} });

    if (clear.kind !== "pending") throw Error("pending required");

    await executor().confirmIntent(actor(), clear.intent.id);
    expect(await db.battleScene.count({ where: { campaignId } })).toBe(0);
    expect(await executor().confirmIntent(actor(), clear.intent.id)).toMatchObject({ status: "applied" });
  });

});
