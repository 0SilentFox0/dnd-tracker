// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSlideLayers } from "../useSlideLayers";

const a = { id: "slide-000a", imageUrl: "https://x/a.webp" };

const b = { id: "slide-000b", imageUrl: "https://x/b.webp" };

describe("useSlideLayers", () => {
  beforeEach(() => vi.useFakeTimers());

  afterEach(() => vi.useRealTimers());

  const setup = (slide: typeof a | null = a) => renderHook(({ slide }) => useSlideLayers(slide), { initialProps: { slide: slide as typeof a | null } });

  it("перший слайд проявляється після завантаження картинки", () => {
    const { result } = setup();

    expect(result.current.layers).toEqual([{ slide: a, leaving: false, visible: false }]);

    act(() => result.current.onLoad());
    expect(result.current.layers).toEqual([{ slide: a, leaving: false, visible: true }]);
  });

  it("справжній crossfade: старий шар повністю непрозорий, нова лише проявляється; старий знімається після onLoad + часу переходу", () => {
    const { result, rerender } = setup();

    act(() => result.current.onLoad());
    rerender({ slide: b });
    expect(result.current.layers).toEqual([
      { slide: a, leaving: true, visible: true },
      { slide: b, leaving: false, visible: false },
    ]);

    act(() => vi.advanceTimersByTime(2_000));
    expect(result.current.layers).toHaveLength(2);

    act(() => result.current.onLoad());
    expect(result.current.layers[1].visible).toBe(true);
    expect(result.current.layers[0].visible).toBe(true);

    act(() => vi.advanceTimersByTime(700));
    expect(result.current.layers).toEqual([{ slide: b, leaving: false, visible: true }]);
  });

  it("картинка не завантажилась — старий шар знімається за запасним таймером", () => {
    const { result, rerender } = setup();

    rerender({ slide: b });
    act(() => vi.advanceTimersByTime(8_100));
    expect(result.current.layers).toHaveLength(1);
  });

  it("той самий id з новим підписом — без переходу", () => {
    const { result, rerender } = setup();

    rerender({ slide: { ...a, imageUrl: a.imageUrl } });
    expect(result.current.layers).toHaveLength(1);
  });

  it("інший id з тією ж картинкою — без нового шару", () => {
    const { result, rerender } = setup();

    act(() => result.current.onLoad());
    rerender({ slide: { ...b, imageUrl: a.imageUrl } });
    expect(result.current.layers).toEqual([{ slide: { ...b, imageUrl: a.imageUrl }, leaving: false, visible: true }]);
  });

  it("кінець показу — старий шар згасає і зникає", () => {
    const { result, rerender } = setup();

    act(() => result.current.onLoad());
    rerender({ slide: null });
    expect(result.current.layers).toEqual([{ slide: a, leaving: true, visible: false }]);

    act(() => vi.advanceTimersByTime(700));
    expect(result.current.layers).toEqual([]);
  });
});
