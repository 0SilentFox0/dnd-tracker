// @vitest-environment happy-dom
import type { PointerEvent } from "react";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DRAG_THRESHOLD, useViewport } from "../useViewport";

function setup(options?: Parameters<typeof useViewport>[0]) {
  const el = document.createElement("div");

  el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 300, right: 400, bottom: 300, x: 0, y: 0, toJSON: () => ({}) });

  const hook = renderHook(() => {
    const v = useViewport(options);

    v.containerRef.current = el;

    return v;
  });

  hook.rerender();

  return { ...hook, el };
}

const wheel = (el: HTMLElement, deltaY: number) => el.dispatchEvent(new WheelEvent("wheel", { deltaY, clientX: 200, clientY: 150, cancelable: true }));

const ptr = (type: "onPointerDown" | "onPointerMove", x: number, y: number) =>
  ({ pointerId: 1, clientX: x, clientY: y, currentTarget: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 300 }) } }) as unknown as PointerEvent<HTMLElement> & { type: typeof type };

describe("useViewport", () => {
  it("wheel zoom stops at maxZoom option", () => {
    const { result, el } = setup({ maxZoom: 8 });

    act(() => {
      for (let i = 0; i < 30; i++) wheel(el, -100);
    });

    expect(result.current.zoom).toBe(8);
  });

  it("default max zoom stays 3", () => {
    const { result, el } = setup();

    act(() => {
      for (let i = 0; i < 30; i++) wheel(el, -100);
    });

    expect(result.current.zoom).toBe(3);
  });

  it("zoomBy never goes below minZoom", () => {
    const { result } = setup({ minZoom: 0.5 });

    act(() => result.current.zoomBy(0.1));

    expect(result.current.zoom).toBe(0.5);
  });

  it("wasDragged ignores small moves and detects 10px", () => {
    const { result } = setup();

    act(() => result.current.bind.onPointerDown(ptr("onPointerDown", 100, 100)));
    act(() => result.current.bind.onPointerMove(ptr("onPointerMove", 100 + DRAG_THRESHOLD - 1, 100)));

    expect(result.current.wasDragged()).toBe(false);

    act(() => result.current.bind.onPointerMove(ptr("onPointerMove", 110, 100)));

    expect(result.current.wasDragged()).toBe(true);
  });
});
