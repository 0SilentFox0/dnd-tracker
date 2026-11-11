// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PartyRestActions } from "../PartyRestActions";

import type { CharacterListItem } from "@/types/characters";

const h = vi.hoisted(() => ({ system: "wfrp", persist: true }));

vi.mock("@/lib/hooks/campaigns", async (orig) => ({ ...(await orig<object>()), useCampaignRules: () => ({ data: { outOfCombat: { persistResources: h.persist, xp: false }, system: { key: h.system } } }) }));
vi.mock("@/lib/hooks/characters", async (orig) => ({ ...(await orig<object>()), useRest: () => ({ mutateOk: vi.fn(), isPending: false }) }));
vi.mock("@/lib/hooks/common", async (orig) => ({ ...(await orig<object>()), useConfirm: () => vi.fn() }));
vi.mock("@/components/systems", () => ({ systemUiOf: (key: string) => (key === "wfrp" ? { DowntimePeriodPanel: () => <div data-testid="panel" /> } : {}) }));

const hero = { id: "a", name: "a", campaignId: "c", type: "player", controlledBy: "u", level: 1, class: "x", race: "y" } as CharacterListItem;

describe("PartyRestActions downtime panel", () => {
  afterEach(cleanup);

  it("wfrp with persisted resources renders the panel", () => {
    h.system = "wfrp";
    h.persist = true;
    render(<PartyRestActions campaignId="c" characters={[hero]} />);

    expect(screen.getByTestId("panel")).toBeTruthy();
  });

  it("homm has no panel", () => {
    h.system = "homm";
    render(<PartyRestActions campaignId="c" characters={[hero]} />);

    expect(screen.queryByTestId("panel")).toBeNull();
  });

  it("wfrp without persisted resources has no panel", () => {
    h.system = "wfrp";
    h.persist = false;
    render(<PartyRestActions campaignId="c" characters={[hero]} />);

    expect(screen.queryByTestId("panel")).toBeNull();
  });
});
