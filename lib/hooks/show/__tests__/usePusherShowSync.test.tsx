// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { usePusherShowSync } from "../usePusherShowSync";

import { worldKeys } from "@/lib/hooks/world/keys";

const captured = vi.hoisted(() => ({ handlers: {} as Record<string, (d: unknown) => void>, callbacks: {} as { onSubscribed?: () => void } }));

vi.mock("@/lib/hooks/common", async (orig) => ({
  ...(await orig<typeof import("@/lib/hooks/common")>()),
  usePusherChannel: (_name: string | null, handlers: Record<string, (d: unknown) => void>, callbacks: { onSubscribed?: () => void }) => {
    captured.handlers = handlers;
    captured.callbacks = callbacks;
  },
}));

const setup = () => {
  const queryClient = new QueryClient();

  const invalidate = vi.spyOn(queryClient, "invalidateQueries");

  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

  const hook = renderHook(() => usePusherShowSync("c1"), { wrapper });

  return { invalidate, ...hook };
};

const keysOf = (spy: ReturnType<typeof setup>["invalidate"]) => spy.mock.calls.map((c) => c[0]?.queryKey);

const event = (seq: number) => ({ campaignId: "c1", mapId: "m1", seq });

describe("usePusherShowSync world-changed", () => {
  beforeEach(() => vi.useFakeTimers());

  afterEach(() => vi.useRealTimers());

  it("3 події за 200 мс — одна інвалідація світу", () => {
    const { invalidate } = setup();

    for (const seq of [1, 2, 3]) {
      captured.handlers["world-changed"](event(seq));
      vi.advanceTimersByTime(60);
    }

    expect(invalidate).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);

    expect(keysOf(invalidate)).toEqual([worldKeys.viewAll("c1"), worldKeys.mapAll("c1"), worldKeys.maps("c1"), worldKeys.log("c1")]);
  });

  it("повтор того ж seq ігнорується", () => {
    const { invalidate } = setup();

    captured.handlers["world-changed"](event(5));
    vi.advanceTimersByTime(1000);
    invalidate.mockClear();

    captured.handlers["world-changed"](event(5));
    vi.advanceTimersByTime(1000);

    expect(invalidate).not.toHaveBeenCalled();
  });

  it("сміття без seq ігнорується", () => {
    const { invalidate } = setup();

    captured.handlers["world-changed"](null);
    captured.handlers["world-changed"]({ campaignId: "c1" });
    vi.advanceTimersByTime(1000);

    expect(invalidate).not.toHaveBeenCalled();
  });

  it("unmount скасовує таймер", () => {
    const { invalidate, unmount } = setup();

    captured.handlers["world-changed"](event(1));
    unmount();
    vi.advanceTimersByTime(2000);

    expect(invalidate).not.toHaveBeenCalled();
  });

  it("onSubscribed інвалідовує і показ, і world view", () => {
    const { invalidate } = setup();

    captured.callbacks.onSubscribed?.();

    expect(keysOf(invalidate)).toContainEqual(worldKeys.viewAll("c1"));
    expect(invalidate).toHaveBeenCalledTimes(2);
  });
});
