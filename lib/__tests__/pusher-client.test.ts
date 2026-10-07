// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PUSHER_AUTH_ENDPOINT } from "@/lib/pusher-channels";

const PusherClient = vi.hoisted(() => vi.fn());

vi.mock("pusher-js", () => ({ default: PusherClient }));
vi.mock("pusher", () => {
  throw new Error("server pusher SDK must not reach the client module");
});
vi.mock("server-only", () => {
  throw new Error("client module must not import server-only code");
});

describe("getPusherClient", () => {
  beforeEach(() => {
    vi.resetModules();
    PusherClient.mockClear();
    process.env.NEXT_PUBLIC_PUSHER_KEY = "key";
  });

  it("приватні канали авторизуються через наш auth route", async () => {
    const { getPusherClient } = await import("@/lib/pusher-client");

    getPusherClient();

    expect(PUSHER_AUTH_ENDPOINT).toBe("/api/pusher/auth");
    expect(PusherClient).toHaveBeenCalledWith("key", expect.objectContaining({
      channelAuthorization: { endpoint: PUSHER_AUTH_ENDPOINT, transport: "ajax" },
    }));
  });

  it("один інстанс на вкладку", async () => {
    const { getPusherClient } = await import("@/lib/pusher-client");

    expect(getPusherClient()).toBe(getPusherClient());
    expect(PusherClient).toHaveBeenCalledTimes(1);
  });

  it("без ключа — null", async () => {
    delete process.env.NEXT_PUBLIC_PUSHER_KEY;

    const { getPusherClient } = await import("@/lib/pusher-client");

    expect(getPusherClient()).toBeNull();
  });
});
