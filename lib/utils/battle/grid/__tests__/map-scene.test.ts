import { describe, expect, it } from "vitest";

import { deriveMapScene, type MapSceneInput } from "../map-scene";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { ActiveEffect, BattleAttack, BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

const map: BattleMapConfig = { cols: 10, rows: 5, background: null, opacity: 0.3 };

const sword = { id: "s", name: "Меч", type: AttackType.MELEE } as BattleAttack;

function at(id: string, position: GridPoint, side: string, extra: Partial<BattleParticipant["battleData"]> = {}): BattleParticipant {
  const p = createMockParticipant();

  return {
    ...p,
    basicInfo: { ...p.basicInfo, id, side: side as BattleParticipant["basicInfo"]["side"] },
    combatStats: { ...p.combatStats, speed: 10 },
    battleData: { ...p.battleData, position, attacks: [sword], ...extra },
  };
}

const hero = at("h", { x: 0, y: 0 }, ParticipantSide.ALLY);

const near = at("e1", { x: 1, y: 0 }, ParticipantSide.ENEMY);

const far = at("e2", { x: 5, y: 0 }, ParticipantSide.ENEMY);

const reserved = at("r", { x: 8, y: 4 }, ParticipantSide.ENEMY, { reserved: true });

function input(over: Partial<MapSceneInput> = {}): MapSceneInput {
  return {
    map,
    participants: [hero, near, far, reserved],
    current: hero,
    viewer: { userId: "u1", isDM: false, canSeeEnemyHp: false },
    canAct: true,
    isDM: false,
    selectedId: null,
    hoverCell: null,
    effects: new Map(),
    ...over,
  };
}

describe("deriveMapScene", () => {
  it("худ карти: постійні ефекти відфільтровані, тимчасові залишаються", () => {
    const eff = (id: string, permanent?: boolean) => ({ id, name: id, permanent }) as unknown as ActiveEffect;

    const s = deriveMapScene(input({ effects: new Map([["h", [eff("personal:x", true), eff("bless")]]]) }));

    expect(s.view.hud?.get("h")?.effects.map((e) => e.id)).toEqual(["bless"]);
  });

  it("не свій хід: без позначок, клітинка нічого не робить, токен лише вибирається", () => {
    const s = deriveMapScene(input({ canAct: false }));

    expect(s.view.marks?.size ?? 0).toBe(0);
    expect(s.cellClick({ x: 0, y: 1 })).toEqual({ kind: "none" });
    expect(s.tokenClick("e1")).toEqual({ kind: "select", id: "e1" });
  });

  it("свій хід: клітинка руху дає move без free", () => {
    const s = deriveMapScene(input());

    expect(s.cellClick({ x: 0, y: 2 })).toEqual({ kind: "move", participantId: "h", to: { x: 0, y: 2 }, free: false });
  });

  it("сусідній ворог — атака, клік по його клітинці теж", () => {
    const s = deriveMapScene(input());

    expect(s.tokenClick("e1")).toEqual({ kind: "attack", targetId: "e1" });
    expect(s.cellClick({ x: 1, y: 0 })).toEqual({ kind: "attack", targetId: "e1" });
  });

  it("далекий ворог мечем — reject з причиною", () => {
    const s = deriveMapScene(input());

    const click = s.tokenClick("e2");

    expect(click.kind).toBe("reject");
    expect(click.kind === "reject" && click.reason.length > 0).toBe(true);
  });

  it("ДМ із вибраним не-поточним — вільний рух", () => {
    const s = deriveMapScene(input({ isDM: true, canAct: false, selectedId: "e2" }));

    expect(s.cellClick({ x: 9, y: 4 })).toEqual({ kind: "move", participantId: "e2", to: { x: 9, y: 4 }, free: true });
  });

  it("hud: ворог не exact, союзник exact; резерву немає", () => {
    const s = deriveMapScene(input());

    expect(s.view.hud?.get("e1")?.exact).toBe(false);
    expect(s.view.hud?.get("h")?.exact).toBe(true);
    expect(s.participants.map((p) => p.basicInfo.id)).toEqual(["h", "e1", "e2"]);
  });

  it("траєкторія: наведення на ціль", () => {
    const s = deriveMapScene(input({ hoverCell: { x: 1, y: 0 } }));

    expect(s.view.trajectory).toEqual({ fromId: "h", to: { x: 1, y: 0 } });
    expect(deriveMapScene(input({ hoverCell: { x: 0, y: 1 } })).view.trajectory).toBeNull();
  });

  it("атака вже використана — цілей немає", () => {
    const used = { ...hero, actionFlags: { ...hero.actionFlags, hasUsedAction: true } };

    const s = deriveMapScene(input({ current: used, participants: [used, near, far] }));

    expect(s.tokenClick("e1")).toEqual({ kind: "select", id: "e1" });
  });
});
