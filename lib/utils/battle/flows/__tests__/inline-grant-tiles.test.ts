import { describe, expect, it } from "vitest";

import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { buildSpellPick, grantsFor, initialSpellFlow, inlineSpellTiles, spellFlow, spellPayload } from "@/lib/utils/battle/flows";
import { isGrantLive } from "@/lib/utils/battle/spell/inline-grant";
import type { SpellGrant } from "@/types/battle";
import type { BookSpell } from "@/types/spells";

const host = { id: "sprout", name: "Паросток", level: 1, icon: "i" } as unknown as BookSpell;

const grant: SpellGrant = {
  spellId: "sprout", key: "cast:c:sprout@1#0:0", label: "Удар паростком", castCost: "bonusAction", expiresRound: 3, cost: 0,
  inline: { targeting: { kind: "enemy", range: 5 }, resolution: { kind: "attack" }, dice: 1, dieSides: 8, effects: [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "slashing" }] },
};

const base = makeParticipant({ id: "c" });

const caster = { ...base, spellcasting: { ...base.spellcasting, knownSpells: ["sprout"], grants: [grant, { spellId: "sprout", key: "plain" }] } };

describe("inline grant tiles", () => {
  it("a live grant becomes its own tile with the grant definition and a dead one is hidden", () => {
    const [tile] = inlineSpellTiles(caster, [host], () => true);

    expect(tile).toMatchObject({ id: grant.key, hostSpellId: "sprout", name: "Удар паростком", level: 0, cost: "bonusAction", dice: 1, dieSides: 8, icon: "i" });
    expect(inlineSpellTiles(caster, [host], () => false)).toEqual([]);
  });

  it("inline grants are not offered as sources of the host spell", () => {
    expect(grantsFor(caster, "sprout").map((g) => g.key)).toEqual(["plain"]);
  });

  it("picking a tile sends the host spell id with the grant key", () => {
    const [tile] = inlineSpellTiles(caster, [host], () => true);

    const s = spellFlow({ ...initialSpellFlow, step: "book", casterId: "c" }, { type: "PICK", pick: buildSpellPick([caster], caster, tile) });

    expect(spellPayload(s)).toMatchObject({ spellId: "sprout", grantKey: grant.key });
  });

  it("liveness follows the expiry round", () => {
    expect(isGrantLive(grant, 3, [caster])).toBe(true);
    expect(isGrantLive(grant, 4, [caster])).toBe(false);
  });
});
