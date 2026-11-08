import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { placed } from "@/lib/utils/battle/__tests__/fixtures/placed";
import { deriveMazeView, maskMazeFxAction, maskMazeScene } from "@/lib/utils/battle/modes/maze";
import { flag, mazeMap } from "@/lib/utils/battle/modes/maze/__tests__/fixtures";
import { maskAction, maskBattleBy, maskParticipant } from "@/lib/utils/battle/modes/maze/illusion-mask";
import { canSeeExactStats, turnQueue } from "@/lib/utils/battle/view";
import type { BattleAction, BattleParticipant, IllusionPair } from "@/types/battle";

const hero = (id: string, name: string, user: string, x: number): BattleParticipant => {
  const p = placed(id, { side: ParticipantSide.ALLY, at: { x, y: 1 } });

  return flag({ ...p, basicInfo: { ...p.basicInfo, name, controlledBy: user, avatar: `${id}.png` } }, { facing: "e" });
};

const zehir = hero("zehir", "Zehir", "u1", 1);

const godric = hero("godric", "Godric", "u2", 2);

const c = hero("c", "Cora", "u3", 3);

const all = [zehir, godric, c];

const pairs: IllusionPair[] = [{ a: "zehir", b: "godric", aSees: { name: "Vampire", avatar: "v.png" }, bSees: { name: "Knight", avatar: "k.png" } }];

const map = mazeMap({ illusionSwap: { pairs } }, 12);

const viewFor = (userId: string, isDM = false, asHeroId?: string) => deriveMazeView({ map, participants: all, userId, isDM, asHeroId });

const scene = () => ({
  battle: { battleLog: [] as BattleAction[], initiativeOrder: all },
  turn: { current: godric, queue: turnQueue(all, 1, 1) },
  roster: { allies: all, enemies: [] as BattleParticipant[] },
});

const nameOf = (list: BattleParticipant[], id: string) => list.find((p) => p.basicInfo.id === id)?.basicInfo.name;

const log: BattleAction = {
  id: "1",
  actorId: "godric",
  actorName: "Godric",
  targets: [{ participantId: "c", participantName: "Cora" }],
  actionDetails: {},
  resultText: "",
  hpChanges: [{ participantId: "godric", participantName: "Godric" }],
  log: [{ message: "x", params: { name: "Godric", inner: { message: "y", params: { who: "Godric" } } } }, "Godric plain"],
} as unknown as BattleAction;

describe("maskParticipant", () => {
  it("міняє ім'я й аватар, id лишає", () => {
    const m = maskParticipant(godric, pairs[0].aSees);

    expect(m.basicInfo).toMatchObject({ id: "godric", name: "Vampire", avatar: "v.png" });
  });
});

