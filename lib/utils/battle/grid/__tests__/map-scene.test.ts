import { describe, expect, it } from "vitest";

import { aimView, deriveMapScene, deriveTrajectory, type MapAim, type MapPick, type MapSceneActor, type MapSceneInput, type MapSceneMode } from "../map-scene";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { textRef } from "@/lib/i18n/text-ref";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { REJECT } from "@/lib/utils/battle/store/reject";
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

type InputOverride = Partial<Pick<MapSceneInput, "map" | "participants" | "selectedId">> & { actor?: Partial<MapSceneActor>; mode?: Partial<MapSceneMode> };

function input({ actor, mode, ...over }: InputOverride = {}): MapSceneInput {
  return {
    map,
    participants: [hero, near, far, reserved],
    selectedId: null,
    actor: { current: hero, viewer: { userId: "u1", isDM: false, canSeeEnemyHp: false }, canAct: true, isDM: false, attackReady: true, ...actor },
    mode: { placing: false, placingId: null, ...mode },
    ...over,
  };
}

describe("deriveMapScene: danger", () => {
  const ranged = { id: "r", name: "Лук", type: AttackType.RANGED, range: "60 ft" } as BattleAttack;

  it("клітинка біля ворога з ближнім боєм — move-danger, але клік ходить", () => {
    const foe = at("e1", { x: 2, y: 1 }, ParticipantSide.ENEMY);

    const s = deriveMapScene(input({ participants: [hero, foe] }));

    expect(s.view.marks?.get("1:0")).toBe("move-danger");
    expect(typeof s.view.marks?.get("0:1")).toBe("number");
    expect(s.cellClick({ x: 1, y: 0 })).toMatchObject({ kind: "move" });
  });

  it("ворог лише з дальнім боєм не створює небезпеки", () => {
    const archer = at("e1", { x: 2, y: 1 }, ParticipantSide.ENEMY, { attacks: [ranged] });

    const s = deriveMapScene(input({ participants: [hero, archer] }));

    expect(typeof s.view.marks?.get("1:0")).toBe("number");
  });

  it("hazard — move-danger", () => {
    const s = deriveMapScene(input({ map: { ...map, terrain: { "1:1": { kind: "hazard", label: "Вогонь" } } }, participants: [hero] }));

    expect(s.view.marks?.get("1:1")).toBe("move-danger");
  });
});

