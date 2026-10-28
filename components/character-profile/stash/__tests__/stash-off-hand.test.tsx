// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));

const state = vi.hoisted(() => ({ classes: false }));

vi.mock("../../ProfileContext", () => ({ useProfile: () => ({ campaignId: "c", characterId: "h" }) }));
vi.mock("../../TransferArtifactDialog", () => ({ TransferArtifactDialog: () => null }));
vi.mock("../GrantArtifactDialog", () => ({ GrantArtifactDialog: () => null }));
vi.mock("@/lib/hooks/campaigns", () => ({ useCampaignRules: () => ({ data: { classes: { enabled: state.classes } } }) }));
vi.mock("@/lib/hooks/characters", () => ({ useStashAction: () => ({ mutateAsync: vi.fn(), isPending: false }) }));
vi.mock("@/lib/hooks/common", () => ({ useConfirm: () => vi.fn(), useNotify: () => vi.fn() }));

import { StashArtifactsPanel } from "../StashArtifactsPanel";

import type { StashArtifact, StashView } from "@/types/inventory";

const art = (id: string, over: Partial<StashArtifact> = {}): StashArtifact => ({ id, name: id, icon: null, rarity: null, slot: "weapon", description: null, ...over });

const view = (...artifacts: StashArtifact[]): StashView => ({ purse: { gold: 0, silver: 0, copper: 0 } as never, items: [], artifacts });

const renderPanel = (v: StashView) => render(<StashArtifactsPanel view={v} canAct isDM={false} />);

afterEach(cleanup);

describe("StashArtifactsPanel: «У другу руку»", () => {
  it("shown for a light weapon when classes are enabled", () => {
    state.classes = true;
    renderPanel(view(art("dagger", { light: true })));

    expect(screen.getAllByText("У другу руку")).toHaveLength(1);
  });

  it("hidden for a heavy weapon", () => {
    state.classes = true;
    renderPanel(view(art("axe")));

    expect(screen.queryByText("У другу руку")).toBeNull();
  });

  it("hidden when classes are disabled", () => {
    state.classes = false;
    renderPanel(view(art("dagger", { light: true })));

    expect(screen.queryByText("У другу руку")).toBeNull();
  });
});
