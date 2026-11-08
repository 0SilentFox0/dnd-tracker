// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useMapMotionTool } from "../useMapMotionTool";

import type { MapMotion } from "@/types/battle";

function setup(initial: MapMotion | null, isDM = true) {
  const mutate = vi.fn();

  const hook = renderHook(({ current }: { current: MapMotion | null }) => useMapMotionTool({ isDM, current, mutation: { mutate, isPending: false } }), { initialProps: { current: initial } });

  return { mutate, hook, tool: () => hook.result.current };
}

describe("useMapMotionTool", () => {
  it("is null for a non-DM", () => {
    expect(setup(null, false).tool()).toBeNull();
  });

  it("pause sends 0 and resume restores the last non-zero speed", () => {
    const { mutate, hook, tool } = setup({ axis: "x", speed: 3 });

    act(() => tool()?.togglePaused());
    expect(mutate).toHaveBeenLastCalledWith({ motion: { axis: "x", speed: 0 } });

    hook.rerender({ current: { axis: "x", speed: 0 } });
    act(() => tool()?.togglePaused());
    expect(mutate).toHaveBeenLastCalledWith({ motion: { axis: "x", speed: 3 } });
  });

  it("reverse flips the sign and does nothing at 0 or off", () => {
    const a = setup({ axis: "x", speed: 2 });

    act(() => a.tool()?.reverse());
    expect(a.mutate).toHaveBeenCalledWith({ motion: { axis: "x", speed: -2 } });

    const b = setup({ axis: "x", speed: 0 });

    act(() => b.tool()?.reverse());
    expect(b.mutate).not.toHaveBeenCalled();

    const c = setup(null);

    act(() => c.tool()?.reverse());
    expect(c.mutate).not.toHaveBeenCalled();
  });

  it("setSpeed clamps and keeps the axis", () => {
    const { mutate, tool } = setup({ axis: "y", speed: 1 });

    act(() => tool()?.setSpeed(99));
    expect(mutate).toHaveBeenCalledWith({ motion: { axis: "y", speed: 12 } });
  });

  it("setAxis from off enables with the default speed", () => {
    const { mutate, tool } = setup(null);

    act(() => tool()?.setAxis("y"));
    expect(mutate).toHaveBeenCalledWith({ motion: { axis: "y", speed: 2.5 } });
  });

  it("turnOff sends null", () => {
    const { mutate, tool } = setup({ axis: "x", speed: 1 });

    act(() => tool()?.turnOff());
    expect(mutate).toHaveBeenCalledWith({ motion: null });
  });

  it("does not mutate when the value is unchanged", () => {
    const { mutate, tool } = setup({ axis: "x", speed: 2 });

    act(() => tool()?.setSpeed(2));
    act(() => tool()?.setAxis("x"));
    expect(mutate).not.toHaveBeenCalled();
  });
});
