import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { applyAuraZone, areaAuras, pendingAreaAuras, zoneMembers } from "@/lib/utils/abilities/engine/area-aura";
import { statWithModifiers } from "@/lib/utils/abilities/engine/collect-modifiers";
import { ownTimedMoraleFlat } from "@/lib/utils/abilities/engine/morale";
import { decreaseEffectDurations } from "@/lib/utils/battle/battle-effects";
import { effectiveMorale } from "@/lib/utils/battle/morale/effective-morale";
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

    const zoned = applyAuraZone(ps, "n", aura.id, ["a"], 1);

    expect(statWithModifiers(zoned, "a", "armor", 14)).toBe(12);
    expect(statWithModifiers(zoned, "b", "armor", 14)).toBe(14);
    expect(effectiveMorale(zoned[1], zoned).value).toBe(-1);
    expect(pendingAreaAuras(zoned, "n", 1)).toEqual([]);
    expect(pendingAreaAuras(zoned, "n", 2)).toHaveLength(1);

    const moved = applyAuraZone(zoned, "n", aura.id, ["b"], 2);

    expect(zoneMembers(moved, "n", aura.id)).toEqual({ ids: ["b"], round: 2 });
    expect(statWithModifiers(moved, "a", "armor", 14)).toBe(14);
  });

  it("зона не згасає з кінцем ходу цілі", () => {
    const { ps } = setup();

    const zoned = applyAuraZone(ps, "n", areaAuras(ps[0])[0].id, ["a"], 1);

    const armed = { ...zoned[1], battleData: { ...zoned[1].battleData, activeEffects: zoned[1].battleData.activeEffects.map((e) => ({ ...e, armed: !e.permanent })) } };

    expect(decreaseEffectDurations(armed).updatedEffects).toHaveLength(1);
  });

  it("мертвий власник — зона не діє; дві однакові аури не складаються", () => {
    const { ps, nightmare } = setup();

    const twin = makeParticipant({ id: "n2", side: ParticipantSide.ENEMY, abilities: [fear()] });

    const id = areaAuras(nightmare)[0].id;

    const both = applyAuraZone(applyAuraZone([...ps, twin], "n", id, ["a"], 1), "n2", id, ["a"], 1);

    expect(statWithModifiers(both, "a", "armor", 14)).toBe(12);
    expect(ownTimedMoraleFlat(both[1], both)).toBe(-1);

    const killed = both.map((p) => (p.basicInfo.id === "n" || p.basicInfo.id === "n2" ? dead(p) : p));

    expect(statWithModifiers(killed, "a", "armor", 14)).toBe(14);
  });

  it("ціль поза стороною аури відхиляється", () => {
    const { ps } = setup();

    expect(() => applyAuraZone(ps, "n", areaAuras(ps[0])[0].id, ["n"], 1)).toThrow();
  });
});
