import { describe, expect, it } from "vitest";

import { extraRetaliations } from "@/data/library/unit-abilities";
import { AttackType, ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { CRITICAL_FAIL_EFFECTS } from "@/lib/constants/critical-effects";
import { makeEffect, makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { runAbilities } from "@/lib/utils/abilities/engine/core/run-abilities";
import { applyCriticalEffect } from "@/lib/utils/battle/attack";
import { resolveRetaliation } from "@/lib/utils/battle/attack/retaliation";
import { processStartOfTurn } from "@/lib/utils/battle/turn/start-end";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const sword: BattleAttack = { id: "sw", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d6", damageType: "slashing" };

function unit(id: string, side: ParticipantSide, abilities?: ResolvedAbility[]): BattleParticipant {
  const p = makeParticipant({ id, side, hp: 300, maxHp: 300, abilities });

  return { ...p, basicInfo: { ...p.basicInfo, sourceType: ParticipantSourceType.UNIT }, battleData: { ...p.battleData, attacks: [sword] } };
}

const defender = (abilities?: ResolvedAbility[]) => unit("d", ParticipantSide.ENEMY, abilities);

const attacker = () => unit("a", ParticipantSide.ALLY);

function retaliate(ps: BattleParticipant[]) {
  return resolveRetaliation({ participants: ps, attackerId: "a", defenderId: "d", attack: sword, attackRoll: { isCriticalFail: false }, round: 1, battleId: "b1", rng: seq(0.85) });
}

const startTurn = (d: BattleParticipant) => processStartOfTurn(d, 2, [attacker(), d]).participant;

describe("відсіч і втрачена реакція", () => {
  it("no_reaction на початку ходу блокує відсіч", () => {
    const d = defender();

    const stunned = { ...d, battleData: { ...d.battleData, activeEffects: [makeEffect("nr", { type: "debuff", effects: [{ type: "no_reaction", value: 1 }] })] } };

    const after = startTurn(stunned);

    expect(after.battleData.retaliationsUsed).toBe(0);
    expect(retaliate([attacker(), after])).toBeNull();
  });

  it("критичний наслідок lose_reaction блокує відсіч", () => {
    const effect = CRITICAL_FAIL_EFFECTS.find((e) => e.effect.type === "lose_reaction");

    if (!effect) throw new Error("no lose_reaction effect");

    const d = applyCriticalEffect(startTurn(defender()), effect, 2);

    expect(retaliate([attacker(), d])).toBeNull();
  });

  it("паніка (hasUsedReaction після початку ходу) блокує відсіч", () => {
    const d = startTurn(defender());

    const panicked = { ...d, actionFlags: { ...d.actionFlags, hasUsedReaction: true } };

    expect(retaliate([attacker(), panicked])).toBeNull();
  });

  it("refreshReaction повертає витрачену відсіч", () => {
    const refresh = resolved({ trigger: { event: "turnStart" }, effects: [{ kind: "grantAction", refreshReaction: true, target: "self" }] });

    const d = startTurn(defender([refresh]));

    const used = retaliate([attacker(), d]);

    expect(used).not.toBeNull();

    const spent = used?.participants ?? [];

    expect(retaliate(spent)).toBeNull();

    const restored = runAbilities(spent, { type: "turnStart", actorId: "d" }, { round: 2, rng: seq(0.5) }).participants;

    expect(restored.find((p) => p.basicInfo.id === "d")?.battleData.retaliationsUsed).toBe(0);
    expect(retaliate(restored)).not.toBeNull();
  });

  it("Захисник віри після початку ходу відповідає двічі, не втретє", () => {
    let ps = [attacker(), startTurn(defender([resolved(extraRetaliations(1))]))];

    const results = [0, 1, 2].map(() => {
      const r = retaliate(ps);

      if (r) ps = r.participants;

      return r !== null;
    });

    expect(results).toEqual([true, true, false]);
  });
});

describe("Вогняна хвиля у відсічі на карті", () => {
  const MAP = { cols: 10, rows: 10, background: null, opacity: 0.4 };

  const wave = resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "fireWave", percent: 50, size: 15 }] });

  const place = (p: BattleParticipant, x: number, y: number) => ({ ...p, battleData: { ...p.battleData, position: { x, y } } });

  it("палить лише ворогів у конусі, далекі не страждають", () => {
    const jarl = place(defender([wave]), 5, 5);

    const hero = place(attacker(), 4, 5);

    const near = place({ ...attacker(), basicInfo: { ...attacker().basicInfo, id: "near", name: "near" } }, 3, 5);

    const far = place({ ...attacker(), basicInfo: { ...attacker().basicInfo, id: "far", name: "far" } }, 5, 9);

    const r = resolveRetaliation({ participants: [hero, jarl, near, far], attackerId: "a", defenderId: "d", attack: sword, attackRoll: { isCriticalFail: false }, round: 1, battleId: "b1", rng: seq(0.85), map: MAP });

    const hp = (id: string) => r?.participants.find((p) => p.basicInfo.id === id)?.combatStats.currentHp;

    expect(hp("a")).toBeLessThan(300);
    expect(hp("near")).toBeLessThan(300);
    expect(hp("far")).toBe(300);
  });
});
