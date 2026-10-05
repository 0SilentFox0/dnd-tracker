import { describe, expect, it, vi } from "vitest";

const afterCallbacks: Array<() => unknown> = [];

const resolvers: Array<() => void> = [];

const trigger = vi.fn(
  () =>
    new Promise<void>((resolve) => {
      resolvers.push(resolve);
    }),
);

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (cb: () => unknown) => afterCallbacks.push(cb),
}));

vi.mock("@/lib/pusher", () => ({ pusherServer: { trigger } }));

describe("defaultPipelineDeps.publish", () => {
  it("один after(), чий проміс завершується лише після всіх відправок у Pusher", async () => {
    const { defaultPipelineDeps } = await import("@/lib/utils/battle/pipeline/default-deps");

    defaultPipelineDeps.publish([
      { channel: "private-battle-b1", event: "battle-updated", payload: {} },
      { channel: "private-user-u1", event: "turn-started", payload: {} },
    ]);

    expect(afterCallbacks).toHaveLength(1);

    const pending = afterCallbacks[0]() as Promise<unknown>;

    expect(pending).toBeInstanceOf(Promise);

    let done = false;

    void pending.then(() => {
      done = true;
    });
    await Promise.resolve();
    expect(done).toBe(false);

    resolvers.forEach((r) => r());
    await pending;
    expect(done).toBe(true);
    expect(trigger).toHaveBeenCalledWith("private-battle-b1", "battle-updated", {});
    expect(trigger).toHaveBeenCalledWith("private-user-u1", "turn-started", {});
  });
});
