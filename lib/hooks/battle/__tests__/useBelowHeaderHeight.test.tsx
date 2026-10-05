// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useBelowHeaderHeight } from "../useBelowHeaderHeight";

describe("useBelowHeaderHeight", () => {
  afterEach(() => document.body.replaceChildren());

  it("віднімає низ шапки від висоти в'юпорта і оновлюється на resize", () => {
    const header = document.createElement("header");

    document.body.appendChild(header);

    const rect = vi.spyOn(header, "getBoundingClientRect").mockReturnValue({ bottom: 82 } as DOMRect);

    const { result } = renderHook(() => useBelowHeaderHeight());

    expect(result.current).toBe("calc(100dvh - 82px)");

    rect.mockReturnValue({ bottom: 56 } as DOMRect);
    act(() => window.dispatchEvent(new Event("resize")));

    expect(result.current).toBe("calc(100dvh - 56px)");
  });

  it("без шапки — повна висота", () => {
    const { result } = renderHook(() => useBelowHeaderHeight());

    expect(result.current).toBe("calc(100dvh - 0px)");
  });
});
