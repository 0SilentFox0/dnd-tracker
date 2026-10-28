import { describe, expect, it } from "vitest";

import { retaliate, retaliateTimes, SWORD, swordUnit } from "./helpers";

import { extraRetaliations, fireWave } from "@/data/library/unit-abilities";
import { ParticipantSide } from "@/lib/constants/battle";
import { CRITICAL_FAIL_EFFECTS } from "@/lib/constants/critical-effects";
import { makeEffect, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { runAbilities } from "@/lib/utils/abilities/engine/core/run-abilities";
import { testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";
import { applyCriticalEffect } from "@/lib/utils/battle/attack";
import { resolveRetaliation } from "@/lib/utils/battle/attack/retaliation";
import { processStartOfTurn } from "@/lib/utils/battle/turn/start-end";
import { parseRules } from "@/lib/utils/rules/schema";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";

const defender = (abilities?: ResolvedAbility[]) => swordUnit("d", ParticipantSide.ENEMY, abilities);

const attacker = () => swordUnit("a", ParticipantSide.ALLY);

const startTurn = (d: BattleParticipant) => processStartOfTurn(d, 2, [attacker(), d]).participant;

describe("перемикач rules.actions.retaliation", () => {
  const off = parseRules({ actions: { retaliation: false } });

  it("вимкнено: ціль не відповідає і не витрачає реакцію", () => {
    const res = resolveRetaliation({ participants: [attacker(), defender()], attackerId: "a", defenderId: "d", attack: SWORD, attackRoll: { isCriticalFail: false }, round: 1, battleId: "b1", rng: seq(0.85), rules: off });

    expect(res).toBeNull();
  });

  it("увімкнено (і за відсутності правил): відповідає, як раніше", () => {
    const on = parseRules({});

    expect(resolveRetaliation({ participants: [attacker(), defender()], attackerId: "a", defenderId: "d", attack: SWORD, attackRoll: { isCriticalFail: false }, round: 1, battleId: "b1", rng: seq(0.85), rules: on })).not.toBeNull();
    expect(retaliate([attacker(), defender()])).not.toBeNull();
  });
});

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
    expect(retaliateTimes([attacker(), startTurn(defender([resolved(extraRetaliations(1))]))], 3)).toEqual([true, true, false]);
  });
});

describe("Вогняна хвиля у відсічі на карті", () => {
  const wave = resolved(fireWave());

  const place = (p: BattleParticipant, x: number, y: number) => ({ ...p, battleData: { ...p.battleData, position: { x, y } } });

  it("палить лише ворогів у конусі, далекі не страждають", () => {
    const jarl = place(defender([wave]), 5, 5);

    const hero = place(attacker(), 4, 5);

    const near = place({ ...attacker(), basicInfo: { ...attacker().basicInfo, id: "near", name: "near" } }, 3, 5);

    const far = place({ ...attacker(), basicInfo: { ...attacker().basicInfo, id: "far", name: "far" } }, 5, 9);

    const r = retaliate([hero, jarl, near, far], testMap());

    const hp = (id: string) => r?.participants.find((p) => p.basicInfo.id === id)?.combatStats.currentHp;

    expect(hp("a")).toBeLessThan(300);
    expect(hp("near")).toBeLessThan(300);
    expect(hp("far")).toBe(300);
  });
});
