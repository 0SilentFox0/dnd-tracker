// @vitest-environment happy-dom
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useHpChange } from "../useHpChange";

describe("useHpChange", () => {
  it("на першому рендері нічого; при зміні — дельта і новий id", () => {
    const { result, rerender } = renderHook(({ hp }) => useHpChange(hp), { initialProps: { hp: 20 } });

    expect(result.current).toBeNull();

    rerender({ hp: 12 });

    expect(result.current).toEqual({ delta: -8, id: 1 });

    rerender({ hp: 20 });

    expect(result.current).toEqual({ delta: 8, id: 2 });
  });
});
