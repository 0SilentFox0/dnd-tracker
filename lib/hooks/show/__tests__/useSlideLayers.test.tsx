// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSlideLayers } from "../useSlideLayers";

const a = { id: "slide-000a", imageUrl: "https://x/a.webp" };

const b = { id: "slide-000b", imageUrl: "https://x/b.webp" };

const c = { id: "slide-000c", imageUrl: "https://x/c.webp" };

type S = typeof a | null;

const roles = (layers: ReturnType<typeof useSlideLayers>) => layers.map((l) => [l.slide.imageUrl, l.role]);

describe("useSlideLayers", () => {
  beforeEach(() => vi.useFakeTimers());

  afterEach(() => vi.useRealTimers());

  const setup = (slide: S = a) => renderHook(({ slide }) => useSlideLayers(slide), { initialProps: { slide: slide as S } });

  it("перший слайд — один верхній шар", () => {
    const { result } = setup();

    expect(roles(result.current)).toEqual([[a.imageUrl, "top"]]);
  });

  it("A→B: A лишається знизу, знімається через час переходу + 100 мс", () => {
    const { result, rerender } = setup();

    rerender({ slide: b });
    expect(roles(result.current)).toEqual([[a.imageUrl, "under"], [b.imageUrl, "top"]]);

    act(() => vi.advanceTimersByTime(699));
    expect(result.current).toHaveLength(2);

    act(() => vi.advanceTimersByTime(1));
    expect(roles(result.current)).toEqual([[b.imageUrl, "top"]]);
  });

  it("A→B→A у вікні переходу: A знову зверху з новим ключем, B знизу", () => {
    const { result, rerender } = setup();

    const first = result.current[0].key;

    rerender({ slide: b });
    act(() => vi.advanceTimersByTime(300));
    rerender({ slide: a });
    expect(roles(result.current)).toEqual([[b.imageUrl, "under"], [a.imageUrl, "top"]]);
    expect(result.current[1].key).not.toBe(first);

    act(() => vi.advanceTimersByTime(699));
    expect(result.current).toHaveLength(2);

    act(() => vi.advanceTimersByTime(1));
    expect(roles(result.current)).toEqual([[a.imageUrl, "top"]]);
  });

  it("A→B→C: знизу B, таймер перезапускається", () => {
    const { result, rerender } = setup();

    rerender({ slide: b });
    act(() => vi.advanceTimersByTime(400));
    rerender({ slide: c });
    expect(roles(result.current)).toEqual([[b.imageUrl, "under"], [c.imageUrl, "top"]]);

    act(() => vi.advanceTimersByTime(699));
    expect(result.current).toHaveLength(2);

    act(() => vi.advanceTimersByTime(1));
    expect(roles(result.current)).toEqual([[c.imageUrl, "top"]]);
  });

  it("той самий imageUrl: без нового шару, підпис оновлюється", () => {
    const { result, rerender } = setup();

    const key = result.current[0].key;

    const next = { ...b, imageUrl: a.imageUrl, title: "new" };

    rerender({ slide: next });
    expect(result.current).toHaveLength(1);
    expect(result.current[0].slide).toBe(next);
    expect(result.current[0].key).toBe(key);
  });

  it("кінець показу: шар згасає і зникає", () => {
    const { result, rerender } = setup();

    rerender({ slide: null });
    expect(roles(result.current)).toEqual([[a.imageUrl, "ending"]]);

    act(() => vi.advanceTimersByTime(700));
    expect(result.current).toEqual([]);
  });
});
