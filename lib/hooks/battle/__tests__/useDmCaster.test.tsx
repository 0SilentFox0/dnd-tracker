// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { fakeScene } from "./fake-scene";

import { useDmCaster } from "@/lib/hooks/battle";

describe("useDmCaster", () => {
  it("тримає id, а учасника бере з живого порядку: рух заклинателя після вибору видно одразу", () => {
    const { wrapper, value, me, gob, ally } = fakeScene({ isDM: true });

    const { result, rerender } = renderHook(() => useDmCaster(), { wrapper });

    expect(result.current.caster).toBeNull();

    act(() => result.current.select(me));

    expect(result.current.caster?.basicInfo.id).toBe("me");

    value.battle = { ...value.battle, initiativeOrder: [{ ...me, battleData: { ...me.battleData, position: { x: 3, y: 2 } } }, gob, ally] };
    rerender();

    expect(result.current.caster?.battleData.position).toEqual({ x: 3, y: 2 });
  });
});
