// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DmNextSteps } from "@/components/campaigns/dashboard/DmNextSteps";
import { BattleStatus } from "@/lib/constants/battle";
import type { DmDashboardData } from "@/types/campaigns";

afterEach(cleanup);

const empty: DmDashboardData = { pendingDrafts: 0, scenarioPages: [], battles: [], sourceUpdate: null };

const safe = vi.hoisted(() => ({ mutate: vi.fn(), data: undefined as { applied: number } | undefined }));

vi.mock("@/lib/hooks/campaigns", () => ({ useApplySafeSourceChanges: () => ({ mutate: safe.mutate, data: safe.data, isPending: false, isError: false }) }));

vi.mock("@/components/campaigns/templates/SourceSyncDialog", () => ({
  SourceSyncDialog: ({ open }: { open: boolean }) => (open ? <div>sync-dialog-open</div> : null),
}));

describe("DmNextSteps", () => {
  it("hides preparation when nothing is pending but keeps session buttons", () => {
    render(<DmNextSteps campaignId="c1" data={empty} />);

    expect(screen.queryByText("dashboard.nextSteps.prep")).toBeNull();
    expect(screen.queryByText(/dashboard.nextSteps.pending/)).toBeNull();
    expect(screen.getByRole("link", { name: "dashboard.nextSteps.show" }).getAttribute("href")).toBe("/campaigns/c1/dm/show");
    expect(screen.getByRole("link", { name: "dashboard.nextSteps.world" }).getAttribute("href")).toBe("/campaigns/c1/dm/world");
    expect(screen.getByRole("link", { name: "dashboard.nextSteps.music" }).getAttribute("href")).toBe("/campaigns/c1/dm/music");
  });

  it("links pending drafts, scenario pages and battles with status badge", () => {
    render(<DmNextSteps campaignId="c1" data={{ pendingDrafts: 2, scenarioPages: [{ id: "p1", title: "Таверна" }], battles: [{ id: "b1", name: "Засідка", status: BattleStatus.ACTIVE }], sourceUpdate: null }} />);

    expect(screen.getByText("dashboard.nextSteps.prep")).toBeTruthy();
    expect(screen.getByRole("link", { name: /dashboard.nextSteps.pending/ }).getAttribute("href")).toBe("/campaigns/c1/dm/characters");
    expect(screen.getByRole("link", { name: /Таверна/ }).getAttribute("href")).toBe("/campaigns/c1/dm/scenario/p1");
    expect(screen.getByRole("link", { name: /Засідка/ }).getAttribute("href")).toBe("/campaigns/c1/battles/b1");
    expect(screen.getByText("dashboard.battleStatus.active")).toBeTruthy();
  });

  it("shows the source update tile only with updates and opens the sync dialog", () => {
    const { rerender } = render(<DmNextSteps campaignId="c1" data={empty} />);

    expect(screen.queryByText(/dashboard.sourceUpdate.text/)).toBeNull();

    rerender(<DmNextSteps campaignId="c1" data={{ ...empty, sourceUpdate: { sourceVersion: 7 } }} />);

    expect(screen.getByText(/dashboard.sourceUpdate.text/).textContent).toContain("7");

    fireEvent.click(screen.getByRole("button", { name: "dashboard.sourceUpdate.review" }));

    expect(screen.getByText("sync-dialog-open")).toBeTruthy();
  });

  it("apply safe button runs the mutation and shows the applied count", () => {
    safe.data = { applied: 2 };

    render(<DmNextSteps campaignId="c1" data={{ ...empty, sourceUpdate: { sourceVersion: 7 } }} />);

    fireEvent.click(screen.getByRole("button", { name: "dashboard.sourceUpdate.applySafe" }));

    expect(safe.mutate).toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toContain("dashboard.sourceUpdate.applied");
  });
});
