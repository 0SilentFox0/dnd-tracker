import { describe, expect, it } from "vitest";

import { context, goblin, hero, participant } from "./fixtures";

import { mazeMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/maze/maze-mutation";
import { MAZE_OP_TEXT } from "@/app/api/campaigns/[id]/battles/[battleId]/maze/maze-ops";
import { createRollbackMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/rollback/rollback-mutation";
import { CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { cellKey } from "@/lib/utils/battle/grid/geometry";
import { heroTunnel, mazeDistances, roomCentre } from "@/lib/utils/battle/maze";
import { isReserved } from "@/lib/utils/battle/participant/reserve";
import type { BattleMutationContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { buildSnapshotState, prepareSave } from "@/lib/utils/battle/store";
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

const charmedImp: BattleParticipant = (() => {
  const p = participant("imp", { side: ParticipantSide.ALLY, controlledBy: "user-1", name: "Чорт" });

  return { ...p, battleData: { ...p.battleData, charmReturn: { side: ParticipantSide.ENEMY, controlledBy: "dm" } } };
})();

const woundedGoblin: BattleParticipant = { ...goblin, combatStats: { ...goblin.combatStats, currentHp: 3 } };

const ctx = (over: Partial<BattleMutationContext> = {}, mazeOver: Partial<MazeConfig> = {}): BattleMutationContext => {
  const base = context({
    participants: [
      at(hero, { x: 8, y: 8 }),
      at(woundedGoblin, { x: 2, y: 6 }, { dormant: true }),
      at(hero2, { x: 0, y: 7 }),
      at(ogre, { x: 6, y: 1 }, { mazeWakeRound: 3 }),
      at(deadCorpse, { x: 2, y: 4 }),
    ],
    isDM: true,
    ...over,
  });

  return { ...base, meta: { ...base.meta, map: mapOf(mazeOver) } };
};

const tunnel = (c: BattleMutationContext) => mazeMutation(c, { op: "reshuffle", mode: "tunnel", teleportPairs: 2, fogPatches: 2 });

const byId = (ps: BattleParticipant[], id: string) => ps.find((p) => p.basicInfo.id === id) as BattleParticipant;

const GRID = { cols: SIZE, rows: SIZE };

describe("перетасовка «1 тунель»", () => {
  it("живі вороги (і зачарований ворог) йдуть у резерв ДМа зі своїм HP, без сну й позиції; мертві лишаються", () => {
    const base = ctx();

    const out = tunnel({ ...base, participants: [...base.participants, at(charmedImp, { x: 7, y: 1 })] });

    expect(out.participants.map((p) => p.basicInfo.id).sort()).toEqual(["corpse", "hero", "hero2"]);

    const reserved = out.pending.filter(isReserved);

    expect(reserved.map((p) => p.basicInfo.id).sort()).toEqual(["gob", "imp", "ogre"]);
    expect(byId(reserved, "gob").combatStats.currentHp).toBe(3);

    for (const p of reserved) {
      expect(p.battleData.dormant).toBeUndefined();
      expect(p.battleData.mazeWakeRound).toBeUndefined();
      expect(p.battleData.position).toBeUndefined();
    }

    expect(checkVictoryConditions(out.participants, reserved).isVictory).toBe(false);
  });

  it("стіни — лише тунель, вихід перенесено на його кінець; телепорти, туман і мітки стерто", () => {
    const out = tunnel(ctx());

    const next = out.scene?.map?.maze as MazeConfig;

    const expected = heroTunnel(GRID, { x: 0, y: 2 }, 2)!;

    expect(next.walls).toEqual(expected.walls);
    expect(next).toMatchObject({ exit: { x: 0, y: 4 }, teleports: [], fog: [], marks: {}, moved: true, dark: false });
  });

  it("герої стоять рядом від центру, дивляться на вихід, шлях до виходу лише тунелем", () => {
    const out = tunnel(ctx());

    const next = out.scene?.map?.maze as MazeConfig;

    expect(byId(out.participants, "hero").battleData).toMatchObject({ position: roomCentre(GRID), facing: "w" });
    expect(byId(out.participants, "hero2").battleData).toMatchObject({ position: { x: 3, y: 4 }, facing: "w" });

    const reach = mazeDistances({ ...GRID, maze: next }, [next.exit as GridPoint]);

    expect([...reach.keys()].sort()).toEqual(["0:4", "1:4", "2:4", "3:4", "4:4"]);
  });

  it("тіло на лінії тунелю зсувається в кімнату", () => {
    const corpseAt = byId(tunnel(ctx()).participants, "corpse").battleData.position as GridPoint;

    expect(corpseAt.y === 4 && corpseAt.x <= 4).toBe(false);
    expect(cellKey(corpseAt)).not.toBe("2:4");
  });

  it("одна подія ДМа (прихована з журналу), перша — ціль відкату", () => {
    const out = tunnel(ctx());

    expect(out.events[0]).toMatchObject({ resultText: MAZE_OP_TEXT.tunnel, details: { actionDetails: { mazeEvent: "reshuffle" } } });
    expect(out.events.filter((e) => e.resultText === MAZE_OP_TEXT.tunnel)).toHaveLength(1);
  });

  it("хід був на ворогові, що зник — переходить до наступного, не завершуючи вдруге хід попереднього", () => {
    const burning = { ...hero, battleData: { ...hero.battleData, activeEffects: [{ id: "e1", name: "Щит", type: "buff", duration: 1, armed: true, effects: [], appliedAt: { round: 1, turnIndex: 0 } }] } } as unknown as BattleParticipant;

    const base = ctx({ scene: { ...context().scene, turnIndex: 1 } });

    const out = tunnel({ ...base, participants: [at(burning, { x: 8, y: 8 }), ...base.participants.slice(1)] });

    expect(out.participants[out.scene?.turnIndex ?? -1]?.basicInfo.id).toBe("hero2");
    expect(byId(out.participants, "hero").battleData.activeEffects.map((e) => e.id)).toEqual(["e1"]);
  });

  it("хід героя лишається на ньому", () => {
    const out = tunnel(ctx({ scene: { ...context().scene, turnIndex: 2 } }));

    expect(out.participants[out.scene?.turnIndex ?? -1]?.basicInfo.id).toBe("hero2");
  });

  it("героїв більше, ніж влазить у будь-який тунель — відмова", () => {
    const crowd = Array.from({ length: 6 }, (_, i) => at(participant(`h${i}`, { controlledBy: "user-1" }), { x: i, y: 8 }));

    expect(() => tunnel(ctx({ participants: crowd }))).toThrow(expect.objectContaining({ code: "action_rejected" }));
  });

  it("відкат до події тунелю повертає ворогів із резерву, позиції, стіни й вихід", async () => {
    const before = ctx();

    const out = tunnel(before);

    const loaded = { scene: before.scene, meta: before.meta, participants: before.participants, pending: before.pending, isDM: true };

    const { beforeStored, diff } = prepareSave(loaded, out);

    const state = JSON.parse(JSON.stringify(buildSnapshotState(before.scene, beforeStored, diff, before.meta.map)));

    const seq = before.scene.eventSeq + 1;

    const rollback = createRollbackMutation(async () => [{ seq, state }], async () => true);

    const after: BattleMutationContext = { ...before, participants: out.participants, pending: out.pending, meta: { ...before.meta, map: out.scene?.map ?? null } };

    const restored = await rollback(after, { actionIndex: seq });

    expect(restored.participants.map((p) => p.basicInfo.id)).toEqual(before.participants.map((p) => p.basicInfo.id));
    expect(restored.pending.filter(isReserved)).toEqual([]);
    expect(byId(restored.participants, "hero").battleData.position).toEqual({ x: 8, y: 8 });
    expect(byId(restored.participants, "gob").battleData).toMatchObject({ position: { x: 2, y: 6 }, dormant: true });
    expect(restored.scene?.map?.maze).toMatchObject({ walls: maze().walls, exit: { x: 0, y: 2 }, teleports: maze().teleports });
  });
});
