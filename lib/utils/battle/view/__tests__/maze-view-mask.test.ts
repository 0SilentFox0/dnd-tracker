import { describe, expect, it } from "vitest";

import { CombatStatus, DM_ACTOR, ParticipantSide, SYSTEM_ACTOR } from "@/lib/constants/battle";
import { placed } from "@/lib/utils/battle/__tests__/fixtures/placed";
import { flag, mazeMap } from "@/lib/utils/battle/maze/__tests__/fixtures";
import { deriveMazeView, maskMazeScene, MAZE_UNKNOWN_NAME, mazeFxVisible, mazeLogVisible, mazeVisible, turnQueue, visibleParticipants } from "@/lib/utils/battle/view";
import type { BattleAction, BattleParticipant, GridPoint } from "@/types/battle";

const mine = (id: string, at: GridPoint, user = "u1"): BattleParticipant => {
  const p = placed(id, { side: ParticipantSide.ALLY, at });

  return { ...p, basicInfo: { ...p.basicInfo, controlledBy: user }, battleData: { ...p.battleData, facing: "e" } };
};

const map = mazeMap({ exit: { x: 11, y: 0 } }, 12);

const hero = mine("a", { x: 1, y: 5 });

const otherHero = mine("b", { x: 10, y: 10 }, "u2");

const near = placed("near", { at: { x: 3, y: 5 } });

const far = placed("far", { at: { x: 1, y: 10 } });

const sleeper = flag(placed("zzz", { at: { x: 9, y: 2 } }), { dormant: true });

const all = [hero, otherHero, near, far, sleeper];

const playerView = () => deriveMazeView({ map, participants: all, userId: "u1", isDM: false });

const action = (actorId: string, over: Partial<BattleAction> = {}): BattleAction =>
  ({ id: actorId, actorId, actorName: actorId, targets: [], actionDetails: {}, resultText: actorId, hpChanges: [], ...over }) as unknown as BattleAction;

const target = (id: string) => ({ participantId: id, participantName: id });

describe("maskMazeScene — гравець бачить лише своїх і видимих", () => {
  it("списки, кількість, черга без прихованих; «ходить» прихованого — «невідомий»", () => {
    const view = playerView();

    const scene = {
      battle: { battleLog: [] as BattleAction[] },
      turn: { current: far, queue: turnQueue(all, 3, 1) },
      roster: { allies: [hero, otherHero], enemies: [near, far, sleeper] },
    };

    const out = maskMazeScene(scene, view);

    expect(out.roster.enemies.map((p) => p.basicInfo.id)).toEqual(["near"]);
    expect(out.roster.allies.map((p) => p.basicInfo.id)).toEqual(["a"]);
    expect(out.turn.current?.basicInfo).toMatchObject({ id: "far", name: MAZE_UNKNOWN_NAME });
    expect(out.turn.queue.flatMap((e) => (e.kind === "round" ? [] : [e.participant.basicInfo.id])).sort()).toEqual(["a", "near"]);
  });

  it("ДМ і глядач — без змін (той самий об'єкт)", () => {
    const scene = { battle: { battleLog: [] }, turn: { current: far, queue: [] }, roster: { allies: [hero], enemies: [far] } };

    expect(maskMazeScene(scene, deriveMazeView({ map, participants: all, userId: "dm", isDM: true }))).toBe(scene);
    expect(maskMazeScene(scene, deriveMazeView({ map, participants: all, userId: "nobody", isDM: false }))).toBe(scene);
    expect(maskMazeScene(scene, null)).toBe(scene);
  });

  it("цілі для атак і заклинань: лише видимі", () => {
    const view = playerView();

    expect(visibleParticipants(view, all).map((p) => p.basicInfo.id)).toEqual(["a", "near"]);
    expect(mazeVisible(view, sleeper)).toBe(false);
    expect(mazeVisible(null, sleeper)).toBe(true);
  });
});