describe("deriveMapScene", () => {
  it("не показує невидимий чужий токен у звичайній мапі, але лишає власний і зберігає DM-керування", () => {
    const invisible = (p: BattleParticipant) => ({ ...p, battleData: { ...p.battleData, activeEffects: [{ id: "inv", name: "Невидимий", type: "condition" as const, duration: 3, appliedAt: { round: 1, timestamp: new Date() }, effects: [{ type: "invisible", value: 1 }] }] } });

    const own = { ...invisible(hero), basicInfo: { ...hero.basicInfo, controlledBy: "u1" } };

    const hidden = invisible(near);

    expect(deriveMapScene(input({ participants: [own, hidden] })).participants.map((p) => p.basicInfo.id)).toEqual(["h"]);
    expect(deriveMapScene(input({ participants: [own, hidden], actor: { isDM: true, viewer: { userId: "dm", isDM: true, canSeeEnemyHp: true } } })).participants.map((p) => p.basicInfo.id)).toEqual(["h", "e1"]);
  });

  it("клік по якірній клітинці ходячого вибирає його, інші клітинки ходять", () => {
    const s = deriveMapScene(input());

    expect(s.cellClick({ x: 0, y: 0 })).toEqual({ kind: "select", id: "h" });
    expect(s.cellClick({ x: 0, y: 1 })).toMatchObject({ kind: "move" });
  });

  it("не свій хід: без позначок, клітинка нічого не робить, токен лише вибирається", () => {
    const s = deriveMapScene(input({ actor: { canAct: false } }));

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
    expect(click.kind === "reject" && !!click.reason).toBe(true);
  });

  it("ДМ поза режимом розстановки: вибраний токен не телепортується, клітинка нічого не робить", () => {
    const s = deriveMapScene(input({ actor: { isDM: true, canAct: false }, selectedId: "e2" }));

    expect(s.cellClick({ x: 9, y: 4 })).toEqual({ kind: "none" });
  });

  it("розстановка: клік по токену (і союзнику під час ходу ДМ) озброює, а не атакує", () => {
    const s = deriveMapScene(input({ actor: { isDM: true }, mode: { placing: true } }));

    expect(s.tokenClick("e1")).toEqual({ kind: "arm", id: "e1" });
    expect(s.tokenClick("h")).toEqual({ kind: "arm", id: "h" });
    expect(s.view.marks?.size).toBe(0);
  });

  it("розстановка: клітинка — вільний рух озброєного токена, режим лишається", () => {
    const s = deriveMapScene(input({ actor: { isDM: true }, mode: { placing: true, placingId: "e2" } }));

    expect(s.view.selectedId).toBe("e2");
    expect(s.cellClick({ x: 9, y: 4 })).toEqual({ kind: "move", participantId: "e2", to: { x: 9, y: 4 }, free: true });
    expect(s.cellClick({ x: 8, y: 4 })).toEqual({ kind: "move", participantId: "e2", to: { x: 8, y: 4 }, free: true });
  });

  it("розстановка без озброєного токена: клітинка нічого не робить", () => {
    expect(deriveMapScene(input({ actor: { isDM: true }, mode: { placing: true } })).cellClick({ x: 3, y: 3 })).toEqual({ kind: "none" });
  });

  it("не-ДМ ігнорує режим розстановки", () => {
    const s = deriveMapScene(input({ actor: { isDM: false }, mode: { placing: true, placingId: "e2" } }));

    expect(s.cellClick({ x: 9, y: 4 })).toEqual({ kind: "none" });
    expect(s.tokenClick("e1")).toEqual({ kind: "attack", targetId: "e1", attackId: "s" });
  });

  it("ДМ поза режимом на ході ворога: союзник — атака", () => {
    const enemy = at("e1", { x: 1, y: 0 }, ParticipantSide.ENEMY);

    const s = deriveMapScene(input({ actor: { isDM: true, current: enemy }, participants: [hero, enemy, far] }));

    expect(s.tokenClick("h")).toEqual({ kind: "attack", targetId: "h", attackId: "s" });
  });

  it("будь-яка атака, що дістає, робить ціль валідною; атака вибирається перша, що дістає", () => {
    const bow = { id: "b", name: "Лук", type: AttackType.RANGED, range: "60 ft" } as BattleAttack;

    const archer = { ...hero, battleData: { ...hero.battleData, attacks: [sword, bow] } };

    const s = deriveMapScene(input({ actor: { current: archer }, participants: [archer, far] }));

    expect(s.view.marks?.get("5:0")).toBe("target");
    expect(s.tokenClick("e2")).toEqual({ kind: "attack", targetId: "e2", attackId: "b" });
  });

  it("hud: ворог не exact, союзник exact; резерву немає", () => {
    const s = deriveMapScene(input());

    expect(s.view.hud?.get("e1")?.exact).toBe(false);
    expect(s.view.hud?.get("h")?.exact).toBe(true);
    expect(s.participants.map((p) => p.basicInfo.id)).toEqual(["h", "e1", "e2"]);
  });

  it("траєкторія: лише наведення на ціль, з видом атаки", () => {
    const bow = { id: "b", name: "Лук", type: AttackType.RANGED, range: "60 ft" } as BattleAttack;

    const archer = { ...hero, battleData: { ...hero.battleData, attacks: [bow, sword] } };

    const participants = [archer, near, far];

    const { view } = deriveMapScene(input({ actor: { current: archer }, participants }));

    const scene = { map, participants, marks: view.marks, current: archer };

    expect(deriveTrajectory(scene, { x: 1, y: 0 })).toEqual({ fromId: "h", targetId: "e1", to: { x: 1, y: 0 }, kind: "melee" });
    expect(deriveTrajectory(scene, { x: 0, y: 1 })).toBeNull();
    expect(deriveTrajectory(scene, null)).toBeNull();

    const free = [archer, far];

    const open = deriveMapScene(input({ actor: { current: archer }, participants: free }));

    expect(deriveTrajectory({ map, participants: free, marks: open.view.marks, current: archer }, { x: 5, y: 0 })).toMatchObject({ targetId: "e2", kind: "ranged" });
  });

  it("клік по сусіду з луком першим у списку — ближня атака", () => {
    const bow = { id: "b", name: "Лук", type: AttackType.RANGED, range: "60 ft" } as BattleAttack;

    const archer = { ...hero, battleData: { ...hero.battleData, attacks: [bow, sword] } };

    expect(deriveMapScene(input({ actor: { current: archer }, participants: [archer, near] })).tokenClick("e1")).toEqual({ kind: "attack", targetId: "e1", attackId: "s" });
  });

  it("атака вже використана — цілей немає", () => {
    const used = { ...hero, actionFlags: { ...hero.actionFlags, hasUsedAction: true } };

    const s = deriveMapScene(input({ actor: { current: used }, participants: [used, near, far] }));

    expect(s.tokenClick("e1")).toEqual({ kind: "select", id: "e1" });
  });

  it("фаза ходу без атаки (мораль) — цілей немає, клік по ворогу лише вибирає", () => {
    const s = deriveMapScene(input({ actor: { attackReady: false }, participants: [hero, near, far] }));

    expect([...(s.view.marks?.values() ?? [])]).not.toContain("target");
    expect(s.tokenClick("e1")).toEqual({ kind: "select", id: "e1" });
  });

  it("інструмент місцевості (ДМ): без зони ходу, клітинки й токени не діють", () => {
    const s = deriveMapScene(input({ actor: { isDM: true }, mode: { toolActive: true } }));

    expect(s.view.marks?.size).toBe(0);
    expect(s.cellClick({ x: 1, y: 1 })).toEqual({ kind: "none" });
    expect(s.tokenClick("e1")).toEqual({ kind: "none" });
  });
});

