import { describe, expect, it } from "vitest";

import { context, goblin, participant } from "./fixtures";

import { abilityActionMutation } from "@/lib/server/battles/mutations/ability-action/ability-action-mutation";
import { resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { REJECT } from "@/lib/utils/battle/store/reject";

const wing = resolved({ id: "wing", name: "Удар крилами", trigger: { event: "action" }, limits: { legendaryCost: 1 }, effects: [{ kind: "changeMorale", delta: 1 }] });

const base = participant("hero", { controlledBy: "user-1" });

const hero = { ...base, battleData: { ...base.battleData, resolvedAbilities: [wing] } };

describe("ability-action: легендарне вміння", () => {
  it("не використовується звичайною дією", async () => {
    await expect(abilityActionMutation(context({ participants: [hero, goblin] }), { participantId: "hero", abilityKey: wing.key })).rejects.toMatchObject({ message: REJECT.abilityIsLegendary });
  });
});
