// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PUSHER_AUTH_ENDPOINT } from "@/lib/pusher-channels";

const PusherClient = vi.hoisted(() => vi.fn());

vi.mock("pusher-js", () => ({ default: PusherClient }));
vi.mock("pusher", () => ({ default: vi.fn() }));

describe("getPusherClient", () => {
  beforeEach(() => {
    vi.resetModules();
    PusherClient.mockClear();
    process.env.NEXT_PUBLIC_PUSHER_KEY = "key";
  });

  it("приватні канали авторизуються через наш auth route", async () => {
    const { getPusherClient } = await import("@/lib/pusher");

    getPusherClient();

    expect(PUSHER_AUTH_ENDPOINT).toBe("/api/pusher/auth");
    expect(PusherClient).toHaveBeenCalledWith("key", expect.objectContaining({
      channelAuthorization: { endpoint: PUSHER_AUTH_ENDPOINT, transport: "ajax" },
    }));
  });
});
