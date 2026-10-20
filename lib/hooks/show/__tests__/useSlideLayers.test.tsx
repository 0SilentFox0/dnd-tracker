// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSlideLayers } from "../useSlideLayers";

const a = { id: "slide-000a", imageUrl: "https://x/a.webp" };

const b = { id: "slide-000b", imageUrl: "https://x/b.webp" };

describe("useSlideLayers", () => {
  beforeEach(() => vi.useFakeTimers());

  afterEach(() => vi.useRealTimers());

  it("при зміні слайда старий лишається на час переходу, потім зникає", () => {
    const { result, rerender } = renderHook(({ slide }) => useSlideLayers(slide), { initialProps: { slide: a as typeof a | null } });

    expect(result.current).toEqual([{ slide: a, leaving: false }]);

    rerender({ slide: b });
    expect(result.current).toEqual([
      { slide: a, leaving: true },
      { slide: b, leaving: false },
    ]);

    act(() => vi.advanceTimersByTime(700));
    expect(result.current).toEqual([{ slide: b, leaving: false }]);
  });

  it("той самий id з новим підписом — без переходу", () => {
    const { result, rerender } = renderHook(({ slide }) => useSlideLayers(slide), { initialProps: { slide: a as typeof a | null } });

    rerender({ slide: { ...a, imageUrl: a.imageUrl } });
    expect(result.current).toHaveLength(1);
  });

  it("кінець показу — порожньо після переходу", () => {
    const { result, rerender } = renderHook(({ slide }) => useSlideLayers(slide), { initialProps: { slide: a as typeof a | null } });

    rerender({ slide: null });
    act(() => vi.advanceTimersByTime(700));
    expect(result.current).toEqual([]);
  });
});
