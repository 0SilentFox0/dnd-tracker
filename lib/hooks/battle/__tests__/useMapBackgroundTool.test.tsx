// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useMapBackgroundTool } from "../useMapBackgroundTool";

function setup(current: string | null, isDM = true) {
  const mutate = vi.fn();

  const hook = renderHook(() => useMapBackgroundTool({ isDM, current, mutation: { mutate, isPending: false } }));

  return { mutate, tool: () => hook.result.current };
}

describe("useMapBackgroundTool", () => {
  it("is null for a non-DM", () => {
    expect(setup(null, false).tool()).toBeNull();
  });

  it("sends the chosen background, and null for the default", () => {
    const { mutate, tool } = setup("/battle-maps/a.webp");

    act(() => tool()?.choose("/battle-maps/b.webp"));
    expect(mutate).toHaveBeenLastCalledWith({ background: "/battle-maps/b.webp" });

    act(() => tool()?.choose(null));
    expect(mutate).toHaveBeenLastCalledWith({ background: null });
  });

  it("does not send when nothing changes", () => {
    const { mutate, tool } = setup("/battle-maps/a.webp");

    act(() => tool()?.choose("/battle-maps/a.webp"));
    expect(mutate).not.toHaveBeenCalled();
  });
});
