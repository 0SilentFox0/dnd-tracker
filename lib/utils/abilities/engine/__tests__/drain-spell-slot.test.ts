import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { runAbilities } from "@/lib/utils/abilities/engine/run-abilities";
import type { BattleParticipant } from "@/types/battle";

const ctx = { round: 1, rng: seq(0) };

const hit = { type: "hit" as const, actorId: "a", targetId: "e", attackKind: "melee" as const, damage: 6 };

const drainer = resolved({ trigger: { event: "hit", role: "attacker" }, effects: [{ kind: "drainSpellSlot", count: 1, target: "eventTarget" }] });

const enemy = (spellSlots: BattleParticipant["spellcasting"]["spellSlots"]): BattleParticipant => {
  const e = makeParticipant({ id: "e", side: ParticipantSide.ENEMY });

  return { ...e, spellcasting: { ...e.spellcasting, spellSlots } };
};

const drain = (target: BattleParticipant) => runAbilities([makeParticipant({ id: "a", abilities: [drainer] }), target], hit, ctx);

describe("ефект drainSpellSlot", () => {
  it("знімає слот найвищого рівня з current > 0", () => {
    const r = drain(enemy({ "1": { max: 2, current: 2 }, "3": { max: 1, current: 1 } }));

    expect(r.participants[1].spellcasting.spellSlots).toEqual({ "1": { max: 2, current: 2 }, "3": { max: 1, current: 0 } });
    expect(r.messages.join()).toContain("🔮 e втрачає слот 3-го рівня");
  });

  it("без слотів нічого не змінює і не пише повідомлень", () => {
    const target = enemy({});

    const r = drain(target);

    expect(r.participants[1]).toEqual(target);
    expect(r.messages).toEqual([]);
  });

  it("слот universal знімається, коли числових немає", () => {
    const r = drain(enemy({ universal: { max: 1, current: 1 } }));

    expect(r.participants[1].spellcasting.spellSlots.universal.current).toBe(0);
  });
});
