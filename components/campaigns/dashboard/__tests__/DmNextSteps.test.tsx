// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { DmNextSteps } from "@/components/campaigns/dashboard/DmNextSteps";
import { BattleStatus } from "@/lib/constants/battle";
import type { DmDashboardData } from "@/types/campaigns";

afterEach(cleanup);

const empty: DmDashboardData = { pendingDrafts: 0, scenarioPages: [], battles: [] };

describe("DmNextSteps", () => {
  it("hides preparation when nothing is pending but keeps session buttons", () => {
    render(<DmNextSteps campaignId="c1" data={empty} />);

    expect(screen.queryByText("Підготовка")).toBeNull();
    expect(screen.queryByText(/На схваленні/)).toBeNull();
    expect(screen.getByRole("link", { name: "Показ" }).getAttribute("href")).toBe("/campaigns/c1/dm/show");
    expect(screen.getByRole("link", { name: "Глобальна карта" }).getAttribute("href")).toBe("/campaigns/c1/dm/world");
    expect(screen.getByRole("link", { name: "Музика" }).getAttribute("href")).toBe("/campaigns/c1/dm/music");
  });

  it("links pending drafts, scenario pages and battles with status badge", () => {
    render(<DmNextSteps campaignId="c1" data={{ pendingDrafts: 2, scenarioPages: [{ id: "p1", title: "Таверна" }], battles: [{ id: "b1", name: "Засідка", status: BattleStatus.ACTIVE }] }} />);

    expect(screen.getByText("Підготовка")).toBeTruthy();
    expect(screen.getByRole("link", { name: /На схваленні: 2/ }).getAttribute("href")).toBe("/campaigns/c1/dm/characters");
    expect(screen.getByRole("link", { name: /Таверна/ }).getAttribute("href")).toBe("/campaigns/c1/dm/scenario/p1");
    expect(screen.getByRole("link", { name: /Засідка/ }).getAttribute("href")).toBe("/campaigns/c1/battles/b1");
    expect(screen.getByText("йде")).toBeTruthy();
  });
});
