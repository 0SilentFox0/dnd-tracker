// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ROLLER_MAX_COUNT, useDiceRoller } from "@/lib/hooks/common/useDiceRoller";
import type { DiceThrowSpec } from "@/lib/utils/battle/fx/dice";

describe("useDiceRoller", () => {
  it("кидає обрані кубики, анімація отримує ті самі значення, сума — їх сума", async () => {
    const play = vi.fn((_: DiceThrowSpec) => Promise.resolve());

    const { result } = renderHook(() => useDiceRoller(play));

    act(() => result.current.pick.set({ sides: 6, count: 3 }));
    await act(() => result.current.roll());

    const roll = result.current.result;

    if (!roll) throw new Error("no result");

    expect(roll.sides).toBe(6);
    expect(roll.values).toHaveLength(3);
    expect(roll.values.every((v) => v >= 1 && v <= 6)).toBe(true);
    expect(roll.total).toBe(roll.values.reduce((a, v) => a + v, 0));
    expect(play.mock.calls[0][0].groups[0]).toEqual(roll.values.map((value) => ({ sides: 6, value })));
    expect(result.current.isRolling).toBe(false);
  });

  it("кількість обмежена 1…максимум", () => {
    const { result } = renderHook(() => useDiceRoller(() => Promise.resolve()));

    act(() => result.current.pick.set({ count: 0 }));
    expect(result.current.pick.data.count).toBe(1);

    act(() => result.current.pick.set({ count: 99 }));
    expect(result.current.pick.data.count).toBe(ROLLER_MAX_COUNT);
  });

  it("анімація впала — результат усе одно показано", async () => {
    const { result } = renderHook(() => useDiceRoller(() => Promise.reject(new Error("webgl"))));

    await act(() => result.current.roll());

    expect(result.current.result?.values).toHaveLength(1);
    expect(result.current.isRolling).toBe(false);
  });
});
