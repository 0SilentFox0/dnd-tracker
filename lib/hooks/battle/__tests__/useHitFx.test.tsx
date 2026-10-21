// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fireFxImpact } from "../fx-impact";
import { useHitFx } from "../useHitFx";

import { CombatStatus } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { FxImpact } from "@/lib/utils/battle/fx";

const impact = (actionId: string): FxImpact => ({ element: "fire", kind: "damage", delayMs: 600, actionId, waitMs: 4000 });

const base = createMockParticipant();

const at = (currentHp: number, status: string = CombatStatus.ACTIVE) => ({ ...base, combatStats: { ...base.combatStats, currentHp, status } }) as typeof base;

beforeEach(() => vi.useFakeTimers());

afterEach(() => vi.useRealTimers());

describe("useHitFx", () => {
  it("декорації з'являються лише на сигнал удару своєї дії", () => {
    const { result, rerender } = renderHook(({ hp, i }) => useHitFx<HTMLDivElement>(at(hp), i), { initialProps: { hp: 30, i: impact("x1") } });

    rerender({ hp: 20, i: impact("x1") });
    expect(result.current.change).toBeNull();
    act(() => fireFxImpact("x0"));
    expect(result.current.change).toBeNull();
    act(() => fireFxImpact("x1"));
    expect(result.current.change?.delta).toBe(-10);
  });

  it("без сигналу — показ через waitMs", () => {
    const { result, rerender } = renderHook(({ hp, i }) => useHitFx<HTMLDivElement>(at(hp), i), { initialProps: { hp: 30, i: impact("y1") } });

    rerender({ hp: 25, i: impact("y1") });
    act(() => vi.advanceTimersByTime(4000));
    expect(result.current.change?.delta).toBe(-5);
  });

  it("без впливу (FX вимкнено) — одразу", () => {
    const { result, rerender } = renderHook(({ hp }) => useHitFx<HTMLDivElement>(at(hp), null), { initialProps: { hp: 30 } });

    rerender({ hp: 28 });
    expect(result.current.change?.delta).toBe(-2);
  });

  it("HUD показує попереднє HP і статус до удару анімації", () => {
    const { result, rerender } = renderHook(({ p }) => useHitFx<HTMLDivElement>(p, impact("z1")), { initialProps: { p: at(30) } });

    rerender({ p: at(0, CombatStatus.DEAD) });
    expect(result.current.shown.combatStats.currentHp).toBe(30);
    expect(result.current.shown.combatStats.status).toBe(CombatStatus.ACTIVE);
    act(() => fireFxImpact("z1"));
    expect(result.current.shown.combatStats.currentHp).toBe(0);
    expect(result.current.shown.combatStats.status).toBe(CombatStatus.DEAD);
  });

  it("без впливу HUD оновлюється одразу", () => {
    const { result, rerender } = renderHook(({ p }) => useHitFx<HTMLDivElement>(p, null), { initialProps: { p: at(30) } });

    rerender({ p: at(12) });
    expect(result.current.shown.combatStats.currentHp).toBe(12);
  });
});
