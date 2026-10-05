import { beforeEach, describe, expect, it, vi } from "vitest";

const afterCallbacks: Array<() => unknown> = [];

let resolveTrigger: () => void = () => {};

const trigger = vi.fn(
  () =>
    new Promise<void>((resolve) => {
      resolveTrigger = resolve;
    }),
);

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (cb: () => unknown) => afterCallbacks.push(cb),
}));

vi.mock("@/lib/pusher", () => ({ pusherServer: { trigger } }));

describe("defaultPipelineDeps.publish", () => {
  beforeEach(() => {
    afterCallbacks.length = 0;
  });

  it("after() отримує проміс, що завершується лише після відповіді Pusher", async () => {
    const { defaultPipelineDeps } = await import("@/lib/utils/battle/pipeline/default-deps");

    defaultPipelineDeps.publish("b1", { battleId: "b1", version: 1, refetch: true });

    expect(afterCallbacks).toHaveLength(1);

    const pending = afterCallbacks[0]();

    expect(pending).toBeInstanceOf(Promise);

    let done = false;

    void (pending as Promise<unknown>).then(() => {
      done = true;
    });
    await Promise.resolve();
    expect(done).toBe(false);

    resolveTrigger();
    await pending;
    expect(done).toBe(true);
    expect(trigger).toHaveBeenCalledWith("private-battle-b1", "battle-delta", expect.anything());
  });
});
