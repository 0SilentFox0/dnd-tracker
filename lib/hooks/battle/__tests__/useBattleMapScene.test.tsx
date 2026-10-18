// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useBattleMapScene } from "../useBattleMapScene";
import { fakeScene } from "./fake-scene";

import type { BattleMapConfig } from "@/types/battle";

const map: BattleMapConfig = { cols: 10, rows: 5, background: null, opacity: 0.3 };

function setup(isDM: boolean) {
  const scene = fakeScene({ isDM, map });

  scene.me.battleData.position = { x: 0, y: 0 };
  scene.gob.battleData.position = { x: 1, y: 0 };
  scene.ally.battleData.position = { x: 0, y: 4 };

  const hook = renderHook(() => useBattleMapScene(), { wrapper: scene.wrapper });

  const current = () => {
    if (!hook.result.current) throw new Error("scene is null");

    return hook.result.current;
  };

  return { ...scene, hook, current };
}

describe("useBattleMapScene", () => {
  it("атака по сусіду записує намір з актором, раундом, ходом і зброєю", () => {
    const { current, value } = setup(false);

    act(() => current().actions.onTokenClick?.("gob"));

    expect(value.requestAttack).toHaveBeenCalledWith({ targetId: "gob", attackId: "rapier", actorId: "me", round: 3, turnIndex: 0 });
  });

  it("не-ДМ не має перемикача розстановки", () => {
    expect(setup(false).current().placement).toBeNull();
  });

  it("ДМ: розстановка озброює токен, вільно переносить його і лишається в режимі", () => {
    const { current, value } = setup(true);

    act(() => current().placement?.toggle());
    expect(current().placement?.active).toBe(true);

    act(() => current().actions.onTokenClick?.("ally"));
    expect(current().view.selectedId).toBe("ally");
    expect(value.requestAttack).not.toHaveBeenCalled();

    act(() => current().actions.onCellClick?.({ x: 6, y: 2 }));
    act(() => current().actions.onCellClick?.({ x: 7, y: 2 }));

    expect(value.actions.move.mutate).toHaveBeenNthCalledWith(1, { participantId: "ally", to: { x: 6, y: 2 }, free: true });
    expect(value.actions.move.mutate).toHaveBeenNthCalledWith(2, { participantId: "ally", to: { x: 7, y: 2 }, free: true });
    expect(current().placement?.active).toBe(true);
  });

  it("Esc виходить з розстановки і скидає озброєний токен", () => {
    const { current, value } = setup(true);

    act(() => current().placement?.toggle());
    act(() => current().actions.onTokenClick?.("ally"));
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(current().placement?.active).toBe(false);
    expect(current().view.selectedId).toBeNull();

    act(() => current().actions.onCellClick?.({ x: 6, y: 2 }));
    expect(value.actions.move.mutate).not.toHaveBeenCalledWith(expect.objectContaining({ free: true }));
  });

  it("наведення: траєкторія лише на ціль, дії стабільні між рендерами", () => {
    const { current, hook } = setup(false);

    const actions = current().actions;

    act(() => current().actions.onCellHover?.({ x: 5, y: 3 }));
    expect(current().view.trajectory).toBeNull();

    act(() => current().actions.onCellHover?.({ x: 1, y: 0 }));
    expect(current().view.trajectory).toEqual({ fromId: "me", to: { x: 1, y: 0 } });

    act(() => current().actions.onCellHover?.({ x: 5, y: 3 }));
    expect(current().view.trajectory).toBeNull();

    hook.rerender();
    expect(current().actions).toBe(actions);
  });

  it("наведення поза ціллю не змінює scene.view", () => {
    const { current } = setup(false);

    const view = current().view;

    act(() => current().actions.onCellHover?.({ x: 5, y: 3 }));
    act(() => current().actions.onCellHover?.({ x: 6, y: 3 }));

    expect(current().view).toBe(view);
  });
});
