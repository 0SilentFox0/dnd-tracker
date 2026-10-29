import { beforeEach, describe, expect, it, vi } from "vitest";

const { authorizeChannel, getSessionUserId, isChannelAllowedForUser } = vi.hoisted(() => ({
  authorizeChannel: vi.fn(),
  getSessionUserId: vi.fn(),
  isChannelAllowedForUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/auth", () => ({ getSessionUserId }));
vi.mock("@/lib/pusher/server", () => ({ pusherServer: { authorizeChannel } }));
vi.mock("../channel-access", () => ({ isChannelAllowedForUser }));

import { POST } from "../route";

const request = () =>
  new Request("http://localhost/api/pusher/auth", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "socket_id=1.2&channel_name=private-notify-u1",
  });

describe("POST /api/pusher/auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUserId.mockResolvedValue("u1");
    isChannelAllowedForUser.mockResolvedValue(true);
    authorizeChannel.mockReturnValue({ auth: "k:sig" });
  });

  it("does not expose the internal user id as user_info", async () => {
    await POST(request());

    expect(authorizeChannel).toHaveBeenCalledWith("1.2", "private-notify-u1", { user_id: "u1", user_info: {} });
  });

  it("answers with a generic internal error when authorization throws", async () => {
    authorizeChannel.mockImplementation(() => {
      throw new Error("secret details");
    });

    const res = await POST(request());

    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("secret details");
  });
});