describe("журнал і FX гравця в лабіринті", () => {
  const view = playerView();

  it("свій і видимий виконавець — так; прихований — ні, але удар по своєму герою видно", () => {
    expect(mazeLogVisible(view, action("a"))).toBe(true);
    expect(mazeLogVisible(view, action("near"))).toBe(true);
    expect(mazeLogVisible(view, action("far", { targets: [target("b")] }))).toBe(false);
    expect(mazeLogVisible(view, action("far", { targets: [target("a")] }))).toBe(true);
    expect(mazeLogVisible(view, action("b"))).toBe(false);
  });

  it("«помітив» — лише свого героя; зміни лабіринту ДМом — ніколи", () => {
    expect(mazeLogVisible(view, action("a", { actionDetails: { mazeEvent: "spotted" }, targets: [target("zzz")] }))).toBe(true);
    expect(mazeLogVisible(view, action("near", { actionDetails: { mazeEvent: "spotted" } }))).toBe(false);
    expect(mazeLogVisible(view, action(DM_ACTOR.actorId, { actionDetails: { mazeEvent: "op" } }))).toBe(false);
  });

  it("ДМ і система: без цілей — так; з цілями — лише якщо ціль видно", () => {
    expect(mazeLogVisible(view, action(SYSTEM_ACTOR.actorId))).toBe(true);
    expect(mazeLogVisible(view, action(DM_ACTOR.actorId, { targets: [target("far")] }))).toBe(false);
    expect(mazeLogVisible(view, action(DM_ACTOR.actorId, { targets: [target("near")] }))).toBe(true);
  });

  it("FX: видно виконавця або ціль", () => {
    expect(mazeFxVisible(view, action("far", { targets: [target("near")] }))).toBe(true);
    expect(mazeFxVisible(view, action("far", { targets: [target("b")] }))).toBe(false);
    expect(mazeFxVisible(view, action(DM_ACTOR.actorId, { actionDetails: { mazeEvent: "op" } }))).toBe(false);
  });

  it("maskMazeScene фільтрує журнал", () => {
    const log = [action("a"), action("far"), action(DM_ACTOR.actorId, { actionDetails: { mazeEvent: "op" } })];

    const out = maskMazeScene({ battle: { battleLog: log }, turn: { current: null, queue: [] }, roster: { allies: [], enemies: [] } }, view);

    expect(out.battle.battleLog.map((e) => e.actorId)).toEqual(["a"]);
  });
});

describe("непритомний герой лишає гравця гравцем", () => {
  it("0 HP, без смерті — роль player зі своїм полем зору; мертвий — глядач", () => {
    const down = { ...hero, combatStats: { ...hero.combatStats, currentHp: 0, status: CombatStatus.UNCONSCIOUS } };

    const v = deriveMazeView({ map, participants: [down, otherHero, near, far], userId: "u1", isDM: false })!;

    expect(v.role).toBe("player");
    expect(v.ownIds.has("a")).toBe(true);
    expect(v.cells?.has("1:5")).toBe(true);
    expect(v.cells?.has("10:10")).toBe(false);

    const dead = { ...hero, combatStats: { ...hero.combatStats, currentHp: 0, status: CombatStatus.DEAD } };

    expect(deriveMazeView({ map, participants: [dead, otherHero], userId: "u1", isDM: false })!.role).toBe("spectator");
  });
});

describe("журнал лабіринту: перетасовку не бачить ніхто", () => {
  const entry = (id: string, mazeEvent?: "op" | "reshuffle"): BattleAction =>
    ({ id, actorId: DM_ACTOR.actorId, actorName: "ДМ", targets: [], actionDetails: mazeEvent ? { mazeEvent } : {}, resultText: id, hpChanges: [] }) as unknown as BattleAction;

  const scene = { battle: { battleLog: [entry("reshuffle", "reshuffle"), entry("dark", "op"), entry("note")] }, turn: { current: null, queue: [] }, roster: { allies: [hero], enemies: [] } };

  const ids = (s: typeof scene) => s.battle.battleLog.map((e) => e.id);

  const empty = mazeMap({}, 12);

  const viewOf = (userId: string, isDM = false) => deriveMazeView({ map: empty, participants: [hero], userId, isDM });

  it("ДМ бачить інші події ДМа, але не перетасовку", () => {
    expect(ids(maskMazeScene(scene, viewOf("dm", true)))).toEqual(["dark", "note"]);
  });

  it("гравець не бачить ні перетасовки, ні інших змін лабіринту", () => {
    expect(ids(maskMazeScene(scene, viewOf("u1")))).toEqual(["note"]);
  });

  it("глядач теж не бачить перетасовки", () => {
    expect(ids(maskMazeScene(scene, viewOf("nobody")))).toEqual(["dark", "note"]);
  });

  it("без лабіринту сцена та сама", () => {
    expect(maskMazeScene(scene, null)).toBe(scene);
  });
});
