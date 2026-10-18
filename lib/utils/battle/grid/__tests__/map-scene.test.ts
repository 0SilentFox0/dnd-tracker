import { describe, expect, it } from "vitest";

import { deriveMapScene, deriveTrajectory, type MapSceneInput } from "../map-scene";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { BattleAttack, BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

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
    placing: false,
    placingId: null,
    selectedId: null,
    ...over,
  };
}

describe("deriveMapScene", () => {
  it("клік по якірній клітинці ходячого вибирає його, інші клітинки ходять", () => {
    const s = deriveMapScene(input());

    expect(s.cellClick({ x: 0, y: 0 })).toEqual({ kind: "select", id: "h" });
    expect(s.cellClick({ x: 0, y: 1 })).toMatchObject({ kind: "move" });
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

    expect(s.tokenClick("e1")).toEqual({ kind: "attack", targetId: "e1", attackId: "s" });
    expect(s.cellClick({ x: 1, y: 0 })).toEqual({ kind: "attack", targetId: "e1", attackId: "s" });
  });

  it("далекий ворог мечем — reject з причиною", () => {
    const s = deriveMapScene(input());

    const click = s.tokenClick("e2");

    expect(click.kind).toBe("reject");
    expect(click.kind === "reject" && click.reason.length > 0).toBe(true);
  });

  it("ДМ поза режимом розстановки: вибраний токен не телепортується, клітинка нічого не робить", () => {
    const s = deriveMapScene(input({ isDM: true, canAct: false, selectedId: "e2" }));

    expect(s.cellClick({ x: 9, y: 4 })).toEqual({ kind: "none" });
  });

  it("розстановка: клік по токену (і союзнику під час ходу ДМ) озброює, а не атакує", () => {
    const s = deriveMapScene(input({ isDM: true, placing: true }));

    expect(s.tokenClick("e1")).toEqual({ kind: "arm", id: "e1" });
    expect(s.tokenClick("h")).toEqual({ kind: "arm", id: "h" });
    expect(s.view.marks?.size).toBe(0);
  });

  it("розстановка: клітинка — вільний рух озброєного токена, режим лишається", () => {
    const s = deriveMapScene(input({ isDM: true, placing: true, placingId: "e2" }));

    expect(s.view.selectedId).toBe("e2");
    expect(s.cellClick({ x: 9, y: 4 })).toEqual({ kind: "move", participantId: "e2", to: { x: 9, y: 4 }, free: true });
    expect(s.cellClick({ x: 8, y: 4 })).toEqual({ kind: "move", participantId: "e2", to: { x: 8, y: 4 }, free: true });
  });

  it("розстановка без озброєного токена: клітинка нічого не робить", () => {
    expect(deriveMapScene(input({ isDM: true, placing: true })).cellClick({ x: 3, y: 3 })).toEqual({ kind: "none" });
  });

  it("не-ДМ ігнорує режим розстановки", () => {
    const s = deriveMapScene(input({ isDM: false, placing: true, placingId: "e2" }));

    expect(s.cellClick({ x: 9, y: 4 })).toEqual({ kind: "none" });
    expect(s.tokenClick("e1")).toEqual({ kind: "attack", targetId: "e1", attackId: "s" });
  });

  it("ДМ поза режимом на ході ворога: союзник — атака", () => {
    const enemy = at("e1", { x: 1, y: 0 }, ParticipantSide.ENEMY);

    const s = deriveMapScene(input({ isDM: true, current: enemy, participants: [hero, enemy, far] }));

    expect(s.tokenClick("h")).toEqual({ kind: "attack", targetId: "h", attackId: "s" });
  });

  it("будь-яка атака, що дістає, робить ціль валідною; атака вибирається перша, що дістає", () => {
    const bow = { id: "b", name: "Лук", type: AttackType.RANGED, range: "60 ft" } as BattleAttack;

    const archer = { ...hero, battleData: { ...hero.battleData, attacks: [sword, bow] } };

    const s = deriveMapScene(input({ current: archer, participants: [archer, far] }));

    expect(s.view.marks?.get("5:0")).toBe("target");
    expect(s.tokenClick("e2")).toEqual({ kind: "attack", targetId: "e2", attackId: "b" });
  });

  it("hud: ворог не exact, союзник exact; резерву немає", () => {
    const s = deriveMapScene(input());

    expect(s.view.hud?.get("e1")?.exact).toBe(false);
    expect(s.view.hud?.get("h")?.exact).toBe(true);
    expect(s.participants.map((p) => p.basicInfo.id)).toEqual(["h", "e1", "e2"]);
  });

  it("траєкторія: лише наведення на ціль", () => {
    const { view } = deriveMapScene(input());

    expect(deriveTrajectory(view.marks, "h", { x: 1, y: 0 })).toEqual({ fromId: "h", to: { x: 1, y: 0 } });
    expect(deriveTrajectory(view.marks, "h", { x: 0, y: 1 })).toBeNull();
    expect(deriveTrajectory(view.marks, "h", null)).toBeNull();
  });

  it("атака вже використана — цілей немає", () => {
    const used = { ...hero, actionFlags: { ...hero.actionFlags, hasUsedAction: true } };

    const s = deriveMapScene(input({ current: used, participants: [used, near, far] }));

    expect(s.tokenClick("e1")).toEqual({ kind: "select", id: "e1" });
  });
});
