// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useBattleMapScene } from "../useBattleMapScene";
import { fakeScene } from "./fake-scene";

import type { MapAim } from "@/lib/utils/battle/grid";
import type { MapTerrainData } from "@/types/api";
import type { BattleMapConfig } from "@/types/battle";

const map: BattleMapConfig = { cols: 10, rows: 5, background: null, opacity: 0.3 };

function setup(isDM: boolean, mapAim: MapAim | null = null) {
  const scene = fakeScene({ isDM, map, mapAim });

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

    expect(value.intents.requestAttack).toHaveBeenCalledWith({ targetId: "gob", attackId: "rapier", actorId: "me", round: 3, turnIndex: 0 });
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
    expect(value.intents.requestAttack).not.toHaveBeenCalled();

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
    expect(current().view.trajectory).toEqual({ fromId: "me", targetId: "gob", to: { x: 1, y: 0 }, kind: "melee" });

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

  it("не-ДМ не має інструмента місцевості", () => {
    expect(setup(false).current().terrainTool).toBeNull();
  });

  it("ДМ: інструмент і розстановка взаємовиключні", () => {
    const { current } = setup(true);

    act(() => current().placement?.toggle());
    expect(current().placement?.active).toBe(true);

    act(() => current().terrainTool?.toggle());
    expect(current().terrainTool?.active).toBe(true);
    expect(current().placement?.active).toBe(false);

    act(() => current().placement?.toggle());
    expect(current().placement?.active).toBe(true);
    expect(current().terrainTool?.active).toBe(false);
  });

  it("з інструментом клітинки й токени не рухають і не б'ють; штрих — один запит", async () => {
    const { current, value } = setup(true);

    act(() => current().terrainTool?.toggle());
    act(() => current().terrainTool?.setBrush({ kind: "hazard" }));
    act(() => current().terrainTool?.setBrush({ label: "Вогонь" }));
    act(() => current().actions.onTokenClick?.("gob"));
    act(() => current().actions.onCellClick?.({ x: 3, y: 0 }));

    expect(value.intents.requestAttack).not.toHaveBeenCalled();
    expect(value.actions.move.mutate).not.toHaveBeenCalled();

    act(() => current().actions.onStroke?.([{ x: 3, y: 1 }, { x: 4, y: 1 }, { x: 3, y: 1 }]));

    expect(value.actions.mapTerrain.mutateAsync).toHaveBeenCalledTimes(1);
    expect(value.actions.mapTerrain.mutateAsync).toHaveBeenCalledWith({ cells: ["3:1", "4:1"], terrain: { kind: "hazard", label: "Вогонь", damage: { dice: "1d6", type: "fire" } } });

    act(() => current().terrainTool?.setBrush({ dice: "2d8" }));
    act(() => current().terrainTool?.setBrush({ damageType: "acid" }));
    await act(async () => current().actions.onStroke?.([{ x: 5, y: 1 }]));
    act(() => current().terrainTool?.setBrush({ dice: "" }));
    await act(async () => current().actions.onStroke?.([{ x: 6, y: 1 }]));

    const terrains = vi.mocked(value.actions.mapTerrain.mutateAsync).mock.calls.flatMap((c) => (c[0] as MapTerrainData).cells.map((cell) => [cell, (c[0] as MapTerrainData).terrain]));

    expect(Object.fromEntries(terrains)).toMatchObject({ "5:1": { damage: { dice: "2d8", type: "acid" } }, "6:1": { kind: "hazard", label: "Вогонь" } });
    expect(Object.fromEntries(terrains)["6:1"]).not.toHaveProperty("damage");
  });

  it("щітка: барʼєр з раундами, непрохідне, стерти", async () => {
    const { current, value } = setup(true);

    const stroke = () => act(async () => current().actions.onStroke?.([{ x: 2, y: 2 }]));

    act(() => current().terrainTool?.toggle());
    await stroke();
    act(() => current().terrainTool?.setBrush({ kind: "barrier" }));
    act(() => current().terrainTool?.setBrush({ rounds: 3 }));
    await stroke();
    act(() => current().terrainTool?.setBrush({ kind: "erase" }));
    await stroke();

    const calls = vi.mocked(value.actions.mapTerrain.mutateAsync).mock.calls.map((c) => (c[0] as MapTerrainData).terrain);

    expect(calls).toEqual([{ kind: "wall" }, { kind: "barrier", rounds: 3 }, null]);
  });

  it("штрихи по черзі: наступний іде після відповіді на попередній, черга однієї щітки зливається", async () => {
    const { current, value } = setup(true);

    const releases: Array<() => void> = [];

    vi.mocked(value.actions.mapTerrain.mutateAsync).mockImplementation(() => new Promise((r) => releases.push(() => r(undefined))));

    const stroke = (x: number) => act(() => current().actions.onStroke?.([{ x, y: 2 }]));

    act(() => current().terrainTool?.toggle());
    stroke(2);
    stroke(3);
    stroke(4);
    act(() => current().terrainTool?.setBrush({ kind: "erase" }));
    stroke(5);

    expect(value.actions.mapTerrain.mutateAsync).toHaveBeenCalledTimes(1);
    expect(current().view.pendingStroke).toEqual(new Set(["2:2", "3:2", "4:2", "5:2"]));

    await act(async () => releases[0]());
    expect(value.actions.mapTerrain.mutateAsync).toHaveBeenCalledTimes(2);
    expect(value.actions.mapTerrain.mutateAsync).toHaveBeenLastCalledWith({ cells: ["3:2", "4:2"], terrain: { kind: "wall" } });

    await act(async () => releases[1]());
    expect(value.actions.mapTerrain.mutateAsync).toHaveBeenLastCalledWith({ cells: ["5:2"], terrain: null });

    await act(async () => releases[2]());
    expect(value.actions.mapTerrain.mutateAsync).toHaveBeenCalledTimes(3);
    expect(current().view.pendingStroke).toBeUndefined();
  });

  it("помилка штриха не зупиняє чергу", async () => {
    const { current, value } = setup(true);

    vi.mocked(value.actions.mapTerrain.mutateAsync).mockRejectedValueOnce(new Error("409"));

    act(() => current().terrainTool?.toggle());
    await act(async () => {
      current().actions.onStroke?.([{ x: 2, y: 2 }]);
      current().actions.onStroke?.([{ x: 3, y: 2 }]);
    });

    expect(value.actions.mapTerrain.mutateAsync).toHaveBeenCalledTimes(2);
  });

  it("пропущені сервером клітинки — короткий тост", async () => {
    const { current, value } = setup(true);

    vi.mocked(value.actions.mapTerrain.mutateAsync).mockResolvedValueOnce({ skipped: ["0:0", "1:0"] });

    act(() => current().terrainTool?.toggle());
    await act(async () => current().actions.onStroke?.([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }]));

    expect(value.toast.show).toHaveBeenCalledWith("Пропущено 2 клітинки (зайняті або поза полем)");
  });

  it("Esc виходить з інструмента", () => {
    const { current } = setup(true);

    act(() => current().terrainTool?.toggle());
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(current().terrainTool?.active).toBe(false);
  });

  describe("наведення шаблону", () => {
    const aim = (over: Partial<MapAim> = {}): MapAim => ({ template: { shape: "circle", size: 5 }, casterId: "me", range: 15, onAim: vi.fn(), ...over });

    it("клік по клітинці й токену — onAim, без руху й атаки", () => {
      const mapAim = aim();

      const { current, value } = setup(false, mapAim);

      act(() => current().actions.onCellClick?.({ x: 2, y: 1 }));
      act(() => current().actions.onTokenClick?.("gob"));

      expect(mapAim.onAim).toHaveBeenNthCalledWith(1, { x: 2, y: 1 });
      expect(mapAim.onAim).toHaveBeenNthCalledWith(2, { x: 1, y: 0 });
      expect(value.actions.move.mutate).not.toHaveBeenCalled();
      expect(value.intents.requestAttack).not.toHaveBeenCalled();
    });

    it("поза дальністю — підказка замість onAim", () => {
      const mapAim = aim();

      const { current, value } = setup(false, mapAim);

      act(() => current().actions.onCellClick?.({ x: 8, y: 1 }));

      expect(mapAim.onAim).not.toHaveBeenCalled();
      expect(value.toast.show).toHaveBeenCalledWith("Поза дальністю");
    });

    it("ховер показує превʼю шаблону, а без ховера — обрану точку", () => {
      const { current } = setup(false, aim({ aim: { x: 0, y: 3 } }));

      expect(current().view.aim).toEqual({ x: 0, y: 3 });
      expect(current().view.marks?.get("0:4")).toBe("template");

      act(() => current().actions.onCellHover?.({ x: 3, y: 1 }));
      expect(current().view.aim).toEqual({ x: 3, y: 1 });
      expect(current().view.marks?.get("2:0")).toBe("template");
      expect(current().view.marks?.has("0:4")).toBe(false);

      act(() => current().actions.onCellHover?.(null));
      expect(current().view.aim).toEqual({ x: 0, y: 3 });
    });

    it("ховер кільцем (Коло зими): центр не підсвічений і без маркера точки, лише 8 клітинок довкола", () => {
      const { current } = setup(false, aim({ template: { shape: "circle", size: 10, hollow: true }, range: 60 }));

      act(() => current().actions.onCellHover?.({ x: 4, y: 2 }));

      const template = [...(current().view.marks ?? [])].flatMap(([k, m]) => (m === "template" ? [k] : []));

      expect(template).toHaveLength(8);
      expect(template).not.toContain("4:2");
      expect(current().view.aim).toBeNull();
      expect(current().view.pulseFrom).toEqual({ x: 4, y: 2 });
    });

    it("ховер повідомляє майстру точку прев'ю; поза дальністю — null", () => {
      const onHover = vi.fn();

      const { current } = setup(false, aim({ onHover }));

      act(() => current().actions.onCellHover?.({ x: 3, y: 1 }));
      expect(onHover).toHaveBeenLastCalledWith({ x: 3, y: 1 });

      act(() => current().actions.onCellHover?.({ x: 9, y: 4 }));
      expect(onHover).toHaveBeenLastCalledWith(null);
    });

    it("ховер поза дальністю превʼю не змінює", () => {
      const { current } = setup(false, aim({ aim: { x: 0, y: 3 } }));

      act(() => current().actions.onCellHover?.({ x: 9, y: 4 }));
      expect(current().view.aim).toEqual({ x: 0, y: 3 });
    });
  });
});
