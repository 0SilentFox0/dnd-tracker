import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { runAbilities } from "@/lib/utils/abilities/engine/run-abilities";
import { evaluateCondition } from "@/lib/utils/abilities/registry/conditions";
import { triggerMatches } from "@/lib/utils/abilities/registry/triggers";
import { AbilitySchema, ConditionSchema, TriggerSchema } from "@/lib/utils/abilities/schema";
import type { AbilityEvent } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";

const hit = (targetId: string, actorId = "e"): AbilityEvent => ({ type: "hit", actorId, targetId, attackKind: "melee", damage: 20 });

const thorns = resolved({
  trigger: { event: "hit", role: "target", whose: "ally", attackKind: "melee" },
  effects: [{ kind: "dealDamage", amount: { percentOf: "eventDamage", value: 15 }, target: "eventActor" }],
});

const owner = makeParticipant({ id: "owner", abilities: [thorns] });

const ally = makeParticipant({ id: "ally" });

const enemy = makeParticipant({ id: "e", side: ParticipantSide.ENEMY, hp: 100, maxHp: 100 });

const deadAlly: BattleParticipant = { ...makeParticipant({ id: "dead" }), combatStats: { ...makeParticipant({ id: "dead" }).combatStats, currentHp: 0, status: "dead" } };

const ps = [owner, ally, enemy, deadAlly];

describe("hit whose: ally", () => {
  const trigger = { event: "hit" as const, role: "target" as const, whose: "ally" as const };

  it("спрацьовує для власника, коли б'ють іншого живого союзника, але не його самого чи ворога", () => {
    expect(triggerMatches(trigger, hit("ally"), owner, ps)).toBe(true);
    expect(triggerMatches(trigger, hit("owner"), owner, ps)).toBe(false);
    expect(triggerMatches(trigger, hit("e", "ally"), owner, ps)).toBe(false);
    expect(triggerMatches(trigger, hit("dead"), owner, ps)).toBe(false);
  });

  it("за замовчуванням (self) поведінка не змінилась", () => {
    expect(triggerMatches({ event: "hit", role: "target" }, hit("owner"), owner, ps)).toBe(true);
    expect(triggerMatches({ event: "hit", role: "target" }, hit("ally"), owner, ps)).toBe(false);
  });

  it("whose діє й для ролі attacker", () => {
    expect(triggerMatches({ event: "hit", role: "attacker", whose: "ally" }, hit("e", "ally"), owner, ps)).toBe(true);
  });

  it("Шипи: союзники відбивають 15 % ближньої шкоди нападнику", () => {
    const r = runAbilities(ps, hit("ally"), { round: 1, rng: seq(0.5) });

    expect(r.participants.find((p) => p.basicInfo.id === "e")?.combatStats.currentHp).toBe(97);
  });

  it("схема приймає whose і відхиляє невідоме", () => {
    expect(TriggerSchema.safeParse(trigger).success).toBe(true);
    expect(TriggerSchema.safeParse({ ...trigger, whose: "enemy" }).success).toBe(false);
    expect(AbilitySchema.safeParse({ id: "a", name: "Шипи", trigger, effects: [{ kind: "note", text: "x" }] }).success).toBe(true);
  });
});

describe("умова actorIsEnemy", () => {
  const ctx = (event: AbilityEvent) => ({ owner, event, participants: ps });

  it("виконавець події з протилежної сторони", () => {
    expect(evaluateCondition({ type: "actorIsEnemy" }, ctx(hit("ally", "e")))).toBe(true);
    expect(evaluateCondition({ type: "actorIsEnemy" }, ctx(hit("e", "ally")))).toBe(false);
  });

  it("без події або виконавця — false", () => {
    expect(evaluateCondition({ type: "actorIsEnemy" }, { owner, event: null, participants: ps })).toBe(false);
  });

  it("працює в умові вміння: ефект лише від ворожої атаки", () => {
    const burst = resolved({
      trigger: { event: "hit", role: "target" },
      condition: { type: "actorIsEnemy" },
      effects: [{ kind: "changeMorale", delta: 1 }],
    });

    const holder = makeParticipant({ id: "owner", abilities: [burst] });

    const friendly = makeParticipant({ id: "friend" });

    const fromEnemy = runAbilities([holder, friendly, enemy], hit("owner", "e"), { round: 1, rng: seq(0.5) });

    const fromFriend = runAbilities([holder, friendly, enemy], hit("owner", "friend"), { round: 1, rng: seq(0.5) });

    expect(fromEnemy.participants[0].combatStats.morale).toBe(1);
    expect(fromFriend.participants[0].combatStats.morale).toBe(0);
  });

  it("схема приймає умову", () => {
    expect(ConditionSchema.safeParse({ type: "actorIsEnemy" }).success).toBe(true);
  });
});
