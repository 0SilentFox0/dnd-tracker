// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { notificationKeys, useNotificationsSync, useSeenOnOpen } from "..";

import { markNotificationsRead } from "@/lib/api/notifications";
import { usePusherChannel } from "@/lib/hooks/common/usePusherChannel";
import type { PlayerNotification } from "@/types/notifications";

vi.mock("@/lib/api/notifications", () => ({ getNotifications: vi.fn(), markNotificationsRead: vi.fn() }));
vi.mock("@/lib/hooks/common/usePusherChannel", () => ({ usePusherChannel: vi.fn() }));

const n = (type: PlayerNotification["type"], refId: string): PlayerNotification => ({ id: `${type}-${refId}`, type, refId, href: "/h", createdAt: "2026-10-28T00:00:00.000Z" });

const setup = (data?: PlayerNotification[]) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });

  if (data) client.setQueryData(notificationKeys.list("c1"), data);

  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

  return { client, wrapper };
};

describe("useSeenOnOpen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(markNotificationsRead).mockResolvedValue({ count: 2 });
  });

  it("captures unread refIds of the types, marks them read once, keeps the set", async () => {
    const { wrapper } = setup([n("item", "a1"), n("item", "a2"), n("level", "c:4")]);

    const { result } = renderHook(() => useSeenOnOpen("c1", { types: ["item"] }), { wrapper });

    await waitFor(() => expect(result.current).toEqual(new Set(["a1", "a2"])));
    await waitFor(() => expect(markNotificationsRead).toHaveBeenCalledTimes(1));
    expect(markNotificationsRead).toHaveBeenCalledWith("c1", { types: ["item"] });

    await new Promise((r) => setTimeout(r, 20));

    expect(result.current).toEqual(new Set(["a1", "a2"]));
    expect(markNotificationsRead).toHaveBeenCalledTimes(1);
  });

  it("does nothing when disabled", async () => {
    const { wrapper } = setup([n("item", "a1")]);

    const { result } = renderHook(() => useSeenOnOpen("c1", { types: ["item"], enabled: false }), { wrapper });

    await new Promise((r) => setTimeout(r, 20));

    expect(result.current.size).toBe(0);
    expect(markNotificationsRead).not.toHaveBeenCalled();
  });

  it("does not call the api without unread of those types", async () => {
    const { wrapper } = setup([n("level", "c:4")]);

    renderHook(() => useSeenOnOpen("c1", { types: ["item"] }), { wrapper });
    await new Promise((r) => setTimeout(r, 20));

    expect(markNotificationsRead).not.toHaveBeenCalled();
  });
});

describe("useNotificationsSync", () => {
  beforeEach(() => vi.clearAllMocks());

  const handlerFor = () => {
    const [, handlers] = vi.mocked(usePusherChannel).mock.calls.at(-1) as unknown as [string | null, Record<string, (d: unknown) => void>];

    return handlers["notifications-changed"];
  };

  it("invalidates the list for the same campaign only", () => {
    const { client, wrapper } = setup([]);

    const spy = vi.spyOn(client, "invalidateQueries");

    renderHook(() => useNotificationsSync("c1", "u1"), { wrapper });

    expect(vi.mocked(usePusherChannel).mock.calls.at(-1)?.[0]).toBe("private-notify-u1");

    handlerFor()({ campaignId: "c2" });
    expect(spy).not.toHaveBeenCalled();

    handlerFor()({ campaignId: "c1" });
    expect(spy).toHaveBeenCalledWith({ queryKey: notificationKeys.list("c1") });
  });

  it("uses a null channel without a user", () => {
    const { wrapper } = setup([]);

    renderHook(() => useNotificationsSync("c1", null), { wrapper });

    expect(vi.mocked(usePusherChannel).mock.calls.at(-1)?.[0]).toBeNull();
  });
});