describe("maskMazeScene — ілюзія", () => {
  it("zehir бачить godric як aSees у ростері, черзі, turn.current, initiativeOrder", () => {
    const out = maskMazeScene(scene(), viewFor("u1"));

    expect(nameOf(out.roster.enemies, "godric")).toBe("Vampire");
    expect(nameOf(out.battle.initiativeOrder, "godric")).toBe("Vampire");
    expect(out.turn.current?.basicInfo).toMatchObject({ id: "godric", name: "Vampire", avatar: "v.png" });
    expect(out.turn.queue.flatMap((e) => (e.kind === "round" ? [] : [e.participant])).filter((p) => p.basicInfo.id === "godric").every((p) => p.basicInfo.name === "Vampire")).toBe(true);
    expect(nameOf(out.roster.allies, "zehir")).toBe("Zehir");
  });

  it("замаскований партнер — у колонці ворогів і з ворожим боком; власний герой і треті — без змін", () => {
    const out = maskMazeScene(scene(), viewFor("u1"));

    expect(out.roster.enemies.map((p) => p.basicInfo.id)).toEqual(["godric"]);
    expect(out.roster.allies.map((p) => p.basicInfo.id)).toEqual(["zehir", "c"]);
    expect(out.roster.enemies[0].basicInfo.side).toBe(ParticipantSide.ENEMY);
    expect(out.battle.initiativeOrder.find((p) => p.basicInfo.id === "godric")?.basicInfo.side).toBe(ParticipantSide.ENEMY);
  });

  it("сторонній гравець бачить справжнє", () => {
    const out = maskMazeScene(scene(), viewFor("u3"));

    expect(nameOf(out.roster.allies, "godric")).toBe("Godric");
  });

  it("ДМ без asHero — справжнє, maskedIds містить обох; asHero=zehir — як zehir", () => {
    const dm = viewFor("dm", true);

    expect(dm?.maskedIds).toEqual(new Set(["zehir", "godric"]));
    expect(dm?.disguiseOf).toBeUndefined();

    const s = scene();

    expect(maskMazeScene(s, dm)).toBe(s);
    expect(nameOf(maskMazeScene(s, viewFor("dm", true, "zehir")).roster.enemies, "godric")).toBe("Vampire");
  });

  it("журнал: actorName, targets, hpChanges і вкладені params", () => {
    const s = scene();

    s.battle.battleLog = [log];

    const [e] = maskMazeScene(s, viewFor("u1")).battle.battleLog;

    expect(e.actorName).toBe("Vampire");
    expect(e.targets[0].participantName).toBe("Cora");
    expect(e.hpChanges[0].participantName).toBe("Vampire");
    expect(e.log?.[0]).toMatchObject({ params: { name: "Vampire", inner: { params: { who: "Vampire" } } } });
    expect(maskMazeScene(s, viewFor("u3")).battle.battleLog[0]).toBe(log);
  });
});

describe("maskAction / maskMazeFxAction", () => {
  it("власний герой не маскується для власного гравця", () => {
    const own = { ...log, actorId: "zehir", actorName: "Zehir", targets: [], hpChanges: [], log: undefined } as unknown as BattleAction;

    expect(maskAction(own, viewFor("u1")!.disguiseOf!)).toBe(own);
  });

  it("системний запис без цілей, де згадано партнера, теж маскується", () => {
    const system = { ...log, actorId: "system", actorName: "System", targets: [], hpChanges: [], log: [{ message: "spotted", params: { hero: "Godric", target: "Cora" } }] } as unknown as BattleAction;

    const view = viewFor("u1")!;

    expect(view.disguiseNames).toEqual(new Map([["Godric", "Vampire"]]));
    expect(maskAction(system, view.disguiseOf!, view.disguiseNames).log?.[0]).toMatchObject({ params: { hero: "Vampire", target: "Cora" } });
    expect(maskMazeFxAction(view, system).log?.[0]).toMatchObject({ params: { hero: "Vampire" } });

    const s = scene();

    s.battle.battleLog = [system];

    expect(maskMazeScene(s, view).battle.battleLog[0].log?.[0]).toMatchObject({ params: { hero: "Vampire" } });
  });

  it("fx-копія теж із маскою", () => {
    expect(maskMazeFxAction(viewFor("u1"), log).actorName).toBe("Vampire");
  });
});

describe("maskBattleBy", () => {
  it("initiativeOrder і battleLog під маскою", () => {
    const out = maskBattleBy({ initiativeOrder: all, battleLog: [log] }, viewFor("u1")!.disguiseOf!);

    expect(nameOf(out.initiativeOrder, "godric")).toBe("Vampire");
    expect(out.battleLog[0].actorName).toBe("Vampire");
  });
});

