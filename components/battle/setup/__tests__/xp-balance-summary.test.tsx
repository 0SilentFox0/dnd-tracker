// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { XpBalanceSummary } from "@/components/battle/setup/XpBalanceSummary";
import { computeXpBudget } from "@/lib/utils/battle/balance/xp-budget";

afterEach(cleanup);

const units = [{ id: "ogre", name: "Огр" }, { id: "gob", name: "Гоблін" }];

describe("XpBalanceSummary", () => {
  it("складність, XP з множником, пороги, юніти без CR", () => {
    const xp = computeXpBudget({ edition: "2014", heroLevels: [3, 3, 3, 3], enemies: [{ unitId: "ogre", quantity: 2, xp: 450 }, { unitId: "gob", quantity: 3, xp: null }] });

    render(<XpBalanceSummary xp={xp} units={units} />);

    expect(screen.getByTestId("xp-difficulty").textContent).toBe('battleSetup.xp.difficulty {"label":"battleTerms.encounterDifficulty.hard"}');
    expect(screen.getByText('battleSetup.xp.enemyXpScaled {"xp":"900","multiplier":"1.5","adjusted":"1350"}')).toBeTruthy();
    expect(screen.getByText("battleTerms.encounterDifficulty.deadly 1600")).toBeTruthy();
    expect(screen.getByTestId("xp-missing-cr").textContent).toBe('battleSetup.xp.missingCr {"names":"Гоблін"}');
  });

  it("2024 без множника; порожній склад — підказка", () => {
    const xp = computeXpBudget({ edition: "2024", heroLevels: [3, 3, 3, 3], enemies: [{ unitId: "ogre", quantity: 2, xp: 450 }] });

    const { rerender } = render(<XpBalanceSummary xp={xp} units={units} />);

    expect(screen.getByText('battleSetup.xp.enemyXp {"xp":"900"}')).toBeTruthy();

    rerender(<XpBalanceSummary xp={null} units={units} />);

    expect(screen.getByText("battleSetup.xp.empty")).toBeTruthy();
  });
});
