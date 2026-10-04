import { afterEach, describe, expect, it, vi } from "vitest";

import { getPusherCluster } from "@/lib/pusher-config";

describe("getPusherCluster", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("повертає eu, якщо змінна не задана", () => {
    vi.stubEnv("NEXT_PUBLIC_PUSHER_CLUSTER", "");

    expect(getPusherCluster()).toBe("eu");
  });

  it("повертає значення змінної, якщо вона задана", () => {
    vi.stubEnv("NEXT_PUBLIC_PUSHER_CLUSTER", "ap2");

    expect(getPusherCluster()).toBe("ap2");
  });

  it("ігнорує пробіли", () => {
    vi.stubEnv("NEXT_PUBLIC_PUSHER_CLUSTER", "   ");

    expect(getPusherCluster()).toBe("eu");
  });
});
