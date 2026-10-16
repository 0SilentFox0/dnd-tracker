import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { statWithModifiers } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { applyAuraZone, areaAuras, pendingAreaAuras, zoneMembers } from "@/lib/utils/abilities/engine/effects/area-aura";
import { ownTimedMoraleFlat } from "@/lib/utils/abilities/engine/effects/morale";
import { effectiveMorale } from "@/lib/utils/battle/morale/effective-morale";
import { decreaseEffectDurations } from "@/lib/utils/battle/turn/effects";
import type { BattleParticipant } from "@/types/battle";

const fear = (id = "unit-fear-aura") =>
  resolved({ trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "morale", flat: -1, target: "nearbyEnemies" }, { kind: "modifyStat", stat: "armor", flat: -2, target: "nearbyEnemies" }] }, { id });

const setup = () => {
  const nightmare = makeParticipant({ id: "n", side: ParticipantSide.ENEMY, abilities: [fear()] });

  const a = makeParticipant({ id: "a" });

  const b = makeParticipant({ id: "b" });

  return { nightmare, a, b, ps: [nightmare, a, b] };
};

const dead = (p: BattleParticipant): BattleParticipant => ({ ...p, combatStats: { ...p.combatStats, status: "dead" as const } });

describe("аури в області", () => {
  it("без вказаної зони аура не діє ні на кого", () => {
    const { ps } = setup();

    expect(statWithModifiers(ps, "a", "armor", 14)).toBe(14);
    expect(effectiveMorale(ps[1], ps).value).toBe(0);
    expect(pendingAreaAuras(ps, "n", 1).map((x) => x.target)).toEqual(["nearbyEnemies"]);
  });

  it("діє лише на обраних і до нового вибору; вибір у раунді знімає очікування", () => {
    const { ps } = setup();

    const [aura] = areaAuras(ps[0]);

    const zoned = applyAuraZone(ps, ps[0], aura, ["a"], 1);

    expect(statWithModifiers(zoned, "a", "armor", 14)).toBe(12);
    expect(statWithModifiers(zoned, "b", "armor", 14)).toBe(14);
    expect(effectiveMorale(zoned[1], zoned).value).toBe(-1);
    expect(pendingAreaAuras(zoned, "n", 1)).toEqual([]);
    expect(pendingAreaAuras(zoned, "n", 2)).toHaveLength(1);

    const moved = applyAuraZone(zoned, zoned[0], aura, ["b"], 2);

    expect(zoneMembers(moved, "n", aura.id)).toEqual({ ids: ["b"], round: 2 });
    expect(statWithModifiers(moved, "a", "armor", 14)).toBe(14);
  });

  it("зона не згасає з кінцем ходу цілі", () => {
    const { ps } = setup();

    const zoned = applyAuraZone(ps, ps[0], areaAuras(ps[0])[0], ["a"], 1);

    const armed = { ...zoned[1], battleData: { ...zoned[1].battleData, activeEffects: zoned[1].battleData.activeEffects.map((e) => ({ ...e, armed: !e.permanent })) } };

    expect(decreaseEffectDurations(armed).updatedEffects).toHaveLength(1);
  });

  it("мертвий власник — зона не діє; дві однакові аури не складаються", () => {
    const { ps, nightmare } = setup();

    const twin = makeParticipant({ id: "n2", side: ParticipantSide.ENEMY, abilities: [fear()] });

    const aura = areaAuras(nightmare)[0];

    const zoned = applyAuraZone([...ps, twin], nightmare, aura, ["a"], 1);

    const both = applyAuraZone(zoned, twin, areaAuras(twin)[0], ["a"], 1);

    expect(statWithModifiers(both, "a", "armor", 14)).toBe(12);
    expect(ownTimedMoraleFlat(both[1], both)).toBe(-1);

    const killed = both.map((p) => (p.basicInfo.id === "n" || p.basicInfo.id === "n2" ? dead(p) : p));

    expect(statWithModifiers(killed, "a", "armor", 14)).toBe(14);
  });

  it("порожня зона теж знімає очікування в цьому раунді", () => {
    const { ps } = setup();

    const empty = applyAuraZone(ps, ps[0], areaAuras(ps[0])[0], [], 1);

    expect(pendingAreaAuras(empty, "n", 1)).toEqual([]);
    expect(pendingAreaAuras(empty, "n", 2)).toHaveLength(1);
    expect(statWithModifiers(empty, "a", "armor", 14)).toBe(14);
  });
});
