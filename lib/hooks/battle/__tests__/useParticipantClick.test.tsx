// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useParticipantClick } from "../useParticipantClick";
import { fakeScene } from "./fake-scene";

import { AttackType } from "@/lib/constants/battle";
import type { BattleAttack, BattleMapConfig } from "@/types/battle";

const map: BattleMapConfig = { cols: 10, rows: 5, background: null, opacity: 0.3 };

const bow = { id: "bow", name: "Лук", type: AttackType.RANGED, range: "60 ft", attackBonus: 4, damageDice: "1d6", damageType: "piercing" } as BattleAttack;

function setup(opts: { isMyTurn?: boolean; anyPending?: boolean; attackReady?: boolean } = {}) {
  const scene = fakeScene({ map, isMyTurn: opts.isMyTurn });

  const { value, me, gob, ally } = scene;

  me.battleData.attacks = [bow, ...me.battleData.attacks];
  me.battleData.position = { x: 0, y: 0 };
  gob.battleData.position = { x: 1, y: 0 };
  ally.battleData.position = { x: 0, y: 4 };

  const select = vi.fn();

  const requestAttack = vi.fn();

  const { result } = renderHook(() => useParticipantClick({ battle: value.battle, turn: value.turn, anyPending: opts.anyPending ?? false, attackReady: opts.attackReady ?? true, select, requestAttack }));

  return { click: (id: string) => act(() => result.current(id)), select, requestAttack };
}

describe("useParticipantClick", () => {
  it("ворог поруч у свій хід — атака ближньою зброєю, хоч лук перший", () => {
    const { click, select, requestAttack } = setup();

    click("gob");

    expect(requestAttack).toHaveBeenCalledWith({ targetId: "gob", attackId: "rapier", actorId: "me", round: 3, turnIndex: 0 });
    expect(select).not.toHaveBeenCalled();
  });

  it("союзник — лише вибір", () => {
    const { click, select, requestAttack } = setup();

    click("ally");

    expect(select).toHaveBeenCalledWith("ally");
    expect(requestAttack).not.toHaveBeenCalled();
  });

  it("не мій хід, мутація в дорозі чи фаза без атаки — лише вибір", () => {
    for (const opts of [{ isMyTurn: false }, { anyPending: true }, { attackReady: false }]) {
      const { click, select, requestAttack } = setup(opts);

      click("gob");

      expect(select).toHaveBeenCalledWith("gob");
      expect(requestAttack).not.toHaveBeenCalled();
    }
  });
});
