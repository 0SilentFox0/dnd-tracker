import { describe, expect, it } from "vitest";

import { makeParticipant, resolved } from "./fixtures";

import { runAbilities } from "@/lib/utils/abilities/engine/run-abilities";
import { AbilitySchema } from "@/lib/utils/abilities/schema";
import type { AbilityEvent } from "@/types/abilities";

const trig = (extra: object) => ({ event: "spellCast", phase: "after", role: "caster", ...extra }) as never;

const cast = (over: object) =>
  ({ type: "spellCast", phase: "after", actorId: "c", targetIds: ["t"], spellId: "fireball", school: "chaos", level: 3, ...over }) as AbilityEvent;

describe("spellCast filters", () => {
  it.each([
    [{ spellIds: ["fireball"] }, {}, true],
    [{ spellIds: ["fireball"] }, { spellId: "ice" }, false],
    [{ school: "chaos" }, {}, true],
    [{ school: "chaos" }, { school: "light" }, false],
    [{ spellLevels: [1, 2] }, {}, false],
    [{ spellLevels: [3] }, {}, true],
    [{}, { spellId: undefined, school: undefined, level: undefined }, true],
  ])("filter %o on %o fires=%s", (filter, over, fires) => {
    const caster = makeParticipant({ id: "c", abilities: [resolved({ trigger: trig(filter), effects: [{ kind: "changeMorale", delta: 1 }] })] });

    const r = runAbilities([caster, makeParticipant({ id: "t" })], cast(over), { round: 1, rng: () => 0 });

    expect(r.participants.find((p) => p.basicInfo.id === "c")?.combatStats.morale === 1).toBe(fires);
  });

  it("schema accepts filters and rejects empty lists", () => {
    const base = { id: "a", name: "x", effects: [{ kind: "note", text: "x" }] };

    expect(AbilitySchema.safeParse({ ...base, trigger: trig({ spellIds: ["a"], school: "chaos", spellLevels: [1] }) }).success).toBe(true);
    expect(AbilitySchema.safeParse({ ...base, trigger: trig({ spellIds: [] }) }).success).toBe(false);
  });
});
