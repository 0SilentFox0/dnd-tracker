// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as api from "@/lib/api/character-progression";
import { ApiError } from "@/lib/api/client";
import { characterSheetKey } from "@/lib/hooks/characters";
import { progressionKey, useProgressionActions } from "@/lib/hooks/skills";
import { buildTreeJson } from "@/lib/utils/skills/progression";
import type { CharacterSheet } from "@/types/characters";

vi.mock("@/lib/api/character-progression");

const notify = vi.fn(async () => {});

vi.mock("@/lib/hooks/common", () => ({ useNotify: () => notify }));

afterEach(cleanup);

const TREE_JSON = buildTreeJson({ id: "json-tree", race: "Ельф", branches: [{ id: "attack", name: "Напад", color: "red", levels: { basic: "atk-b" }, outer: ["o1"], middle: [], inner: [] }] });

function setup() {
  const qc = new QueryClient();

  qc.setQueryData(progressionKey("camp", "ch"), { unlocked: ["a"], level: 3 });
  qc.setQueryData(["character", "camp", "ch"], { id: "ch", skillTreeProgress: {} });

  const invalidate = vi.spyOn(qc, "invalidateQueries");

  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

  return { qc, invalidate, ...renderHook(() => useProgressionActions("camp", "ch"), { wrapper }) };
}

describe("useProgressionActions", () => {
  it("learn патчить кеш прогресу без рефетчу й одразу оновлює вільні очки в листі", async () => {
    vi.mocked(api.learnNode).mockResolvedValue({ unlocked: ["attack_basic_level", "o1"] });

    const { qc, invalidate, result } = setup();

    qc.setQueryData(progressionKey("camp", "ch"), { treeId: "t1", race: "Ельф", tree: TREE_JSON, unlocked: ["attack_basic_level"], level: 3 });
    qc.setQueryData(characterSheetKey("camp", "ch"), { progression: { freePoints: 2, level: 3, seenLevel: null } });

    await act(() => result.current.learn("o1"));

    expect(qc.getQueryData<{ unlocked: string[] }>(progressionKey("camp", "ch"))?.unlocked).toEqual(["attack_basic_level", "o1"]);
    expect(qc.getQueryData<CharacterSheet>(characterSheetKey("camp", "ch"))?.progression).toEqual({ freePoints: 1, level: 3, seenLevel: null });
    expect(invalidate).not.toHaveBeenCalledWith(expect.objectContaining({ queryKey: progressionKey("camp", "ch") }));
  });

  it("серія дій інвалідує лист один раз — через 1 с після останньої", async () => {
    vi.useFakeTimers();
    vi.mocked(api.learnNode).mockResolvedValue({ unlocked: ["a", "b"] });

    const { invalidate, result } = setup();

    const sheetInvalidations = () => invalidate.mock.calls.filter(([f]) => JSON.stringify(f?.queryKey) === JSON.stringify(characterSheetKey("camp", "ch"))).length;

    await act(() => result.current.learn("b"));
    act(() => vi.advanceTimersByTime(600));
    await act(() => result.current.learn("c"));
    act(() => vi.advanceTimersByTime(999));

    expect(sheetInvalidations()).toBe(0);

    act(() => vi.advanceTimersByTime(1));

    expect(sheetInvalidations()).toBe(1);
    vi.useRealTimers();
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
