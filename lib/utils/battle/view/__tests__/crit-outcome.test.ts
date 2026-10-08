import { describe, expect, it } from "vitest";

import { critOutcome } from "@/lib/utils/battle/view";
import type { BattleAction } from "@/types/battle";

const atk = (actionIndex: number, targetId: string, criticalEffect?: object, actionType = "attack") =>
  ({ actionIndex, actionType, actorId: "me", targets: [{ participantId: targetId, participantName: targetId }], actionDetails: { ...(criticalEffect && { criticalEffect }) } }) as unknown as BattleAction;

const free = { id: 1, name: "Безкоштовна атака", description: "", type: "success", flavor: "Вихор сталі" };

describe("critOutcome", () => {
  const log = [atk(1, "a"), atk(2, "b", free), atk(3, "b", { id: 9, name: "Падіння", description: "", type: "fail" }, "retaliation")];

  it("ефект атаки саме по цій цілі, не відсічі", () => {
    expect(critOutcome(log, new Set(), "me", "a")).toBeUndefined();
    expect(critOutcome(log, new Set(), "me", "b")).toEqual({ name: "Безкоштовна атака", flavor: "Вихор сталі", type: "success" });
  });

  it("записи з seen ігноруються", () => {
    expect(critOutcome(log, new Set([2]), "me", "b")).toBeUndefined();
  });
});
