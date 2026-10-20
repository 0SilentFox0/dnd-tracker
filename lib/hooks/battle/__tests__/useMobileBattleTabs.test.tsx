// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { MAP_TAB, useMobileBattleTabs } from "@/lib/hooks/battle/useMobileBattleTabs";

describe("useMobileBattleTabs", () => {
  it("без карти показує останню вкладку списку", () => {
    const { result } = renderHook(() => useMobileBattleTabs({ hasMap: false, mapAim: false }));

    expect(result.current.tab).toBe(ParticipantSide.ENEMY);
    act(() => result.current.set(ParticipantSide.ALLY));
    expect(result.current.tab).toBe(ParticipantSide.ALLY);
  });

  it("наведення примусово відкриває карту, expand повертає до списку", () => {
    const { result, rerender } = renderHook((p: { mapAim: boolean }) => useMobileBattleTabs({ hasMap: true, mapAim: p.mapAim }), { initialProps: { mapAim: false } });

    act(() => result.current.set(ParticipantSide.ALLY));
    rerender({ mapAim: true });
    expect(result.current.tab).toBe(MAP_TAB);

    rerender({ mapAim: false });
    act(() => result.current.set(MAP_TAB));
    act(() => result.current.expand());
    expect(result.current.tab).toBe(ParticipantSide.ALLY);
    expect(result.current.expandTick).toBe(1);
  });
});
