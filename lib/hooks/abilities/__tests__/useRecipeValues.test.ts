// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useRecipeValues } from "../useRecipeValues";

import { RECIPES } from "@/lib/utils/abilities/templates";

const ctx = { scope: "ability" as const, name: "X", note: "n" };

const onHit = RECIPES.filter((r) => r.id === "onHit")[0];

describe("useRecipeValues", () => {
  it("starts from the defaults", () => {
    const { result } = renderHook(() => useRecipeValues(onHit, ctx));

    expect(result.current.values).toMatchObject({ dice: "1d4", damageType: "bleed", rounds: 2 });
    expect(result.current.built?.ok).toBe(true);
  });

  it("set rebuilds, reset restores", () => {
    const { result } = renderHook(() => useRecipeValues(onHit, ctx));

    act(() => result.current.set("dice", "2d"));
    expect(result.current.values.dice).toBe("2d");
    expect(result.current.built?.ok).toBe(false);

    act(() => result.current.reset());
    expect(result.current.values.dice).toBe("1d4");
    expect(result.current.built?.ok).toBe(true);
  });

  it("null recipe gives null built", () => {
    const { result } = renderHook(() => useRecipeValues(null, ctx));

    expect(result.current.built).toBeNull();
  });
});
