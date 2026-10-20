// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useBattleParticipants } from "../useBattleParticipants";

import { ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";

describe("useBattleParticipants reserve", () => {
  it("ставить резерв і обмежує його кількістю", () => {
    const { result } = renderHook(() => useBattleParticipants());

    act(() => result.current.actions.addToSide("wolf", ParticipantSourceType.UNIT, ParticipantSide.ENEMY, 5));
    act(() => result.current.actions.setReserve("wolf", 3));
    expect(result.current.list[0].reserved).toBe(3);

    act(() => result.current.actions.setQuantity("wolf", 2));
    expect(result.current.list[0].reserved).toBe(2);

    act(() => result.current.actions.setReserve("wolf", 9));
    expect(result.current.list[0].reserved).toBe(2);
  });

  it("handleAddToSide зі зменшеною кількістю обмежує резерв", () => {
    const { result } = renderHook(() => useBattleParticipants());

    act(() => result.current.actions.addToSide("wolf", ParticipantSourceType.UNIT, ParticipantSide.ENEMY, 5));
    act(() => result.current.actions.setReserve("wolf", 4));
    act(() => result.current.actions.addToSide("wolf", ParticipantSourceType.UNIT, ParticipantSide.ENEMY, 2));
    expect(result.current.list[0].reserved).toBe(2);
  });

  it("герой: резерв 0 або 1", () => {
    const { result } = renderHook(() => useBattleParticipants());

    act(() => result.current.actions.toggle("h1", ParticipantSourceType.CHARACTER, true));
    act(() => result.current.actions.setReserve("h1", 1));
    expect(result.current.list[0].reserved).toBe(1);

    act(() => result.current.actions.setReserve("h1", 5));
    expect(result.current.list[0].reserved).toBe(1);
  });
});

describe("useBattleParticipants cycleUnit", () => {
  it("не вибраний → союзник → прибрано", () => {
    const { result } = renderHook(() => useBattleParticipants());

    act(() => result.current.actions.cycleUnit("wolf"));
    expect(result.current.list).toEqual([{ id: "wolf", type: ParticipantSourceType.UNIT, side: ParticipantSide.ALLY }]);

    act(() => result.current.actions.cycleUnit("wolf"));
    expect(result.current.list).toEqual([]);
  });

  it("ворог → союзник із тією ж кількістю", () => {
    const { result } = renderHook(() => useBattleParticipants());

    act(() => result.current.actions.addToSide("wolf", ParticipantSourceType.UNIT, ParticipantSide.ENEMY, 4));
    act(() => result.current.actions.cycleUnit("wolf"));
    expect(result.current.list[0]).toMatchObject({ side: ParticipantSide.ALLY, quantity: 4 });
  });
});
