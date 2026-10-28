import { beforeEach, describe, expect, it, vi } from "vitest";

const trigger = vi.hoisted(() => vi.fn(async () => undefined));

const afterCallbacks = vi.hoisted(() => [] as Array<() => unknown>);

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ after: (cb: () => unknown) => afterCallbacks.push(cb) }));
vi.mock("@/lib/pusher/server", () => ({ pusherServer: { trigger } }));

import { publishWorldChanged } from "../world-events";

const flush = () => Promise.all(afterCallbacks.splice(0).map((cb) => cb()));

describe("publishWorldChanged", () => {
  beforeEach(() => vi.clearAllMocks());

  it("шле в канал показу лише campaignId, mapId і seq", async () => {
    publishWorldChanged("c1", "m1");

    expect(trigger).not.toHaveBeenCalled();

    await flush();

    expect(trigger).toHaveBeenCalledExactlyOnceWith("private-show-c1", "world-changed", { campaignId: "c1", mapId: "m1", seq: expect.any(Number) });
    expect(Object.keys((trigger.mock.calls[0] as unknown[])[2] as object).sort()).toEqual(["campaignId", "mapId", "seq"]);
  });

  it("seq строго зростає навіть у межах однієї мілісекунди; mapId може бути null", async () => {
    publishWorldChanged("c1", null);
    publishWorldChanged("c1", null);
    await flush();

    const [a, b] = (trigger.mock.calls as unknown as [string, string, { seq: number; mapId: null }][]).map((c) => c[2]);

    expect(b.seq).toBeGreaterThan(a.seq);
    expect(a.mapId).toBeNull();
  });
});