describe("deriveMapScene: наведення шаблону", () => {
  const aim = (over: Partial<MapAim> = {}): MapAim => ({ template: { shape: "circle", size: 5 }, casterId: "h", range: 15, onAim: () => undefined, ...over });

  it("без зони ходу й цілей; клітинка в дальності — aim, поза — reject «Поза дальністю»", () => {
    const s = deriveMapScene(input({ mode: { aim: aim() } }));

    expect(new Set(s.view.marks?.values())).toEqual(new Set(["out-of-range"]));
    expect(s.aiming).toBe(true);
    expect(s.cellClick({ x: 3, y: 0 })).toEqual({ kind: "aim", cell: { x: 3, y: 0 } });
    expect(s.cellClick({ x: 4, y: 0 })).toEqual({ kind: "reject", reason: textRef(REJECT.outOfRange) });
  });

  it("клік по токену цілиться в його клітинку, а не атакує", () => {
    const s = deriveMapScene(input({ mode: { aim: aim() } }));

    expect(s.tokenClick("e1")).toEqual({ kind: "aim", cell: { x: 1, y: 0 } });
  });

  it("клік по великому токену цілиться в центральну клітинку його сліду", () => {
    const big = at("big", { x: 1, y: 0 }, ParticipantSide.ENEMY);

    const huge = { ...big, combatStats: { ...big.combatStats, gridSize: 3 } };

    const s = deriveMapScene(input({ participants: [hero, huge], mode: { aim: aim() } }));

    expect(s.tokenClick("big")).toEqual({ kind: "aim", cell: { x: 2, y: 1 } });
  });

  it("обрана точка — клітинки шаблону й aim у view", () => {
    const s = deriveMapScene(input({ mode: { aim: aim({ aim: { x: 2, y: 2 } }) } }));

    expect(s.view.aim).toEqual({ x: 2, y: 2 });
    expect(s.view.marks?.get("2:2")).toBe("template");
    expect(s.view.marks?.get("3:2")).toBe("template");
    expect(s.view.marks?.get("4:2")).toBe("out-of-range");
  });

  it("клітинки поза дальністю затемнені; конус і лінія без затемнення", () => {
    const s = deriveMapScene(input({ mode: { aim: aim() } }));

    expect(s.view.marks?.has("3:3")).toBe(false);
    expect(s.view.marks?.get("4:0")).toBe("out-of-range");
    expect(s.view.marks?.get("9:4")).toBe("out-of-range");

    const cone = deriveMapScene(input({ mode: { aim: aim({ template: { shape: "cone", size: 15 } }) } }));

    expect(cone.view.marks?.size).toBe(0);
  });

  it("aimView: поза дальністю — null; конус без дальності — від заклинателя", () => {
    const scene = { map, participants: [hero, near, far] };

    expect(aimView(scene, aim(), { x: 5, y: 0 })).toBeNull();

    const cone = aimView(scene, aim({ template: { shape: "cone", size: 15 }, range: undefined }), { x: 5, y: 0 });

    expect(cone?.marks.get("1:0")).toBe("template");
    expect(cone?.marks.has("0:0")).toBe(false);
    expect(cone?.pulseFrom).toEqual({ x: 0, y: 0 });
  });

  it("aimView: пульс кола — від точки прицілу; кільце не підсвічує центр і не малює точку", () => {
    const scene = { map, participants: [hero, near, far] };

    const circle = aimView(scene, aim({ template: { shape: "circle", size: 10 } }), { x: 2, y: 2 });

    expect(circle?.pulseFrom).toEqual({ x: 2, y: 2 });
    expect(circle?.aim).toEqual({ x: 2, y: 2 });
    expect(circle?.marks.has("2:2")).toBe(true);

    const ring = aimView(scene, aim({ template: { shape: "circle", size: 10, hollow: true } }), { x: 2, y: 2 });

    expect(ring?.marks.size).toBe(8);
    expect(ring?.marks.has("2:2")).toBe(false);
    expect(ring?.aim).toBeNull();
    expect(ring?.pulseFrom).toEqual({ x: 2, y: 2 });
  });

  it("конус чи лінія у власну клітинку: без клітинок — reject «Оберіть напрямок», без прев'ю", () => {
    for (const template of [{ shape: "cone" as const, size: 15 }, { shape: "line" as const, size: 30 }]) {
      const mapAim = aim({ template, range: undefined });

      const s = deriveMapScene(input({ mode: { aim: mapAim } }));

      expect(s.cellClick({ x: 0, y: 0 })).toEqual({ kind: "reject", reason: textRef(REJECT.pickDirection) });
      expect(s.tokenClick("h")).toEqual({ kind: "reject", reason: textRef(REJECT.pickDirection) });
      expect(aimView({ map, participants: [hero, near, far] }, mapAim, { x: 0, y: 0 })).toBeNull();
      expect(s.cellClick({ x: 3, y: 0 })).toEqual({ kind: "aim", cell: { x: 3, y: 0 } });
    }
  });
});

