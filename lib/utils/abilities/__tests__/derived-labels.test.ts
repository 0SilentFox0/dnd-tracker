import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { textOf } from "@/lib/i18n/test/text";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { applyEffect } from "@/lib/utils/abilities/registry/effects";
import type { Effect } from "@/lib/utils/abilities/schema";
import { segmentsLine } from "@/lib/utils/abilities/segments";
import { hashJson } from "@/lib/utils/battle/store/stable-json";
import { monsterSenseAbilities,multiattackAbilities } from "@/lib/utils/units/monster";

const CYRILLIC = /[А-Яа-яІіЇїЄєҐґ]/;

function messagesOf(effect: Effect) {
  const ps = [makeParticipant({ id: "o" }), makeParticipant({ id: "t", side: ParticipantSide.ENEMY })];

  const ability = resolved({ name: "Spark", trigger: { event: "hit", role: "attacker" }, effects: [effect] });

  return applyEffect({ participants: ps, ability, effectIndex: 0, ownerId: "o", effect, targetIds: ["t"], event: { type: "hit", actorId: "o", targetId: "t", attackKind: "melee", damage: 10 }, ctx: { round: 1, rng: seq(0.5) } }).messages;
}

describe("log lines carry keys, not a rendered locale", () => {
  it("modifyStat and grantAction render without Cyrillic in en", () => {
    const stat = messagesOf({ kind: "modifyStat", stat: "speed", flat: 5, duration: { rounds: 2 }, target: "self" });

    const grant = messagesOf({ kind: "grantAction", extraActions: 1, refreshReaction: true, target: "self" });

    for (const line of [...stat, ...grant]) {
      expect(textOf(line, "en")).not.toMatch(CYRILLIC);
      expect(textOf(line, "uk")).toMatch(CYRILLIC);
    }

    expect(grant.length).toBeGreaterThan(0);
    expect(stat.length).toBeGreaterThan(0);
  });

  it("segmentsLine joins nested segments at render time", () => {
    const line = segmentsLine([{ key: "summary.effects.help" }, { key: "summary.effects.help" }]);

    expect(textOf(line, "en")).toContain(" · ");
  });
});

describe("derived abilities", () => {
  it("multiattack and senses keep an id-like name and a label ref", () => {
    const [multi] = multiattackAbilities({ id: "u", name: "Orc", multiattack: 3 });

    expect(multi?.name).toBe("multiattack");
    expect(textOf(multi?.label as never, "en")).toBe("Multiattack ×3");
    expect(textOf(multi?.label as never, "uk")).toBe("Мультиатака ×3");

    const senses = monsterSenseAbilities({ id: "u", name: "Orc", cr: 1 }, { darkvision: 60 } as never);

    expect(senses.map((a) => a.name)).toEqual(["sense-darkvision"]);
    expect(textOf(senses[0]?.label as never, "en")).toBe("Darkvision");
  });

  it("snapshot hash does not depend on the language", () => {
    const abilities = multiattackAbilities({ id: "u", name: "Orc", multiattack: 2 });

    const before = hashJson(abilities);

    textOf(abilities[0]?.label as never, "en");
    textOf(abilities[0]?.label as never, "uk");

    expect(hashJson(JSON.parse(JSON.stringify(abilities)))).toBe(before);
    expect(JSON.stringify(abilities)).not.toMatch(CYRILLIC);
  });
});
