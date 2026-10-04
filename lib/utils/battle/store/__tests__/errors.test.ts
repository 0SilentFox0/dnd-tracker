import { describe, expect, it } from "vitest";

import { BattleAccessError, BattleConflictError, BattleRuleError } from "@/lib/utils/battle/store/errors";

describe("battle store errors", () => {
  it("несуть дані для HTTP-відповіді і розрізняються через instanceof", () => {
    const conflict = new BattleConflictError(7);

    const access = new BattleAccessError(403, "Не учасник кампанії");

    const rule = new BattleRuleError("not_your_turn", "Зараз не ваш хід");

    expect(conflict).toBeInstanceOf(BattleConflictError);
    expect(conflict.currentVersion).toBe(7);
    expect(access.status).toBe(403);
    expect(rule.code).toBe("not_your_turn");
    expect(rule).not.toBeInstanceOf(BattleAccessError);
  });
});
