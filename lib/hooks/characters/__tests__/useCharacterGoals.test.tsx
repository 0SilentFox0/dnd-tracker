// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ putCharacterGoals: vi.fn() }));

vi.mock("@/lib/api/characters", () => api);
vi.mock("@/lib/hooks/common", () => ({ useNotify: () => vi.fn() }));

import { characterSheetKey, useCharacterGoals } from "@/lib/hooks/characters";

describe("useCharacterGoals", () => {
  it("після збереження кладе цілі з відповіді сервера в кеш листа", async () => {
    api.putCharacterGoals.mockResolvedValue({ goals: [{ id: "p", text: "Нова", status: "active", author: "player" }] });

    const qc = new QueryClient();

    qc.setQueryData(characterSheetKey("c", "ch"), { story: { biography: null, goals: [] } });

    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

    const { result } = renderHook(() => useCharacterGoals("c", "ch"), { wrapper });

    await act(() => result.current.save([{ id: "p", text: "Нова", status: "active" }]));

    expect(qc.getQueryData<{ story: { goals: unknown[] } }>(characterSheetKey("c", "ch"))?.story.goals).toEqual([{ id: "p", text: "Нова", status: "active", author: "player" }]);
  });

  it("оновлює кеш одразу, а при помилці повертає як було", async () => {
    let reject: (e: Error) => void = () => {};

    api.putCharacterGoals.mockReturnValue(new Promise((_, r) => (reject = r)));

    const qc = new QueryClient();

    const before = { viewer: { isDM: true, isOwner: false }, story: { biography: null, goals: [{ id: "d", text: "ДМ", status: "active", author: "dm" }] } };

    qc.setQueryData(characterSheetKey("c", "ch"), before);

    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

    const { result } = renderHook(() => useCharacterGoals("c", "ch"), { wrapper });

    let done: Promise<boolean> = Promise.resolve(true);

    act(() => {
      done = result.current.save([{ id: "d", text: "ДМ", status: "done", author: "dm" }]);
    });

    await waitFor(() => expect(qc.getQueryData<typeof before>(characterSheetKey("c", "ch"))?.story.goals[0].status).toBe("done"));

    await act(async () => {
      reject(new Error("offline"));
      await done;
    });

    expect(qc.getQueryData(characterSheetKey("c", "ch"))).toEqual(before);
  });
});
