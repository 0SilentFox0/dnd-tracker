// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const proposals = { all: [], pending: [{ id: "a" }, { id: "b" }], byId: vi.fn(), apply: vi.fn(), reject: vi.fn(), isApplying: false, refresh: vi.fn() };

const page = { id: "p1", kind: "info", title: "Сторінка", version: 1, content: { legend: [], sections: [] } };

vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("@/lib/hooks/ai", () => ({ useAiProposals: () => proposals }));
vi.mock("@/components/ai", () => ({
  AiPanel: () => <div data-testid="ai-panel" />,
  AiProposalCard: () => null,
  AiProposalBadge: ({ count, onClick }: { count: number; onClick: () => void }) => <button onClick={onClick}>{`бейдж ${count}`}</button>,
}));
vi.mock("@/components/common/states", () => ({ LoadingState: () => null, QueryState: ({ children }: { children: (p: unknown) => React.ReactNode }) => <>{children(page)}</> }));
vi.mock("@/components/scenario", () => ({ ScenarioBar: ({ actions }: { actions: React.ReactNode }) => <div>{actions}</div>, ScenarioBook: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, ScenarioPageView: () => null }));
vi.mock("@/components/scenario/editor/VersionsDialog", () => ({ VersionsDialog: () => null }));
vi.mock("@/components/scenario/play/ScenarioShowDock", () => ({ ScenarioShowDock: () => null }));
vi.mock("@/lib/hooks/scenario", () => ({
  useScenarioPage: () => ({}),
  useScenarioPlay: () => ({}),
  useSectionProgress: () => ({ setPlayed: vi.fn(), setRevealed: vi.fn(), isPending: false }),
}));

import { ScenarioPageClient } from "../[pageId]/page-client";

afterEach(cleanup);

describe("ScenarioPageClient AI", () => {
  it("aiEnabled=false: без кнопки AI", () => {
    render(<ScenarioPageClient campaignId="c1" pageId="p1" playedPages={[]} aiEnabled={false} />);
    expect(screen.queryByRole("button", { name: "AI" })).toBeNull();
  });

  it("aiEnabled=true: кнопка відкриває панель, бейдж показує кількість", () => {
    render(<ScenarioPageClient campaignId="c1" pageId="p1" playedPages={[]} aiEnabled />);
    expect(screen.getByText("бейдж 2")).toBeTruthy();
    expect(screen.queryByTestId("ai-panel")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "AI" }));
    expect(screen.getByTestId("ai-panel")).toBeTruthy();
  });
});
