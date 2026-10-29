import { describe, expect, it } from "vitest";

import { ABILITIES, byId, MAP, perform,unit } from "./fixtures";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { ParticipantSide } from "@/lib/constants/battle";
import { participantAttackIntent } from "@/lib/utils/battle/flows/attack-intent";
import { placeParticipants } from "@/lib/utils/battle/grid";
import { resolveSpellTargets } from "@/lib/utils/battle/spell/spell-targeting";
import { needsBonusTarget } from "@/lib/utils/battle/view";
import type { BattleScene } from "@/types/api";

const airborne = () => perform([unit("g", { side: ParticipantSide.ALLY, at: { x: 2, y: 2 }, abilities: [ABILITIES.dive] }), unit("e", { at: { x: 3, y: 2 } })], "dive", { map: MAP, targetCell: { x: 9, y: 9 } }).participants;

describe("у повітрі — поза досяжністю", () => {
  it("розстановка не повертає його на карту", () => {
    expect(byId(placeParticipants(MAP, airborne()), "g").battleData.position).toBeUndefined();
  });

  it("клік по ньому не стає атакою", () => {
    const ps = airborne();

    const scene = { battle: { map: MAP, initiativeOrder: ps, currentRound: 1, currentTurnIndex: 1 } as Pick<BattleScene, "map" | "initiativeOrder" | "currentRound" | "currentTurnIndex">, turn: { current: byId(ps, "e"), isMyTurn: true }, anyPending: false, attackReady: true };

    expect(participantAttackIntent(scene, "g")).toBeNull();
  });

  it("закляття не може його обрати", () => {
    const ps = airborne();

    const r = resolveSpellTargets(ps, byId(ps, "e"), { id: "bolt", groupId: null, level: 1 }, { kind: "enemy" } as never, ["g"]);

    expect(r).toMatchObject({ ok: false, error: { message: API_ERRORS.TARGET_AIRBORNE } });
  });

  it("маневр потребує цілі лише без карти", () => {
    expect(needsBonusTarget(ABILITIES.fireBurst)).toBe(true);
    expect(needsBonusTarget(ABILITIES.fireBurst, true)).toBe(false);
  });
});
