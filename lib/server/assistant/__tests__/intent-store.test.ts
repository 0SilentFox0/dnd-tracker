import type { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createIntent, getIntent, listIntents } from "@/lib/server/assistant/intent-store";
import { readDeletionReceipt, readReceipt } from "@/lib/server/assistant/receipts";
import type { ActionPreview, AssistantCaller } from "@/lib/server/assistant/types";

const dbMocks = vi.hoisted(() => ({
  assistantIntent: {
    upsert: vi.fn<(args: Prisma.AssistantIntentUpsertArgs) => Promise<unknown>>(),
    findFirst: vi.fn<(args?: Prisma.AssistantIntentFindFirstArgs) => Promise<unknown>>(),
    findMany: vi.fn<(args?: Prisma.AssistantIntentFindManyArgs) => Promise<unknown[]>>(),
  },
  assistantReceipt: { findFirst: vi.fn<(args?: Prisma.AssistantReceiptFindFirstArgs) => Promise<unknown>>() },
}));

vi.mock("@/lib/db", () => ({ prisma: dbMocks }));

const caller: AssistantCaller = { actor: { campaignId: "campaign", userId: "dm", isDM: true, via: "session", scopes: null }, channel: "chat", threadId: "thread", tokenId: null, locale: "uk" as const };

const preview: ActionPreview = { summary: "Змінити героя", targets: [{ domain: "characters", id: "hero", name: "Герой" }], changes: [], warnings: [], preconditions: { level: 3 }, effects: [{ kind: "update", targets: [], description: "Оновлення" }] };

const now = new Date("2026-10-25T10:00:00Z");

let row: Record<string, unknown> | undefined;