describe("deriveMapScene: DM без ліміту руху", () => {
  const dmUnit = at("g", { x: 0, y: 0 }, ParticipantSide.ENEMY);

  const unit = { ...dmUnit, basicInfo: { ...dmUnit.basicInfo, controlledBy: "dm" } };

  const own = { ...hero, basicInfo: { ...hero.basicInfo, controlledBy: "u1" } };

  it("юніт ДМ: усі досяжні клітинки поза швидкістю підсвічені; герой — лише в межах швидкості", () => {
    const dm = deriveMapScene(input({ participants: [unit], actor: { current: unit, isDM: true, viewer: { userId: "dm", isDM: true, canSeeEnemyHp: true } } }));

    expect(dm.view.marks?.get("9:4")).toBe(9);

    const player = deriveMapScene(input({ participants: [own], actor: { current: own, isDM: true, viewer: { userId: "dm", isDM: true, canSeeEnemyHp: true } } }));

    expect(player.view.marks?.get("9:4")).toBeUndefined();
    expect(player.view.marks?.get("2:0")).toBe(2);
  });
});

describe("deriveMapScene: велика істота", () => {
  const wide: BattleMapConfig = { cols: 10, rows: 10, background: null, opacity: 0.3 };

  const big = (() => {
    const p = at("big", { x: 4, y: 4 }, ParticipantSide.ALLY);

    return { ...p, combatStats: { ...p.combatStats, gridSize: 2 } };
  })();

  const scene = () => deriveMapScene(input({ map: wide, participants: [big], actor: { current: big } }));

  it("клік під токеном на одну клітинку нижче — якір зсувається на одну клітинку вниз", () => {
    expect(scene().cellClick({ x: 4, y: 6 })).toEqual({ kind: "move", participantId: "big", to: { x: 4, y: 5 }, free: false });
  });

  it("клік праворуч від токена — якір на одну клітинку вправо", () => {
    expect(scene().cellClick({ x: 6, y: 4 })).toEqual({ kind: "move", participantId: "big", to: { x: 5, y: 4 }, free: false });
  });

  it("зона руху вкриває клітинки footprint'ів, а не лише якорі; власні клітинки не позначені й вибирають істоту", () => {
    const s = scene();

    expect(typeof s.view.marks?.get("6:6")).toBe("number");
    expect(s.view.marks?.has("5:5")).toBe(false);
    expect(s.cellClick({ x: 5, y: 5 })).toEqual({ kind: "select", id: "big" });
  });

  it("1×1 — без змін: клітинка і є якорем", () => {
    const s = deriveMapScene(input({ participants: [hero] }));

    expect(s.cellClick({ x: 1, y: 1 })).toEqual({ kind: "move", participantId: "h", to: { x: 1, y: 1 }, free: false });
  });
});

