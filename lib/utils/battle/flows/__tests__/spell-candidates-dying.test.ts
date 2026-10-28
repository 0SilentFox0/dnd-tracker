import { describe, expect, it } from "vitest";

import { CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { startDying } from "@/lib/utils/battle/death-saves";
import { spellTargetCandidates } from "@/lib/utils/battle/flows";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

const rules: Ruleset = { ...DEFAULT_RULES, deathSaves: { ...DEFAULT_RULES.deathSaves, enabled: true } };

const caster = makeParticipant({ id: "c" });

const dying = startDying(makeParticipant({ id: "d", hp: 0 }), rules);

const dead: BattleParticipant = { ...makeParticipant({ id: "x", hp: 0 }), combatStats: { ...makeParticipant({ id: "x" }).combatStats, currentHp: 0, status: CombatStatus.DEAD } };

const ids = (side: "ally" | "enemy") => spellTargetCandidates([caster, dying, dead], caster, side).map((p) => p.basicInfo.id);

describe("кандидати заклинання: союзник, що вмирає", () => {
  it("є серед союзників, мертвого немає", () => {
    expect(ids("ally")).toEqual(["c", "d"]);
  });

  it("серед ворогів не з'являється", () => {
    const foe = { ...dying, basicInfo: { ...dying.basicInfo, side: ParticipantSide.ENEMY } };

    expect(spellTargetCandidates([caster, foe], caster, "enemy")).toEqual([]);
  });

  it("без кидків смерті непритомний не кандидат", () => {
    const plain = { ...dying, battleData: { ...dying.battleData, deathSaves: undefined } };

    expect(spellTargetCandidates([caster, plain], caster, "ally").map((p) => p.basicInfo.id)).toEqual(["c"]);
  });
});