describe("assistant intent repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    row = undefined;
    dbMocks.assistantIntent.upsert.mockImplementation(async (args) => {
      row ??= { id: "intent", ...args.create, createdAt: now, updatedAt: now };

      return row as never;
    });
    dbMocks.assistantIntent.findFirst.mockImplementation(async (args) => {
      const where = args?.where as Record<string, unknown>;

      return row && Object.entries(where).every(([k, v]) => row?.[k] === v) ? row as never : null;
    });
  });

  it("same canonical request returns the original intent and original preview", async () => {
    const first = await createIntent(caller, { actionId: "characters.update", requestId: "request", input: { a: 1, b: 2 } }, preview, { now });

    const second = await createIntent(caller, { actionId: "characters.update", requestId: "request", input: { b: 2, a: 1 } }, { ...preview, summary: "Новий текст" }, { now: new Date(now.getTime() + 3000) });

    expect(second).toEqual(first);
    expect(first.expiresAt).toBe("2026-10-25T10:15:00.000Z");
    expect(first).not.toHaveProperty("payload");
    expect(first).not.toHaveProperty("expected");
  });

  it("same request id with changed payload conflicts instead of overwriting", async () => {
    await createIntent(caller, { actionId: "characters.update", requestId: "request", input: { level: 3 } }, preview, { now });
    await expect(createIntent(caller, { actionId: "characters.update", requestId: "request", input: { level: 4 } }, preview, { now })).rejects.toMatchObject({ status: 409 });
    expect(row?.payload).toEqual({ level: 3 });
  });

  it("deleted thread relation does not erase origin or hide the author's pending intent", async () => {
    await createIntent(caller, { actionId: "characters.update", requestId: "request", input: {} }, preview, { now });

    if (row) row.threadId = null;

    const detail = await getIntent({ ...caller, threadId: null }, "intent");

    expect(detail.preview.preconditions).toEqual({ level: 3 });
    expect(row?.originThreadId).toBe("thread");
  });

  it("foreign user/campaign and foreign token cannot read a proposal", async () => {
    await createIntent(caller, { actionId: "characters.update", requestId: "request", input: {} }, preview, { now });
    for (const actor of [{ ...caller.actor, campaignId: "other" }, { ...caller.actor, userId: "other" }]) {
      await expect(getIntent({ ...caller, actor }, "intent")).rejects.toMatchObject({ status: 404 });
    }
    await expect(getIntent({ ...caller, channel: "mcp", tokenId: "foreign", actor: { ...caller.actor, via: "token", scopes: ["characters:write"] }, locale: "uk" as const }, "intent")).rejects.toMatchObject({ status: 404 });
  });

  it("token origin survives a deleted relation and cannot become a session proposal", async () => {
    const tokenCaller: AssistantCaller = { ...caller, channel: "mcp", threadId: null, tokenId: "token", actor: { ...caller.actor, via: "token", scopes: ["characters:write"] }, locale: "uk" as const };

    await createIntent(tokenCaller, { actionId: "characters.update", requestId: "request", input: {} }, preview, { now });

    if (row) row.tokenId = null;

    expect(row?.originTokenId).toBe("token");
    expect((await getIntent(tokenCaller, "intent")).channel).toBe("mcp");
  });

  it("rejects non-JSON or empty request identities before persistence", async () => {
    await expect(createIntent(caller, { actionId: "characters.update", requestId: "", input: {} }, preview, { now })).rejects.toMatchObject({ status: 400 });
    await expect(createIntent(caller, { actionId: "characters.update", requestId: "id", input: { invalid: undefined } }, preview, { now })).rejects.toMatchObject({ status: 400 });
    expect(row).toBeUndefined();
  });

  it("paginates with a stable createdAt/id cursor and never exposes stored payload", async () => {
    await createIntent(caller, { actionId: "characters.update", requestId: "request", input: { private: "payload" } }, preview, { now });
    dbMocks.assistantIntent.findMany.mockResolvedValue([row, { ...row, id: "older" }]);

    const page = await listIntents(caller, { limit: 1 });

    expect(page.items).toHaveLength(1);
    expect(page.nextCursor).toBeTruthy();
    expect(JSON.stringify(page)).not.toContain("private");

    const select = dbMocks.assistantIntent.findMany.mock.calls[0][0]?.select;

    expect(select).toMatchObject({ summary: true, targets: true });
    expect(select).not.toHaveProperty("payload");
    expect(select).not.toHaveProperty("preview");
    await expect(listIntents(caller, { cursor: "garbage" })).rejects.toMatchObject({ status: 400 });
  });

  it("minimal deletion receipt is readable by its author after campaign cascade", async () => {
    const receipt = { id: "receipt", campaignId: "campaign", userId: "dm", intentId: "intent", originTokenId: null, status: "applied", result: { data: { deleted: true }, affected: [], warnings: [] }, effectsStatus: "complete" };

    dbMocks.assistantReceipt.findFirst.mockImplementation(async (args) => {
      const where = args?.where as Record<string, unknown>;

      return Object.entries(where).every(([k, v]) => receipt[k as keyof typeof receipt] === v) ? receipt as never : null;
    });
    expect(await readReceipt(caller, "intent")).toEqual({ id: "receipt", status: "applied", result: { data: { deleted: true }, affected: [], warnings: [] }, effectsStatus: "complete" });
    await expect(readReceipt({ ...caller, actor: { ...caller.actor, userId: "other" } }, "intent")).rejects.toMatchObject({ status: 404 });
  });

  it("deleted-campaign lookup only exposes the author's minimal deletion tombstone", async () => {
    const receipt: Record<string, unknown> = { id: "receipt", campaignId: "campaign", userId: "dm", intentId: "intent", actionId: "campaign.delete", status: "applied", result: { private: "old campaign data" } };

    dbMocks.assistantReceipt.findFirst.mockImplementation(async (args) => {
      const where = args?.where as Record<string, unknown>;

      return Object.entries(where).every(([k, v]) => receipt[k] === v) ? receipt : null;
    });
    expect(await readDeletionReceipt("dm", "campaign", "intent")).toEqual({ id: "receipt", status: "applied", deleted: true });
    await expect(readDeletionReceipt("other", "campaign", "intent")).rejects.toMatchObject({ status: 404 });
    receipt.actionId = "characters.update";
    await expect(readDeletionReceipt("dm", "campaign", "intent")).rejects.toMatchObject({ status: 404 });
  });
});

it("pending queue filters at the server before pagination and exposes persisted legacy identity", async () => {
 dbMocks.assistantIntent.findMany.mockResolvedValue([{id:"canonical",actionId:"scenario.legacy-proposal",status:"pending",summary:"Legacy",targets:[],expiresAt:now,createdAt:now,channel:"chat",legacyProposalId:"legacy-real-id"}]);

 const page = await listIntents(caller,{status:"pending",limit:20});

 expect(dbMocks.assistantIntent.findMany).toHaveBeenLastCalledWith(expect.objectContaining({where:expect.objectContaining({status:"pending"}),take:21}));
 expect(page.items[0]).toMatchObject({id:"canonical",legacyProposalId:"legacy-real-id"});
});
