// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { worldKeys } from "../keys";
import { useWorldNotes } from "../useWorldNotes";
import { useWorldTravel } from "../useWorldTravel";
import { useWorldView } from "../useWorldView";

import { deleteWorldNote, getWorldView, restHeroes, travelHeroes } from "@/lib/api/world";
import { characterKeys } from "@/lib/hooks/characters/keys";
import type { WorldNote, WorldView } from "@/types/world";

const notifyMock = vi.fn();

vi.mock("@/lib/api/world", () => ({ getWorldView: vi.fn(), travelHeroes: vi.fn(), restHeroes: vi.fn(), enterMarker: vi.fn(), exitMap: vi.fn(), deleteWorldNote: vi.fn(), createWorldNote: vi.fn(), updateWorldNote: vi.fn() }));
vi.mock("@/lib/hooks/common/useNotify", () => ({ useOptionalNotify: () => notifyMock }));

const note = (id: string): WorldNote => ({ id, markerId: "m", authorUserId: "u", authorName: "A", characterId: null, visibility: "public", text: id, mine: true, createdAt: "", updatedAt: "" });

const view = { notes: [note("n1"), note("n2")] } as WorldView;

let client: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.clearAllMocks();
});

describe("useWorldView", () => {
  it("is idle without a map and fetches with the hero id otherwise", async () => {
    vi.mocked(getWorldView).mockResolvedValue(view);

    const idle = renderHook(() => useWorldView("c1", { mapId: null }), { wrapper });

    expect(idle.result.current.fetchStatus).toBe("idle");

    const { result } = renderHook(() => useWorldView("c1", { mapId: "m1", asHeroId: "h1" }), { wrapper });

    await waitFor(() => expect(result.current.data).toBe(view));
    expect(getWorldView).toHaveBeenCalledWith("c1", { mapId: "m1", asHeroId: "h1" });
  });
});

describe("useWorldTravel", () => {
  it("invalidates view and log after travel", async () => {
    vi.mocked(travelHeroes).mockResolvedValue({ ok: true, positions: [] });

    const spy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useWorldTravel("c1"), { wrapper });

    await act(async () => void (await result.current.travel.mutateOk({ mapId: "m1", characterIds: ["h"], to: { x: 0, y: 0 }, rest: "none" })));

    const keys = spy.mock.calls.map(([f]) => f?.queryKey);

    expect(keys).toContainEqual(["world-view", "c1"]);
    expect(keys).toContainEqual(worldKeys.mapAll("c1"));
    expect(keys).toContainEqual(worldKeys.log("c1"));
  });

  it("rest calls restHeroes and invalidates world log and character caches", async () => {
    vi.mocked(restHeroes).mockResolvedValue({ ok: true, applied: true });

    const spy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useWorldTravel("c1"), { wrapper });

    await act(async () => void (await result.current.rest.mutateOk({ mapId: "m1", characterIds: ["h"], kind: "long" })));

    const keys = spy.mock.calls.map(([f]) => f?.queryKey);

    expect(restHeroes).toHaveBeenCalledWith("c1", { mapId: "m1", characterIds: ["h"], kind: "long" });
    expect(keys).toContainEqual(worldKeys.log("c1"));
    expect(keys).toContainEqual(characterKeys.sheet("c1"));
    expect(keys).toContainEqual(characterKeys.lists("c1"));
    expect(keys).toContainEqual(characterKeys.logs("c1"));
  });

  it("travel with a rest also invalidates character caches, without it does not", async () => {
    vi.mocked(travelHeroes).mockResolvedValue({ ok: true, positions: [] });

    const spy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useWorldTravel("c1"), { wrapper });

    await act(async () => void (await result.current.travel.mutateOk({ mapId: "m1", characterIds: ["h"], to: { x: 0, y: 0 }, rest: "none" })));

    expect(spy.mock.calls.map(([f]) => f?.queryKey)).not.toContainEqual(characterKeys.sheet("c1"));

    await act(async () => void (await result.current.travel.mutateOk({ mapId: "m1", characterIds: ["h"], to: { x: 0, y: 0 }, rest: "short" })));

    expect(spy.mock.calls.map(([f]) => f?.queryKey)).toContainEqual(characterKeys.sheet("c1"));
  });

  it("notifies the error text on failure", async () => {
    vi.mocked(travelHeroes).mockRejectedValue(new Error("x"));

    const { result } = renderHook(() => useWorldTravel("c1"), { wrapper });

    await act(async () => void (await result.current.travel.mutateOk({ mapId: "m1", characterIds: ["h"], to: { x: 0, y: 0 }, rest: "none" })));

    expect(notifyMock).toHaveBeenCalledWith("Не вдалося перемістити героїв");
  });
});

describe("useWorldNotes", () => {
  it("removes a note optimistically and restores it on error", async () => {
    client.setQueryData(worldKeys.view("c1", "m1"), view);
    vi.mocked(deleteWorldNote).mockRejectedValue(new Error("x"));

    const { result } = renderHook(() => useWorldNotes("c1", "m1"), { wrapper });

    await act(async () => void (await result.current.remove.mutateOk("n1")));

    expect(client.getQueryData<WorldView>(worldKeys.view("c1", "m1"))?.notes.map((n) => n.id)).toEqual(["n1", "n2"]);
  });

  it("drops the note from the cache on success", async () => {
    client.setQueryData(worldKeys.view("c1", "m1"), view);

    let release!: () => void;

    vi.mocked(deleteWorldNote).mockReturnValue(new Promise((r) => (release = () => r({ ok: true }))));

    const { result } = renderHook(() => useWorldNotes("c1", "m1"), { wrapper });

    let pending!: Promise<boolean>;

    await act(async () => void (pending = result.current.remove.mutateOk("n1")));
    expect(client.getQueryData<WorldView>(worldKeys.view("c1", "m1"))?.notes.map((n) => n.id)).toEqual(["n2"]);

    await act(async () => {
      release();
      await pending;
    });
  });
});
