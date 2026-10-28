import { after } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  playerNotification: { deleteMany: vi.fn(async () => ({ count: 0 })), createMany: vi.fn(async (args: { data: unknown[] }) => ({ count: args.data.length })) },
  character: { findMany: vi.fn() },
  campaignMember: { findMany: vi.fn() },
}));

const trigger = vi.hoisted(() => vi.fn(async () => undefined));

const afterCallbacks = vi.hoisted(() => [] as Array<() => unknown>);

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ after: vi.fn((cb: () => unknown) => afterCallbacks.push(cb)) }));
vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/pusher/server", () => ({ pusherServer: { trigger } }));
vi.mock("@/lib/pusher/safe-trigger", () => ({
  safePusherTrigger: vi.fn(async (_p: unknown, channel: string, event: string, payload: unknown) => trigger(channel, event, payload)),
}));

import { notifyCampaignPlayers, notifyCharacterOwners, notifyPlayers } from "../notify";

const flush = () => Promise.all(afterCallbacks.splice(0).map((cb) => cb()));

const item = { type: "item", refId: "a1", href: "/campaigns/c1/character?tab=items" } as const;

describe("notifyPlayers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    afterCallbacks.length = 0;
  });

  it("does nothing for empty users or items", async () => {
    expect(await notifyPlayers({ campaignId: "c1", userIds: [], items: [item] })).toBe(0);
    expect(await notifyPlayers({ campaignId: "c1", userIds: ["u1"], items: [] })).toBe(0);
    await flush();

    expect(db.playerNotification.deleteMany).not.toHaveBeenCalled();
    expect(trigger).not.toHaveBeenCalled();
  });

  it("deletes previous rows, recreates them and signals every user", async () => {
    const count = await notifyPlayers({ campaignId: "c1", userIds: ["u1", "u2"], items: [item] });

    expect(count).toBe(2);
    expect(db.playerNotification.deleteMany).toHaveBeenCalledWith({
      where: { OR: [{ userId: "u1", type: "item", refId: "a1" }, { userId: "u2", type: "item", refId: "a1" }] },
    });
    expect(db.playerNotification.createMany).toHaveBeenCalledWith({
      data: [
        { userId: "u1", campaignId: "c1", ...item },
        { userId: "u2", campaignId: "c1", ...item },
      ],
      skipDuplicates: true,
    });

    await flush();

    expect(trigger).toHaveBeenCalledTimes(2);
    expect(trigger).toHaveBeenCalledWith("private-notify-u1", "notifications-changed", { campaignId: "c1" });
    expect(trigger).toHaveBeenCalledWith("private-notify-u2", "notifications-changed", { campaignId: "c1" });
  });

  it("dedupes users", async () => {
    expect(await notifyPlayers({ campaignId: "c1", userIds: ["u1", "u1"], items: [item] })).toBe(1);
    await flush();

    expect(trigger).toHaveBeenCalledTimes(1);
  });

  it("still signals when after() throws outside a request scope", async () => {
    vi.mocked(after).mockImplementationOnce(() => {
      throw new Error("outside request");
    });

    await expect(notifyPlayers({ campaignId: "c1", userIds: ["u1"], items: [item] })).resolves.toBe(1);
    await Promise.resolve();

    expect(trigger).toHaveBeenCalledWith("private-notify-u1", "notifications-changed", { campaignId: "c1" });
  });
});

describe("notifyCharacterOwners", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    afterCallbacks.length = 0;
  });

  it("does not touch the db without events", async () => {
    expect(await notifyCharacterOwners({ campaignId: "c1", actorUserId: "dm", events: [] })).toBe(0);
    expect(db.character.findMany).not.toHaveBeenCalled();
  });

  it("notifies only active player characters of other users", async () => {
    db.character.findMany.mockResolvedValue([
      { id: "h1", controlledBy: "u1", type: "player", status: "active" },
      { id: "h2", controlledBy: "actor", type: "player", status: "active" },
      { id: "h3", controlledBy: "dm", type: "npc_hero", status: "active" },
      { id: "h4", controlledBy: "u2", type: "player", status: "pending" },
    ]);

    const events = ["h1", "h2", "h3", "h4"].map((characterId) => ({ characterId, type: "item" as const, refId: "a1" }));

    expect(await notifyCharacterOwners({ campaignId: "c1", actorUserId: "actor", events })).toBe(1);
    expect(db.playerNotification.createMany).toHaveBeenCalledWith({
      data: [{ userId: "u1", campaignId: "c1", type: "item", refId: "a1", href: "/campaigns/c1/character?tab=items" }],
      skipDuplicates: true,
    });
  });
});

describe("notifyCampaignPlayers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    afterCallbacks.length = 0;
  });

  it("notifies campaign players except the excluded user", async () => {
    db.campaignMember.findMany.mockResolvedValue([{ userId: "u1" }, { userId: "u2" }]);

    await notifyCampaignPlayers({ campaignId: "c1", items: [item], exceptUserId: "u2" });

    expect(db.campaignMember.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { campaignId: "c1", role: "player" } }));
    expect(db.playerNotification.createMany).toHaveBeenCalledWith({
      data: [{ userId: "u1", campaignId: "c1", ...item }],
      skipDuplicates: true,
    });
  });
});
