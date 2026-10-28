import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const invalidateReference = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/cache/tags", () => ({ invalidateReference }));
vi.mock("@/lib/db", () => ({ prisma: { $transaction: async (callback: (tx: object) => unknown) => callback({ $queryRaw: async () => [{ id: "c1" }] }) } }));

import { defineResource } from "@/lib/server/content/define-resource";
import { ContentError } from "@/lib/server/content/errors";
import { createContent, getContent, removeAllContent, removeContent, updateContent } from "@/lib/server/content/service";

type Row = { id: string; campaignId: string; name: string };

const rows = new Map<string, Row>();

const thing = defineResource<Row, { name: string }, { name?: string }>({
  kind: "units",
  listFields: [],
  idParam: "thingId",
  label: "Тест",
  description: "",
  path: "/things",
  schemas: { create: z.object({ name: z.string().min(1) }), update: z.object({ name: z.string().min(1).optional() }) },
  access: { list: "member", item: "member" },
  invalidates: ["units"],
  notFound: "Немає",
  list: async () => [...rows.values()],
  find: async (actor, id) => {
    const row = rows.get(id);

    return row && row.campaignId === actor.campaignId ? row : null;
  },
  create: async (actor, input) => ({ id: "n1", campaignId: actor.campaignId, ...input }),
  update: async (_a, existing, input) => ({ ...existing, ...input }),
  remove: async (_a, existing) => {
    rows.delete(existing.id);
  },
});

const shaped = defineResource<Row, { name: string }, { name?: string }>({
  ...thing,
  toItem: (row) => ({ ...row, shaped: true }),
});

const actor = { campaignId: "c1", userId: "u1", isDM: true, via: "session" as const, scopes: null };

const rejectsWith = async (p: Promise<unknown>, status: number) => {
  const error = await p.then(() => null, (e: unknown) => e);

  expect(error).toBeInstanceOf(ContentError);
  expect((error as ContentError).status).toBe(status);
};

describe("content service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rows.clear();
    rows.set("a", { id: "a", campaignId: "c1", name: "А" });
    rows.set("b", { id: "b", campaignId: "c2", name: "Б" });
  });

  it("create і update віддають ту саму форму, що й get (toItem)", async () => {
    expect(await createContent(shaped, actor, { name: "Н" })).toEqual({ id: "n1", campaignId: "c1", name: "Н", shaped: true });
    expect(await updateContent(shaped, actor, "a", { name: "Нове" })).toEqual({ id: "a", campaignId: "c1", name: "Нове", shaped: true });
    expect(await getContent(shaped, actor, "a")).toEqual({ id: "a", campaignId: "c1", name: "А", shaped: true });
  });

  it("create парсить ввід і скидає теги ресурсу", async () => {
    expect(await createContent(thing, actor, { name: "Н" })).toEqual({ id: "n1", campaignId: "c1", name: "Н" });
    expect(invalidateReference).toHaveBeenCalledWith(["units"], "c1");
  });

  it("невалідний ввід → 400 з issues, без запису і скидання", async () => {
    await rejectsWith(createContent(thing, actor, { name: "" }), 400);
    expect(invalidateReference).not.toHaveBeenCalled();
  });

  it("запис іншої кампанії → 404 для get, update і remove; нічого не змінено", async () => {
    await rejectsWith(getContent(thing, actor, "b"), 404);
    await rejectsWith(updateContent(thing, actor, "b", { name: "X" }), 404);
    await rejectsWith(removeContent(thing, actor, "b"), 404);
    expect(rows.get("b")?.name).toBe("Б");
    expect(invalidateReference).not.toHaveBeenCalled();
  });

  it("порожній id → 404 без запиту до find", async () => {
    const find = vi.fn();

    const guarded = { ...thing, find };

    await rejectsWith(getContent(guarded, actor, ""), 404);
    await rejectsWith(updateContent(guarded, actor, undefined as unknown as string, { name: "X" }), 404);
    await rejectsWith(removeContent(guarded, actor, ""), 404);
    expect(find).not.toHaveBeenCalled();
  });

  it("404 перевіряється раніше за валідацію тіла", async () => {
    await rejectsWith(updateContent(thing, actor, "missing", { name: "" }), 404);
  });

  it("remove видаляє і скидає теги", async () => {
    await removeContent(thing, actor, "a");
    expect(rows.has("a")).toBe(false);
    expect(invalidateReference).toHaveBeenCalledWith(["units"], "c1");
  });

  it("removeAll без підтримки в ресурсі → 405", async () => {
    await rejectsWith(removeAllContent(thing, actor), 405);
  });

  it("токен content:read не створює — 403, create не викликано", async () => {
    const create = vi.spyOn(thing, "create");

    await rejectsWith(createContent(thing, { ...actor, via: "token", scopes: ["content:read"] }, { name: "x" }), 403);
    expect(create).not.toHaveBeenCalled();
    create.mockRestore();
  });

  it("removeAll через токен → 403", async () => {
    await rejectsWith(removeAllContent(thing, { ...actor, via: "token", scopes: ["content:write"] }), 403);
  });
});
