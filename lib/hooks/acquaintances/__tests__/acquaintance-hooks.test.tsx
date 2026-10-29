// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { acquaintanceKeys, useAcquaintanceActions, useAcquaintanceNote, useAcquaintances } from "..";

import { createAcquaintance, getAcquaintances, saveAcquaintanceNote } from "@/lib/api/acquaintances";
import type { AcquaintancesResponse, AcquaintanceView } from "@/types/acquaintances";

const notify = vi.hoisted(() => vi.fn());

vi.mock("@/lib/hooks/common", async (orig) => ({ ...(await orig<typeof import("@/lib/hooks/common")>()), useOptionalNotify: () => notify }));
vi.mock("@/lib/api/acquaintances", () => ({
  getAcquaintances: vi.fn(),
  createAcquaintance: vi.fn(),
  updateAcquaintance: vi.fn(),
  deleteAcquaintance: vi.fn(),
  createAcquaintanceEntry: vi.fn(),
  updateAcquaintanceEntry: vi.fn(),
  deleteAcquaintanceEntry: vi.fn(),
  saveAcquaintanceNote: vi.fn(),
}));

const view = (over: Partial<AcquaintanceView> = {}): AcquaintanceView => ({
  id: "a1",
  kind: "micro",
  characterId: null,
  name: "Ярема",
  avatarUrl: null,
  description: "",
  sourcePageId: "p1",
  sourceSectionId: "s1",
  hidden: false,
  entries: [],
  notes: [{ id: "n1", authorUserId: "u1", authorName: "Аня", text: "стара", updatedAt: "2026-10-28T00:00:00.000Z", own: true }],
  ...over,
});

const response = (): AcquaintancesResponse => ({ isDM: false, enabled: true, items: [view()] });

const setup = (data?: AcquaintancesResponse) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });

  if (data) client.setQueryData(acquaintanceKeys.list("c1"), data);

  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

  return { client, wrapper };
};

beforeEach(() => vi.clearAllMocks());

describe("useAcquaintances", () => {
  it("loads under acquaintanceKeys.list", async () => {
    vi.mocked(getAcquaintances).mockResolvedValue(response());

    const { client, wrapper } = setup();

    const { result } = renderHook(() => useAcquaintances("c1"), { wrapper });

    await waitFor(() => expect(result.current.data?.items).toHaveLength(1));
    expect(client.getQueryData(acquaintanceKeys.list("c1"))).toEqual(response());
  });

  it("does not fetch when disabled", () => {
    const { wrapper } = setup();

    renderHook(() => useAcquaintances("c1", { enabled: false }), { wrapper });

    expect(getAcquaintances).not.toHaveBeenCalled();
  });
});

describe("useAcquaintanceActions", () => {
  it("create resolves with the new view and invalidates the list", async () => {
    vi.mocked(createAcquaintance).mockResolvedValue(view({ id: "a2" }));

    const { client, wrapper } = setup(response());

    const invalidate = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useAcquaintanceActions("c1"), { wrapper });

    let created: AcquaintanceView | undefined;

    await act(async () => {
      created = await result.current.create.mutateAsync({ kind: "micro", name: "Нове", description: "", sourcePageId: "p1", sourceSectionId: "s1" });
    });

    expect(created?.id).toBe("a2");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: acquaintanceKeys.list("c1") });
  });
});

describe("useAcquaintanceNote", () => {
  const ownNotes = (client: QueryClient) => client.getQueryData<AcquaintancesResponse>(acquaintanceKeys.list("c1"))?.items[0].notes.filter((n) => n.own);

  it("removes the own note from the cache optimistically for an empty text", async () => {
    let finish: (v: unknown) => void = () => {};

    vi.mocked(saveAcquaintanceNote).mockReturnValue(new Promise((r) => (finish = r)) as never);

    const { client, wrapper } = setup(response());

    const { result } = renderHook(() => useAcquaintanceNote("c1", "a1"), { wrapper });

    let pending: Promise<void> = Promise.resolve();

    act(() => {
      pending = result.current.save("");
    });

    await waitFor(() => expect(ownNotes(client)).toEqual([]));

    await act(async () => {
      finish({ deleted: true });
      await pending;
    });
  });

  it("puts the new text into the own note optimistically", async () => {
    vi.mocked(saveAcquaintanceNote).mockReturnValue(new Promise(() => {}) as never);

    const { client, wrapper } = setup(response());

    const { result } = renderHook(() => useAcquaintanceNote("c1", "a1"), { wrapper });

    act(() => void result.current.save("нова"));

    await waitFor(() => expect(ownNotes(client)?.map((n) => n.text)).toEqual(["нова"]));
  });

  it("restores the previous state when saving fails", async () => {
    vi.mocked(saveAcquaintanceNote).mockRejectedValue(new Error("boom"));

    const { client, wrapper } = setup(response());

    const { result } = renderHook(() => useAcquaintanceNote("c1", "a1"), { wrapper });

    await act(async () => {
      await result.current.save("");
    });

    expect(ownNotes(client)?.map((n) => n.text)).toEqual(["стара"]);
  });

  it("tells the user when saving fails", async () => {
    vi.mocked(saveAcquaintanceNote).mockRejectedValue(new Error("boom"));

    const { wrapper } = setup(response());

    const { result } = renderHook(() => useAcquaintanceNote("c1", "a1"), { wrapper });

    await act(async () => {
      await result.current.save("текст");
    });

    expect(notify).toHaveBeenCalledWith("acquaintances.notify.noteSaveFailed");
  });
});
