import { beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();

const updateMany = vi.fn();

const trigger = vi.fn(async () => undefined);

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: { campaignShow: { findUnique, updateMany } } }));
vi.mock("@/lib/pusher/server", () => ({ pusherServer: { trigger } }));

const row = (over: Record<string, unknown> = {}) => ({ deckId: null, deckTitle: null, slide: null, nextImageUrl: null, audio: null, battle: { id: "b1", name: "Засідка" }, seq: 3, ...over });

describe("clearShowBattle", () => {
  beforeEach(() => vi.clearAllMocks());

  it("знімає виклик цього бою і публікує новий стан", async () => {
    const { clearShowBattle } = await import("../show-store");

    findUnique.mockResolvedValueOnce(row());
    updateMany.mockResolvedValueOnce({ count: 1 });

    await clearShowBattle("c1", "b1");

    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { campaignId: "c1", seq: 3 } }));
    expect(trigger).toHaveBeenCalledTimes(1);
  });

  it("повторює при конфлікті seq", async () => {
    const { clearShowBattle } = await import("../show-store");

    findUnique.mockResolvedValueOnce(row()).mockResolvedValueOnce(row({ seq: 4 }));
    updateMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 });

    await clearShowBattle("c1", "b1");

    expect(updateMany).toHaveBeenCalledTimes(2);
    expect(trigger).toHaveBeenCalledTimes(1);
  });

  it("інший бій або порожній показ: нічого не пишемо", async () => {
    const { clearShowBattle } = await import("../show-store");

    findUnique.mockResolvedValueOnce(row({ battle: { id: "b2", name: "x" } }));
    await clearShowBattle("c1", "b1");
    findUnique.mockResolvedValueOnce(null);
    await clearShowBattle("c1", "b1");

    expect(updateMany).not.toHaveBeenCalled();
  });

  it("помилку БД логує і не кидає", async () => {
    const { clearShowBattle } = await import("../show-store");

    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);

    findUnique.mockRejectedValueOnce(new Error("db"));

    await expect(clearShowBattle("c1", "b1")).resolves.toBeUndefined();
    expect(err).toHaveBeenCalled();
  });
});
it("durable publication failure rejects; retry republishes current cleared state", async () => {
  const { clearShowBattle, publishShow } = await import("../show-store");

  trigger.mockRejectedValueOnce(new Error("offline"));
  await expect(publishShow("c", { seq: 1 } as never, { strict: true })).rejects.toThrow("offline");
  findUnique.mockResolvedValueOnce(row({ battle: null }));
  trigger.mockRejectedValueOnce(new Error("offline"));
  await expect(clearShowBattle("c", "b1", { strict: true })).rejects.toThrow("offline");
  findUnique.mockResolvedValueOnce(row({ battle: null }));
  await expect(clearShowBattle("c", "b1", { strict: true })).resolves.toBeUndefined();
});
