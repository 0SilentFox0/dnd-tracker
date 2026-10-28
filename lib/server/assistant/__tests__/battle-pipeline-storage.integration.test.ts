import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { createActionCatalog } from "@/lib/server/assistant/catalog";
import { createAssistantExecutor } from "@/lib/server/assistant/execute";
import type { AssistantCaller, AssistantWriteAction } from "@/lib/server/assistant/types";
import { executeBattleOperation } from "@/lib/server/battles/execute-battle-operation";
import { runBattleMutation } from "@/lib/server/battles/run-mutation";

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

function localUrl(name: string) {
  const url = new URL(process.env[name] ?? "");

  if (!["postgres:", "postgresql:"].includes(url.protocol) || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.port !== "54322" || url.pathname !== "/constructor") throw new Error("ASSISTANT_TEST_REQUIRES_LOCAL_CONSTRUCTOR");

  url.searchParams.set("connection_limit", "1");

  return url.toString();
}

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

const input = z.object({});

const action: AssistantWriteAction = {
  id: "battles.reset", title: "Скидання", description: "T10 pipeline fixture", input,
  need: { access: "dm", scope: "battles:write" }, effect: "write", confirmation: "always",
  prepare: async () => {
    const row = await prisma.battleScene.findUniqueOrThrow({ where: { id: battleId } });

    return { summary: "Скидання", targets: [], changes: [], warnings: [], preconditions: { version: row.version }, effects: [{ kind: "erase-progress", targets: [], description: "Скидання" }] };
  },
  execute: ctx => executeBattleOperation(ctx.caller.actor, { operation: "reset", battleId, input: {}, expectedVersion: (ctx.expected as { version: number }).version }, ctx),
};

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

const executor = () => createAssistantExecutor({ db: faultDb, catalog: createActionCatalog([action]), effects: { publish: async payload => {
  expect(await db.battleScene.findUnique({ where: { id: battleId } })).toMatchObject({ version: 1 });
  expect(await db.assistantReceipt.count({ where: { campaignId } })).toBe(1);
  published(payload);
} } });

describe("T10 real constructor pipeline, single connection", () => {
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
  it("receiptAndBattleSaveRollbackTogether then publishAfterCommitOnly and retry once", async () => {
    const prepared = await executor().dispatchAction(caller(), { actionId: action.id, requestId: randomUUID(), input: {} });

    if (prepared.kind !== "pending") throw Error("pending required");

    failReceipt = true;
    await expect(executor().confirmIntent(actor(), prepared.intent.id)).rejects.toThrow();
    expect(await db.battleScene.findUnique({ where: { id: battleId } })).toMatchObject({ version: 0, status: "prepared" });
    expect(await db.assistantReceipt.count({ where: { campaignId } })).toBe(0);
    expect(published).not.toHaveBeenCalled();
    failReceipt = false;

    const receipt = await executor().confirmIntent(actor(), prepared.intent.id);

    expect(receipt.status).toBe("applied");
    expect(published).toHaveBeenCalledTimes(1);
    expect(await executor().confirmIntent(actor(), prepared.intent.id)).toMatchObject({ id: receipt.id });
    expect(published).toHaveBeenCalledTimes(1);
    expect(await db.battleScene.findUnique({ where: { id: battleId } })).toMatchObject({ version: 1 });
  });
  it("HTTP uses the same named definition and rejects stale version before save", async () => {
    const response = await runBattleMutation(new Request("http://local/unrelated", { method: "POST", body: JSON.stringify({ expectedVersion: 0 }) }), { params: { id: campaignId, battleId }, operation: "reset" });

    expect(response.status).toBe(409);
    expect(await db.battleScene.findUnique({ where: { id: battleId } })).toMatchObject({ version: 1 });
    expect(published).toHaveBeenCalledTimes(1);
  });
});