describe("deriveMapScene: вибір цілей заклинання", () => {
  const pick = (over: Partial<MapPick> = {}): MapPick => ({ casterId: "h", targets: [{ id: "e1", reachable: true }, { id: "e2", reachable: false }], selectedIds: [], onPick: () => undefined, ...over });

  it("позначки: досяжні — pick, обрані — picked, поза дальністю — invalid-target; рух і ворожі підсвітки атаки вимкнені", () => {
    const s = deriveMapScene(input({ mode: { pick: pick({ selectedIds: ["e1"] }) } }));

    expect(s.view.marks?.get("1:0")).toBe("picked");
    expect(s.view.marks?.get("5:0")).toBe("invalid-target");
    expect([...(s.view.marks?.values() ?? [])].some((m) => typeof m === "number" || m === "target")).toBe(false);
    expect(s.aiming).toBe(false);
    expect(deriveMapScene(input({ mode: { pick: pick() } })).view.marks?.get("1:0")).toBe("pick");
  });

  it("клік по токену: досяжна ціль — pick, поза дальністю — reject, не з переліку — reject", () => {
    const s = deriveMapScene(input({ mode: { pick: pick() } }));

    expect(s.tokenClick("e1")).toEqual({ kind: "pick", id: "e1" });
    expect(s.tokenClick("e2")).toEqual({ kind: "reject", reason: textRef(REJECT.outOfRange) });
    expect(s.tokenClick("h")).toMatchObject({ kind: "reject" });
  });

  it("ціль, відхилена фільтром заклинання — «не підходить», а не «Поза дальністю»", () => {
    const s = deriveMapScene(input({ mode: { pick: pick({ targets: [{ id: "e2", reachable: false, filteredOut: true }] }) } }));

    expect(s.tokenClick("e2")).toEqual({ kind: "reject", reason: textRef(REJECT.badSpellTarget) });
  });

  it("клік по клітинці: зайнята кандидатом — pick, порожня — none (не ходить)", () => {
    const s = deriveMapScene(input({ mode: { pick: pick() } }));

    expect(s.cellClick({ x: 1, y: 0 })).toEqual({ kind: "pick", id: "e1" });
    expect(s.cellClick({ x: 3, y: 3 })).toEqual({ kind: "none" });
  });

  it("лише для союзників теж працює: токен союзника в переліку", () => {
    const ally = at("a1", { x: 2, y: 1 }, ParticipantSide.ALLY);

    const s = deriveMapScene(input({ participants: [hero, ally], mode: { pick: pick({ targets: [{ id: "a1", reachable: true }] }) } }));

    expect(s.tokenClick("a1")).toEqual({ kind: "pick", id: "a1" });
  });

  it("розстановка DM чи наведення шаблону мають пріоритет над вибором цілей", () => {
    const aimed = deriveMapScene(input({ mode: { pick: pick(), aim: { template: { shape: "circle", size: 5 }, casterId: "h", onAim: () => undefined } } }));

    expect(aimed.aiming).toBe(true);
    expect(aimed.tokenClick("e1")).toMatchObject({ kind: "aim" });
  });
});
