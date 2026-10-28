import { describe, expect, it } from "vitest";

import { context, goblin, participant } from "./fixtures";

import { abilityActionMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/ability-action/ability-action-mutation";
import { resolved } from "@/lib/utils/abilities/__tests__/fixtures";

const wing = resolved({ id: "wing", name: "Удар крилами", trigger: { event: "action" }, limits: { legendaryCost: 1 }, effects: [{ kind: "changeMorale", delta: 1 }] });

const base = participant("hero", { controlledBy: "user-1" });

const hero = { ...base, battleData: { ...base.battleData, resolvedAbilities: [wing] } };

describe("ability-action: легендарне вміння", () => {
  it("не використовується звичайною дією", async () => {
    await expect(abilityActionMutation(context({ participants: [hero, goblin] }), { participantId: "hero", abilityKey: wing.key })).rejects.toMatchObject({ message: "Це вміння — легендарна дія, її використовують поза своїм ходом" });
  });
});
