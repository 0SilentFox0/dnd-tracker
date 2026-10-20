import { describe, expect, it } from "vitest";

import { CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { byId, placed, testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";
import { spellTargetCandidates } from "@/lib/utils/battle/flows/spell-flow";
import { deriveMazeView, visibleParticipants } from "@/lib/utils/battle/modes/maze";
import { flag, mazeMap } from "@/lib/utils/battle/modes/maze/__tests__/fixtures";
import { turnQueue } from "@/lib/utils/battle/view";
import { filterQueueByView } from "@/lib/utils/battle/view/queue";
import type { BattleParticipant, GridPoint, MazeConfig } from "@/types/battle";

const withControl = (p: BattleParticipant, userId: string, facing: "e" | "w" = "e"): BattleParticipant => ({
  ...p,
  basicInfo: { ...p.basicInfo, controlledBy: userId },
  battleData: { ...p.battleData, facing },
});

const hero = (id: string, at: GridPoint, user: string) => withControl(placed(id, { side: ParticipantSide.ALLY, at }), user);

const mapWith = (maze: Partial<MazeConfig> = {}) => mazeMap(maze, 12);

describe("deriveMazeView", () => {
  const a = hero("a", { x: 1, y: 5 }, "u1");

  const behindWall = hero("b", { x: 4, y: 5 }, "u2");

  const seen = placed("seen", { at: { x: 3, y: 5 } });

  const outOfCone = placed("far", { at: { x: 1, y: 10 } });

  const sleeper = flag(placed("zzz", { at: { x: 2, y: 5 } }), { dormant: true });

  const all = [a, behindWall, seen, outOfCone, sleeper];

  const map = mapWith({ walls: ["2:5:e", "2:4:e", "2:6:e"], teleports: [[{ x: 1, y: 4 }, { x: 9, y: 9 }]], fog: ["3:3"] });

  it("не лабіринт — null", () => {
    expect(deriveMazeView({ map: testMap(), participants: all, userId: "u1", isDM: false })).toBeNull();
  });

  it("гравець: не бачить героя за стіною й ворога поза конусом, бачить сплячого поруч", () => {
    const v = deriveMazeView({ map, participants: all, userId: "u1", isDM: false })!;

    expect(v.role).toBe("player");
    expect(v.visibleIds.has("a")).toBe(true);
    expect(v.visibleIds.has("b")).toBe(false);
    expect(v.visibleIds.has("seen")).toBe(false);
    expect(v.visibleIds.has("far")).toBe(false);
    expect(v.visibleIds.has("zzz")).toBe(true);
    expect(v.showTeleportLinks).toBe(false);
    expect(v.cells!.has("1:5")).toBe(true);
    expect(v.showWalls("2:5:e")).toBe(true);
    expect(v.showWalls("8:8:e")).toBe(false);
  });

  it("гравець із кількома героями бачить об'єднання", () => {
    const second = hero("c", { x: 8, y: 8 }, "u1");

    const v = deriveMazeView({ map, participants: [...all, second], userId: "u1", isDM: false })!;

    expect(v.cells!.has("8:8")).toBe(true);
    expect(v.cells!.has("1:5")).toBe(true);
    expect(v.visibleIds.has("c")).toBe(true);
  });

  it("темрява тільки для гравця", () => {
    const dark = mapWith({ dark: true });

    expect(deriveMazeView({ map: dark, participants: all, userId: "u1", isDM: false })!.dark).toBe(true);
    expect(deriveMazeView({ map: dark, participants: all, userId: "u1", isDM: true })!.dark).toBe(false);
    expect(deriveMazeView({ map: dark, participants: all, userId: "u1", isDM: true })!.mazeDark).toBe(true);
  });

  it("глядач: усі герої й активний ворог, без сплячого, телепортів і туману", () => {
    const v = deriveMazeView({ map, participants: all, userId: "nobody", isDM: false })!;

    expect(v.role).toBe("spectator");
    expect(v.cells).toBeNull();
    expect([...v.visibleIds].sort()).toEqual(["a", "b", "far", "seen"]);
    expect(v.showDormant).toBe(false);
    expect(v.showTeleportLinks).toBe(false);
    expect(v.showFog).toBe(false);
    expect(v.showWalls("8:8:e")).toBe(true);
  });

  it("той, хто вибрався, — глядач", () => {
    const out = [flag(a, { escaped: true }), behindWall];

    expect(deriveMazeView({ map, participants: out, userId: "u1", isDM: false })!.role).toBe("spectator");
  });

  it("ДМ бачить усе, «Очима гравця» — вигляд гравця", () => {
    const dm = deriveMazeView({ map, participants: all, userId: "dm", isDM: true })!;

    expect(dm.role).toBe("dm");
    expect(dm.cells).toBeNull();
    expect(dm.visibleIds.size).toBe(all.length);
    expect(dm.showTeleportLinks).toBe(true);

    const eyes = deriveMazeView({ map, participants: all, userId: "dm", isDM: true, asHeroId: "a" })!;

    const player = deriveMazeView({ map, participants: all, userId: "u1", isDM: false })!;

    expect(eyes.role).toBe("player");
    expect([...eyes.cells!].sort()).toEqual([...player.cells!].sort());
    expect([...eyes.visibleIds].sort()).toEqual([...player.visibleIds].sort());
  });

  it("filterQueue ховає невидимих і лишає межу раунду", () => {
    const v = deriveMazeView({ map, participants: all, userId: "u1", isDM: false })!;

    const order = [a, behindWall, seen, outOfCone].map((p) => byId(all, p.basicInfo.id));

    const ids = filterQueueByView(turnQueue(order, 0, 1), v).map((e) => (e.kind === "round" ? "|" : e.participant.basicInfo.id));

    expect(ids).toEqual(["a", "|", "a"]);
  });
});

describe("лабіринт: непритомні союзники", () => {
  const downed = (p: BattleParticipant): BattleParticipant => ({ ...p, combatStats: { ...p.combatStats, currentHp: 0, status: CombatStatus.UNCONSCIOUS } });

  const caster = hero("me", { x: 1, y: 5 }, "u1");

  const nearFallen = downed(hero("near", { x: 3, y: 5 }, "u2"));

  const farFallen = downed(hero("far", { x: 7, y: 5 }, "u3"));

  const all = [caster, nearFallen, farFallen];

  const view = deriveMazeView({ map: mapWith({ walls: ["5:5:e", "5:4:e", "5:6:e"] }), participants: all, userId: "u1", isDM: false })!;

  it("непритомний союзник у полі зору видимий і є ціллю закляття воскресіння", () => {
    expect(view.visibleIds.has("near")).toBe(true);

    const candidates = spellTargetCandidates(visibleParticipants(view, all), caster, "dead").map((p) => p.basicInfo.id);

    expect(candidates).toEqual(["near"]);
  });

  it("непритомний союзник поза полем зору прихований", () => {
    expect(view.visibleIds.has("far")).toBe(false);
  });
});
