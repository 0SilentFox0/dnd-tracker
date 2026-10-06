import { beforeEach, describe, expect, it, vi } from "vitest";

import { battleChannelName, userChannelName } from "@/lib/pusher-channels";

const authorizeChannel = vi.hoisted(() => vi.fn(() => ({ auth: "signed" })));

const getUser = vi.hoisted(() => vi.fn());

const findBattle = vi.hoisted(() => vi.fn());

vi.mock("@/lib/pusher", async () => ({
  ...(await vi.importActual<object>("@/lib/pusher-channels")),
  pusherServer: { authorizeChannel },
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser } }) }));
vi.mock("@/lib/db", () => ({ prisma: { battleScene: { findUnique: findBattle } } }));

import { POST } from "@/app/api/pusher/auth/route";

const MEMBER = "u-member";

const auth = (channel_name: string) =>
  POST(new Request("http://x", { method: "POST", body: JSON.stringify({ socket_id: "1.2", channel_name }) }));

describe("POST /api/pusher/auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: MEMBER } } });
    findBattle.mockImplementation(async (args: { where: { id: string }; select: { campaign: { select: { members: { where: { userId: string } } } } } }) => {
      if (args.where.id !== "b-own") return null;

      const userId = args.select.campaign.select.members.where.userId;

      return { campaignId: "c1", campaign: { members: userId === MEMBER ? [{ userId }] : [] } };
    });
  });

  it("без сесії — 401", async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    expect((await auth(battleChannelName("b-own"))).status).toBe(401);
  });

  it("член кампанії бою — підписує канал", async () => {
    const res = await auth(battleChannelName("b-own"));

    expect(res.status).toBe(200);
    expect(authorizeChannel).toHaveBeenCalledWith("1.2", battleChannelName("b-own"), expect.objectContaining({ user_id: MEMBER }));
  });

  it("не член кампанії бою — 403", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u-stranger" } } });

    expect((await auth(battleChannelName("b-own"))).status).toBe(403);
    expect(authorizeChannel).not.toHaveBeenCalled();
  });

  it("неіснуючий бій — 403", async () => {
    expect((await auth(battleChannelName("b-missing"))).status).toBe(403);
  });

  it("власний user-канал — так, чужий — 403", async () => {
    expect((await auth(userChannelName(MEMBER))).status).toBe(200);
    expect((await auth(userChannelName("u-other"))).status).toBe(403);
  });

  it("невідомий префікс — 403", async () => {
    expect((await auth("presence-anything")).status).toBe(403);
  });

  it("форма від pusher-js (ajax, x-www-form-urlencoded) — підписує канал", async () => {
    const body = new URLSearchParams({ socket_id: "1.2", channel_name: battleChannelName("b-own") });

    const res = await POST(new Request("http://x", { method: "POST", body, headers: { "Content-Type": "application/x-www-form-urlencoded" } }));

    expect(res.status).toBe(200);
    expect(authorizeChannel).toHaveBeenCalledWith("1.2", battleChannelName("b-own"), expect.anything());
  });

  it("без socket_id — 400", async () => {
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ channel_name: "x" }) }));

    expect(res.status).toBe(400);
  });
});
