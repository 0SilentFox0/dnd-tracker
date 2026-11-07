import { describe, expect, it } from "vitest";

import { CombatStatus } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { runAbilities } from "@/lib/utils/abilities/engine/core/run-abilities";
import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";
import { must } from "@/lib/utils/rules/systems/wfrp/traits/__tests__/fixtures";
import { TRAIT_RECIPES } from "@/lib/utils/rules/systems/wfrp/traits/recipes";
import type { BattleParticipant } from "@/types/battle";

const recipe = must(TRAIT_RECIPES.find((r) => r.id === "regenerate"));

const built = recipe.build({}, { name: "Regenerate" } as never);

const ability = resolved((built as unknown as { ability: Parameters<typeof resolved>[0] }).ability, { id: "troll" });

const troll = (over: { hp: number; status?: (typeof CombatStatus)[keyof typeof CombatStatus] }): BattleParticipant => {
  const p = makeParticipant({ id: "t", hp: over.hp, maxHp: 20, abilities: [ability] });

  return { ...p, combatStats: { ...p.combatStats, status: over.status ?? CombatStatus.ACTIVE } };
};

const run = (p: BattleParticipant) => runAbilities([p], { type: "turnStart", actorId: "t" } as never, { rules: WFRP_RULES as never, round: 1, rng: seq(0.5) });

describe("regenerate recipe", () => {
  it("heals a wounded active creature up to max", () => {
    const r = run(troll({ hp: 10 }));

    expect(r.participants[0].combatStats.currentHp).toBeGreaterThan(10);
    expect(r.participants[0].combatStats.currentHp).toBeLessThanOrEqual(20);
    expect(r.messages.length).toBeGreaterThan(0);
  });

  it.each([
    ["unconscious at 0 wounds", troll({ hp: 0, status: CombatStatus.UNCONSCIOUS })],
    ["unconscious by DM with hp", troll({ hp: 5, status: CombatStatus.UNCONSCIOUS })],
    ["dead", troll({ hp: 0, status: CombatStatus.DEAD })],
  ])("does not heal %s and logs nothing", (_n, p) => {
    const r = run(p);

    expect(r.participants[0].combatStats.currentHp).toBe(p.combatStats.currentHp);
    expect(JSON.stringify(r.messages)).not.toMatch(/log\.(heal|revive)/);
  });

  it("full hp: no line", () => {
    expect(JSON.stringify(run(troll({ hp: 20 })).messages)).not.toMatch(/log\.heal/);
  });
});
