import { describe, expect, it } from "vitest";

import { CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { areaAuras, zoneEffectId } from "@/lib/utils/abilities/engine/effects/area-aura";
import { syncMapAuras } from "@/lib/utils/abilities/engine/effects/map-auras";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

const map: BattleMapConfig = { cols: 12, rows: 12, background: null, opacity: 0.3 };

const fear = resolved(
  { trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "armor", flat: -2, target: "nearbyEnemies" }] },
  { id: "unit-fear-aura" },
);

const at = (p: BattleParticipant, position?: GridPoint, gridSize?: number): BattleParticipant => ({
  ...p,
  combatStats: { ...p.combatStats, ...(gridSize && { gridSize }) },
  battleData: { ...p.battleData, ...(position && { position }) },
});

const owner = (position?: GridPoint, gridSize?: number) => at(makeParticipant({ id: "n", side: ParticipantSide.ENEMY, abilities: [fear] }), position, gridSize);

const hero = (id: string, position?: GridPoint) => at(makeParticipant({ id }), position);

const has = (p: BattleParticipant) => p.battleData.activeEffects.some((e) => e.id.startsWith("zone:n:"));

describe("syncMapAuras", () => {
  it("ворог у радіусі отримує ефект, поза радіусом ні", () => {
    const ps = [owner({ x: 5, y: 5 }), hero("a", { x: 7, y: 5 }), hero("b", { x: 8, y: 5 })];

    const [, near, far] = syncMapAuras(ps, map);

    expect(has(near)).toBe(true);
    expect(has(far)).toBe(false);
    expect(near.battleData.activeEffects[0].id).toBe(zoneEffectId("n", areaAuras(ps[0])[0].id));
  });

  it("відійшов - знято", () => {
    const ps = syncMapAuras([owner({ x: 5, y: 5 }), hero("a", { x: 6, y: 5 })], map);

    const moved = syncMapAuras([ps[0], at(ps[1], { x: 11, y: 11 })], map);

    expect(has(moved[1])).toBe(false);
  });

  it("власник помер - знято з усіх", () => {
    const ps = syncMapAuras([owner({ x: 5, y: 5 }), hero("a", { x: 6, y: 5 })], map);

    const dead = { ...ps[0], combatStats: { ...ps[0].combatStats, status: CombatStatus.DEAD } };

    expect(has(syncMapAuras([dead, ps[1]], map)[1])).toBe(false);
  });

  it("велика істота-власник рахує від footprint", () => {
    const [, a] = syncMapAuras([owner({ x: 5, y: 5 }, 3), hero("a", { x: 9, y: 7 })], map);

    expect(has(a)).toBe(true);
  });

  it("незмінні учасники лишаються тими ж обʼєктами, без карти - no-op", () => {
    const ps = [owner({ x: 5, y: 5 }), hero("a", { x: 6, y: 5 }), hero("b", { x: 11, y: 11 })];

    const once = syncMapAuras(ps, map);

    expect(once[2]).toBe(ps[2]);
    expect(syncMapAuras(once, map)).toBe(once);
    expect(syncMapAuras(ps, null)).toBe(ps);
  });

  it("власник без позиції - ручний режим не чіпається", () => {
    const manual = { ...hero("a", { x: 6, y: 5 }) };

    manual.battleData = { ...manual.battleData, activeEffects: [{ id: "zone:n:x", name: "x", type: "debuff", duration: 1, appliedAt: { round: 1, timestamp: new Date(0) }, effects: [], zone: { ownerId: "n", key: "k" } }] };

    const ps = [owner(), manual];

    expect(syncMapAuras(ps, map)).toBe(ps);
  });
});
