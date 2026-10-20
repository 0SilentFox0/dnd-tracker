import { describe, expect, it } from "vitest";

import { context, goblin, hero, participant } from "./fixtures";

import { mazeMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/maze/maze-mutation";
import { MAZE_OP_TEXT } from "@/app/api/campaigns/[id]/battles/[battleId]/maze/maze-ops";
import { MAZE_TUNNEL_NO_EXIT } from "@/app/api/campaigns/[id]/battles/[battleId]/maze/maze-tunnel";
import { CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { cellDistance, cellKey } from "@/lib/utils/battle/grid/geometry";
import { allReachExit, roomCentre, tunnelRoom } from "@/lib/utils/battle/maze";
import { isReserved } from "@/lib/utils/battle/participant/reserve";
import type { BattleMutationContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { checkVictoryConditions } from "@/lib/utils/battle/turn/victory";
import type { BattleMapConfig, BattleParticipant, GridPoint, MazeConfig } from "@/types/battle";

const SIZE = 9;

const maze = (over: Partial<MazeConfig> = {}): MazeConfig => ({
  walls: ["2:2:e", "3:3:s", "5:5:e"],
  exit: { x: 0, y: 2 },
  difficulty: "medium",
  teleports: [[{ x: 1, y: 1 }, { x: 7, y: 7 }]],
  fog: ["4:4"],
  marks: { "3:3": { symbol: "star", color: "#fff", by: "hero" } },
  dark: false,
  moved: true,
  ...over,
});

const mapOf = (over: Partial<MazeConfig> = {}): BattleMapConfig => ({ cols: SIZE, rows: SIZE, background: null, opacity: 0.3, maze: maze(over) });

const at = (p: BattleParticipant, position: GridPoint, extra: Partial<BattleParticipant["battleData"]> = {}): BattleParticipant => ({ ...p, battleData: { ...p.battleData, position, ...extra } });

const hero2 = participant("hero2", { controlledBy: "user-2", name: "Друга" });

const ogre = participant("ogre", { side: ParticipantSide.ENEMY, controlledBy: "dm", name: "Огр" });

const corpse = { ...participant("corpse", { side: ParticipantSide.ENEMY, controlledBy: "dm", name: "Труп" }) };

const deadCorpse: BattleParticipant = { ...corpse, combatStats: { ...corpse.combatStats, currentHp: 0, status: CombatStatus.DEAD } };

const woundedGoblin: BattleParticipant = { ...goblin, combatStats: { ...goblin.combatStats, currentHp: 3 } };

const ctx = (over: Partial<BattleMutationContext> = {}, mazeOver: Partial<MazeConfig> = {}): BattleMutationContext => {
  const base = context({
    participants: [
      at(hero, { x: 8, y: 8 }),
      at(woundedGoblin, { x: 2, y: 6 }, { dormant: true }),
      at(hero2, { x: 0, y: 7 }),
      at(ogre, { x: 6, y: 1 }, { mazeWakeRound: 3 }),
      at(deadCorpse, { x: 5, y: 3 }),
    ],
    isDM: true,
    ...over,
  });

  return { ...base, meta: { ...base.meta, map: mapOf(mazeOver) } };
};

const tunnel = (c: BattleMutationContext) => mazeMutation(c, { op: "reshuffle", mode: "tunnel", teleportPairs: 2, fogPatches: 2 });

const byId = (ps: BattleParticipant[], id: string) => ps.find((p) => p.basicInfo.id === id) as BattleParticipant;

describe("перетасовка «1 тунель»", () => {
  it("живі вороги йдуть у резерв ДМа зі своїм HP, без сну й позиції; мертві лишаються", () => {
    const out = tunnel(ctx());

    expect(out.participants.map((p) => p.basicInfo.id).sort()).toEqual(["corpse", "hero", "hero2"]);

    const reserved = out.pending.filter(isReserved);

    expect(reserved.map((p) => p.basicInfo.id).sort()).toEqual(["gob", "ogre"]);
    expect(byId(reserved, "gob").combatStats.currentHp).toBe(3);

    for (const p of reserved) {
      expect(p.battleData.dormant).toBeUndefined();
      expect(p.battleData.mazeWakeRound).toBeUndefined();
      expect(p.battleData.position).toBeUndefined();
    }

    expect(checkVictoryConditions(out.participants, reserved, { maze: true }).isVictory).toBe(false);
  });

  it("лабіринт — одна кімната з тунелем від виходу; телепорти, туман і мітки стерто, вихід і moved лишились", () => {
    const out = tunnel(ctx());

    const next = out.scene?.map?.maze as MazeConfig;

    expect(next.walls).toEqual([...tunnelRoom({ cols: SIZE, rows: SIZE }, { x: 0, y: 2 }).walls].sort());
    expect(next).toMatchObject({ exit: { x: 0, y: 2 }, teleports: [], fog: [], marks: {}, moved: true, dark: false });
  });

  it("герої скупчені біля центру, не в тунелі й не на виході, дивляться на тунель, шлях до виходу є", () => {
    const out = tunnel(ctx());

    const next = out.scene?.map?.maze as MazeConfig;

    const room = tunnelRoom({ cols: SIZE, rows: SIZE }, { x: 0, y: 2 });

    const tunnelCells = new Set(room.cells.map(cellKey));

    const heroes = ["hero", "hero2"].map((id) => byId(out.participants, id));

    const spots = heroes.map((h) => h.battleData.position as GridPoint);

    expect(spots.every((p) => cellDistance(p, roomCentre({ cols: SIZE, rows: SIZE })) <= 1)).toBe(true);
    expect(spots.some((p) => tunnelCells.has(cellKey(p)))).toBe(false);
    expect(new Set(spots.map(cellKey)).size).toBe(2);
    expect(heroes.every((h) => h.battleData.facing === "w" || h.battleData.facing === "nw" || h.battleData.facing === "sw" || h.battleData.facing === "n")).toBe(true);
    expect(allReachExit({ cols: SIZE, rows: SIZE, maze: next }, spots)).toBe(true);
  });

  it("одна подія ДМа (прихована з журналу), перша — ціль відкату", () => {
    const out = tunnel(ctx());

    expect(out.events[0]).toMatchObject({ resultText: MAZE_OP_TEXT.tunnel, details: { actionDetails: { mazeEvent: "reshuffle" } } });
    expect(out.events.filter((e) => e.resultText === MAZE_OP_TEXT.tunnel)).toHaveLength(1);
  });

  it("хід був на ворогові, що зник — переходить до наступного учасника", () => {
    const out = tunnel(ctx({ scene: { ...context().scene, turnIndex: 1 } }));

    expect(out.participants[out.scene?.turnIndex ?? -1]?.basicInfo.id).toBe("hero2");
  });

  it("хід героя лишається на ньому", () => {
    const out = tunnel(ctx({ scene: { ...context().scene, turnIndex: 2 } }));

    expect(out.participants[out.scene?.turnIndex ?? -1]?.basicInfo.id).toBe("hero2");
  });

  it("без виходу — відмова", () => {
    expect(() => tunnel(ctx({}, { exit: null }))).toThrow(expect.objectContaining({ message: MAZE_TUNNEL_NO_EXIT }));
  });
});
