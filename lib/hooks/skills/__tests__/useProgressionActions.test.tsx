// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as api from "@/lib/api/character-progression";
import { ApiError } from "@/lib/api/client";
import { progressionKey, useProgressionActions } from "@/lib/hooks/skills";

vi.mock("@/lib/api/character-progression");

const notify = vi.fn(async () => {});

vi.mock("@/lib/hooks/common", () => ({ useNotify: () => notify }));

afterEach(cleanup);

function setup() {
  const qc = new QueryClient();

  qc.setQueryData(progressionKey("camp", "ch"), { unlocked: ["a"], level: 3 });
  qc.setQueryData(["character", "camp", "ch"], { id: "ch", skillTreeProgress: {} });

  const invalidate = vi.spyOn(qc, "invalidateQueries");

  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

  return { qc, invalidate, ...renderHook(() => useProgressionActions("camp", "ch"), { wrapper }) };
}

describe("useProgressionActions", () => {
  it("learn патчить кеш прогресу без рефетчу й інвалідує лист персонажа", async () => {
    vi.mocked(api.learnNode).mockResolvedValue({ unlocked: ["a", "b"] });

    const { qc, invalidate, result } = setup();

    await act(() => result.current.learn("b"));

    expect(qc.getQueryData<{ unlocked: string[] }>(progressionKey("camp", "ch"))?.unlocked).toEqual(["a", "b"]);
    expect(invalidate).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["character-sheet", "camp", "ch"] }));
    expect(invalidate).not.toHaveBeenCalledWith(expect.objectContaining({ queryKey: progressionKey("camp", "ch") }));
  });

  it("learn зливає skillTreeProgress[treeId] у кеші персонажа, не стираючи інші дерева й поля", async () => {
    vi.mocked(api.learnNode).mockResolvedValue({ unlocked: ["a", "b"] });

    const { qc, result } = setup();

    qc.setQueryData(progressionKey("camp", "ch"), { treeId: "t1", unlocked: ["a"], level: 3 });
    qc.setQueryData(["character", "camp", "ch"], { id: "ch", skillTreeProgress: { other: { unlockedSkills: ["x"] }, t1: { level: "basic", unlockedSkills: ["a"] } } });

    await act(() => result.current.learn("b"));

    expect(qc.getQueryData<{ skillTreeProgress: unknown }>(["character", "camp", "ch"])?.skillTreeProgress).toEqual({
      other: { unlockedSkills: ["x"] },
      t1: { level: "basic", unlockedSkills: ["a", "b"] },
    });
  });

  it("unlearn шле всі вузли одним запитом", async () => {
    vi.mocked(api.unlearnNodes).mockResolvedValue({ unlocked: [] });

    const { result } = setup();

    await act(() => result.current.unlearn(["x", "y"]));

    expect(api.unlearnNodes).toHaveBeenCalledWith("camp", "ch", ["x", "y"]);
  });

  it("409 → інвалідує прогрес і повідомляє", async () => {
    vi.mocked(api.learnNode).mockRejectedValue(new ApiError("conflict", 409, "/x", {}));

    const { invalidate, result } = setup();

    await act(() => result.current.learn("b"));

    expect(invalidate).toHaveBeenCalledWith(expect.objectContaining({ queryKey: progressionKey("camp", "ch") }));
    expect(notify).toHaveBeenCalledWith("Прогрес змінився — оновлено");
  });

  it("422 → текст причини", async () => {
    vi.mocked(api.learnNode).mockRejectedValue(new ApiError("rule", 422, "/x", { reason: "needOuter" }));

    const { result } = setup();

    await act(() => result.current.learn("b"));

    expect(notify).toHaveBeenCalledWith("Потрібне хоча б одне вміння зовнішнього кола цієї гілки");
  });

  it("подвійний тап: другий виклик під час першого не надсилає запит", async () => {
    let resolve: (v: { unlocked: string[] }) => void = () => {};

    vi.mocked(api.learnNode).mockClear();
    vi.mocked(api.learnNode).mockImplementation(() => new Promise((r) => (resolve = r)));

    const { result } = setup();

    let first: Promise<boolean> = Promise.resolve(false);

    let second = true;

    await act(async () => {
      first = result.current.learn("b");
      second = await result.current.learn("b");
    });
    await act(async () => {
      resolve({ unlocked: ["a", "b"] });
      await first;
    });

    expect(api.learnNode).toHaveBeenCalledTimes(1);
    expect(second).toBe(false);
  });
});
