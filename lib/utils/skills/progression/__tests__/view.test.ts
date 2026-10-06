import { describe, expect, it } from "vitest";

import { progressionView, rankOffers } from "..";
import { lvl, TREE } from "./fixtures";

// Приклад зі спеки: Просунутий Напад (+1 зовнішній) і Основи Захисту (+1 зовнішній), рівень 8 → 2 вільні
const UNLOCKED = [lvl("attack", "basic"), lvl("attack", "advanced"), "o1", lvl("defense", "basic"), "d-o1", "racial_basic_racial"];

describe("rankOffers", () => {
  it("порядок: расове → підвищення гілок (вища першою) → скіли вкачаних гілок → Основи нових", () => {
    const ids = rankOffers(TREE, UNLOCKED, 12).map((n) => n.nodeId);

    expect(ids).toEqual([
      "racial_advanced_racial",
      lvl("attack", "expert"),
      lvl("defense", "advanced"),
      "o2",
      "o3",
      "m1",
      "m2",
      "d-m1",
      lvl("light", "basic"),
      lvl("chaos", "basic"),
    ]);
  });

  it("без вільних очок — порожньо", () => {
    expect(rankOffers(TREE, UNLOCKED, UNLOCKED.length)).toEqual([]);
  });
});

describe("progressionView", () => {
  it("очки, рядки лише вкачаних гілок, стани слотів", () => {
    const view = progressionView(TREE, [...UNLOCKED, "gone"], 8);

    expect(view.points).toEqual({ spent: 6, total: 8, free: 2 });
    expect(view.orphans).toEqual(["gone"]);
    expect(view.branches.map((b) => [b.branchId, b.level])).toEqual([["attack", "advanced"], ["defense", "basic"]]);
    expect(view.untouchedBranchCount).toBe(2);

    const attack = view.branches[0];

    expect(attack.outer.map((s) => s.state)).toEqual(["learned", "available", "available"]);
    expect(attack.inner[0]).toMatchObject({ state: "locked", reason: "needMiddleAndExpert" });
    expect(view.branches[1].outer[1]).toMatchObject({ nodeId: "d-o2", state: "locked", reason: "outerLimit" });
    expect(view.branches[1].outer[2]).toEqual({ nodeId: null, state: "locked", reason: "notInTree" });
  });

  it("расові й ультимейт", () => {
    const view = progressionView(TREE, UNLOCKED, 8);

    expect(view.racial.map((s) => s.state)).toEqual(["learned", "locked", "locked"]);
    expect(view.racial[1].reason).toBe("racialLevel");
    expect(view.ultimate).toMatchObject({ nodeId: "ult", state: "locked", reason: "needInner" });
  });

  it("без вільних очок доступне стає locked/noPoints", () => {
    const view = progressionView(TREE, UNLOCKED, 6);

    expect(view.branches[0].outer[1]).toMatchObject({ state: "locked", reason: "noPoints" });
  });
});
