// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { mockMatchMedia } from "@/components/ui/__tests__/match-media";
import { useIsMobile } from "@/lib/hooks/common/useIsMobile";

describe("useIsMobile", () => {
  it("повертає стан media query і реагує на зміну", () => {
    const mm = mockMatchMedia(true);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
    act(() => mm.set(false));
    expect(result.current).toBe(false);
  });
});
