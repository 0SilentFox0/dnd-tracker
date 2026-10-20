// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useMusicLibrary } from "../useMusicLibrary";

import { deleteTrack, reorderTracks, updateTrack } from "@/lib/api/tracks";
import { ConfirmContext } from "@/lib/hooks/common";
import type { CampaignTrack } from "@/types/audio";

vi.mock("@/lib/api/tracks", () => ({
  getTracks: vi.fn(),
  createTrack: vi.fn(),
  updateTrack: vi.fn(),
  deleteTrack: vi.fn(async () => ({ ok: true })),
  reorderTracks: vi.fn(async (_c: string, ids: string[]) => ids.map((id) => ({ id }))),
  uploadTrackFile: vi.fn(),
}));

const tracks = ["a", "b"].map((id, i) => ({ id, title: id, kind: "file", url: null, youtubeId: null, durationSec: null, sortOrder: i, createdAt: "" })) as CampaignTrack[];

const confirm = vi.fn(async () => false);

function wrapper(answer: boolean) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  confirm.mockImplementation(async () => answer);

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <ConfirmContext.Provider value={confirm}>{children}</ConfirmContext.Provider>
    </QueryClientProvider>
  );

  return Wrapper;
}

describe("useMusicLibrary", () => {
  it("видалення лише після підтвердження", async () => {
    const no = renderHook(() => useMusicLibrary("c1", tracks), { wrapper: wrapper(false) });

    await act(() => no.result.current.remove(tracks[0]));
    expect(deleteTrack).not.toHaveBeenCalled();

    const yes = renderHook(() => useMusicLibrary("c1", tracks), { wrapper: wrapper(true) });

    await act(() => yes.result.current.remove(tracks[0]));
    await waitFor(() => expect(deleteTrack).toHaveBeenCalledWith("c1", "a"));
  });

  it("підтвердження видалення файлу каже, що музика зупиниться для всіх; YouTube — лише зникне з бібліотеки", async () => {
    const { result } = renderHook(() => useMusicLibrary("c1", tracks), { wrapper: wrapper(false) });

    await act(() => result.current.remove(tracks[0]));
    expect(confirm).toHaveBeenLastCalledWith(expect.objectContaining({ description: expect.stringContaining("зупиниться для всіх") }));

    await act(() => result.current.remove({ ...tracks[1], kind: "youtube", youtubeId: "dQw4w9WgXcQ" }));
    expect(confirm).toHaveBeenLastCalledWith(expect.objectContaining({ description: "Трек зникне з бібліотеки." }));
  });

  it("move шле повний новий порядок", async () => {
    const { result } = renderHook(() => useMusicLibrary("c1", tracks), { wrapper: wrapper(true) });

    act(() => result.current.move("a", 1));

    await waitFor(() => expect(reorderTracks).toHaveBeenCalledWith("c1", ["b", "a"]));
  });

  it("update шле лише змінені поля й повертає true", async () => {
    const { result } = renderHook(() => useMusicLibrary("c1", tracks), { wrapper: wrapper(true) });

    let ok = false;

    await act(async () => {
      ok = await result.current.update("a", { title: "Люди - Битва 1", durationSec: 90 });
    });

    expect(ok).toBe(true);
    expect(updateTrack).toHaveBeenCalledWith("c1", "a", { title: "Люди - Битва 1", durationSec: 90 });
  });
});
