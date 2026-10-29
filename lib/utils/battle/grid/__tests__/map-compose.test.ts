import { describe, expect, it } from "vitest";

import { composeMapView } from "../map-compose";
import type { MapScene } from "../map-scene";

import { ParticipantSide } from "@/lib/constants/battle";
import { AttackType } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { BattleAttack, BattleMapConfig, BattleMapMark, BattleParticipant, GridPoint } from "@/types/battle";

const map: BattleMapConfig = { cols: 10, rows: 5, background: null, opacity: 0.3 };

function at(id: string, position: GridPoint, side: string): BattleParticipant {
  const p = createMockParticipant();

  return { ...p, basicInfo: { ...p.basicInfo, id, side: side as BattleParticipant["basicInfo"]["side"] }, battleData: { ...p.battleData, position } };
}

const sword = { id: "s", name: "Меч", type: AttackType.MELEE } as BattleAttack;

const armed = (p: BattleParticipant): BattleParticipant => ({ ...p, battleData: { ...p.battleData, attacks: [sword] } });

const hero = armed(at("h", { x: 0, y: 0 }, ParticipantSide.ALLY));

const foe = at("e", { x: 1, y: 0 }, ParticipantSide.ENEMY);

const scene = (marks?: Map<string, BattleMapMark | number>): MapScene => ({
  participants: [hero, foe],
  aiming: false,
  cellClick: () => ({ kind: "none" }) as never,
  tokenClick: () => ({ kind: "none" }) as never,
  view: { selectedId: "h", currentId: "h", ...(marks && { marks }) },
});

const overlay = (over: Partial<Parameters<typeof composeMapView>[0]["overlay"]> = {}) => ({ pendingStroke: new Set<string>(), round: 2, ...over });

const compose = (s: MapScene, hover: Parameters<typeof composeMapView>[0]["hover"] = { cell: null, preview: null }, o = overlay()) =>
  composeMapView({ scene: s, map, current: hero, hover, overlay: o });

describe("composeMapView", () => {
  it("passes the scene view through with overlay fields and no trajectory without a hover", () => {
    const view = compose(scene(new Map([["1,0", "move" as never]])));

    expect(view.selectedId).toBe("h");
    expect(view.round).toBe(2);
    expect(view.marks).toEqual(new Map([["1,0", "move"]]));
    expect(view.trajectory).toBeNull();
  });

  it("includes returnId and pendingStroke only when set", () => {
    const bare = compose(scene());

    expect(bare).not.toHaveProperty("returnId");
    expect(bare).not.toHaveProperty("pendingStroke");

    const full = compose(scene(), undefined, overlay({ returnId: "h", pendingStroke: new Set(["2,2"]) }));

    expect(full.returnId).toBe("h");
    expect(full.pendingStroke).toEqual(new Set(["2,2"]));
  });

  it("a hover preview replaces scene marks but keeps out-of-range shading", () => {
    const marks = new Map<string, BattleMapMark | number>([["4,4", "out-of-range"], ["1,1", "template"], ["2,2", "move" as never]]);

    const preview = { marks: new Map<string, BattleMapMark>([["5,0", "template"]]), aim: { x: 5, y: 0 }, pulseFrom: { x: 0, y: 0 } };

    const view = compose(scene(marks), { cell: { x: 5, y: 0 }, preview });

    expect([...(view.marks ?? [])]).toEqual([["4,4", "out-of-range"], ["5,0", "template"]]);
    expect(view.aim).toEqual({ x: 5, y: 0 });
    expect(view.pulseFrom).toEqual({ x: 0, y: 0 });
  });

  it("derives a trajectory when hovering a marked target", () => {
    const view = compose(scene(new Map([["1:0", "target"]])), { cell: { x: 1, y: 0 }, preview: null });

    expect(view.trajectory).toMatchObject({ fromId: "h", targetId: "e" });
  });
});