describe("власні герої глядача пари", () => {
  const both = [hero("zehir", "Zehir", "u1", 1), hero("godric", "Godric", "u1", 2), c];

  const bothScene = () => ({
    battle: { battleLog: [] as BattleAction[], initiativeOrder: both },
    turn: { current: both[1], queue: turnQueue(both, 1, 1) },
    roster: { allies: both, enemies: [] as BattleParticipant[] },
  });

  it("один користувач керує обома — жодного маскування й переносу в ворогів", () => {
    const v = deriveMazeView({ map, participants: both, userId: "u1", isDM: false })!;

    const out = maskMazeScene(bothScene(), v);

    expect(v.disguiseOf).toBeUndefined();
    expect(out.roster.enemies).toEqual([]);
    expect(nameOf(out.roster.allies, "godric")).toBe("Godric");
    expect(out.roster.allies.every((p) => p.basicInfo.side === ParticipantSide.ALLY)).toBe(true);
  });

  it("третій гравець бачить пару без змін; пара керована одним не ламає вид іншого партнера", () => {
    const v = deriveMazeView({ map, participants: both, userId: "u3", isDM: false })!;

    expect(v.disguiseOf?.("godric")).toBeUndefined();
  });
});

describe("disguiseNames", () => {
  it("не перейменовує, коли справжнє ім'я партнера збігається з іменем іншого учасника", () => {
    const twin = hero("twin", "Godric", "u3", 4);

    const v = deriveMazeView({ map, participants: [zehir, godric, twin], userId: "u1", isDM: false })!;

    expect(v.disguiseNames?.has("Godric")).toBe(false);
    expect(viewFor("u1")!.disguiseNames?.get("Godric")).toBe("Vampire");
  });
});

describe("витоки справжнього імені партнера", () => {
  const plain = { ...log, actorId: "system", actorName: "System", targets: [], hpChanges: [], resultText: "Spotted: Zehir, Godric, Cora", log: ["Start: Godric joined", "Godricson stays"] } as unknown as BattleAction;

  it("рядкові записи й resultText маскуються точним ім'ям", () => {
    const view = viewFor("u1")!;

    const out = maskAction(plain, view.disguiseOf!, view.disguiseNames);

    expect(out.resultText).toBe("Spotted: Zehir, Vampire, Cora");
    expect(out.log?.[0]).toBe("Start: Vampire joined");
    expect(maskAction(plain, viewFor("u3")!.disguiseOf ?? (() => undefined), viewFor("u3")!.disguiseNames)).toBe(plain);
  });

  it("двозначне ім'я в рядках не міняється", () => {
    const twin = hero("twin", "Godric", "u4", 4);

    const v = deriveMazeView({ map, participants: [...all, twin], userId: "u1", isDM: false })!;

    expect(maskAction(plain, v.disguiseOf!, v.disguiseNames).resultText).toBe(plain.resultText);
  });

  it("джерело ефекту — замаскований партнер: ім'я джерела з маскою у ефектах і учасниках", () => {
    const eff = { id: "e1", name: "Haste", source: { participantId: "godric", name: "Godric" } } as unknown as import("@/types/battle").ActiveEffect;

    const withEffect = { ...zehir, battleData: { ...zehir.battleData, activeEffects: [eff] } };

    const sc = { ...scene(), effects: new Map([["zehir", [eff]]]), battle: { battleLog: [], initiativeOrder: [withEffect, godric, c] } };

    const out = maskMazeScene(sc, viewFor("u1"));

    expect(out.effects?.get("zehir")?.[0].source?.name).toBe("Vampire");
    expect(out.battle.initiativeOrder[0].battleData.activeEffects?.[0].source?.name).toBe("Vampire");
    expect(maskMazeScene(sc, viewFor("u3")).effects?.get("zehir")?.[0].source?.name).toBe("Godric");
  });
});

describe("точні стати маски", () => {
  it("для не-ДМ глядача замаскований партнер — ворог без точних HP/AC; ДМ бачить усе, як і для справжніх ворогів", () => {
    const masked = maskMazeScene(scene(), viewFor("u1")).roster.enemies[0];

    expect(canSeeExactStats(masked, { userId: "u1", isDM: false, canSeeEnemyHp: false, readOnly: false })).toBe(false);
    expect(canSeeExactStats(masked, { userId: "dm", isDM: true, canSeeEnemyHp: false, readOnly: false })).toBe(true);
  });
});
