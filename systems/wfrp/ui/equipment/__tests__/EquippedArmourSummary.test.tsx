// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EquippedArmourSummary } from "../EquippedArmourSummary";

const state = vi.hoisted(() => ({ grid: {} as Record<string, unknown>, wfrp: undefined as unknown, stash: undefined as unknown }));

vi.mock("@/lib/hooks/characters", () => ({ useCharacterSheet: () => ({ data: { viewer: { isDM: true, isOwner: false }, wfrp: state.wfrp, items: { grid: state.grid } } }), useStash: () => ({ data: state.stash }) }));

afterEach(() => {
  cleanup();
  state.wfrp = undefined;
  state.stash = undefined;
});

const armour = (locations: Record<string, number>, qualities: unknown[] = []) => ({ type: "armour", locations: { head: 0, arm: 0, body: 0, leg: 0, ...locations }, kind: "mail", qualities, weight: 1, price: 1 });

const item = (slot: string, systemStats: unknown, carried?: true) => ({ id: slot, name: slot, slot, systemStats, ...(carried && { carried }) });

describe("EquippedArmourSummary", () => {
  it("shows AP per location, the armour penalty and the shield bonus", () => {
    state.grid = {
      armor: item("armor", armour({ body: 3, arm: 1 })),
      helmet: item("helmet", armour({ head: 2 })),
      shield: item("shield", { type: "gear", weight: 1, price: 1, qualities: [{ key: "shield", value: 2 }] }),
    };

    render(<EquippedArmourSummary campaignId="c" characterId="h" />);

    expect(screen.getByLabelText("wfrpEquipment.locations.head").textContent).toContain("4");
    expect(screen.getByLabelText("wfrpEquipment.locations.arm").textContent).toContain("3");
    expect(screen.getByLabelText("wfrpEquipment.locations.body").textContent).toContain("5");
    expect(screen.getByLabelText("wfrpEquipment.locations.leg").textContent).toContain("0");
    expect(screen.getByText(/wfrpEquipment.summary.penalty/).textContent).toContain("3");
    expect(screen.getByText(/wfrpEquipment.summary.shield/)).toBeTruthy();
  });

  it("drops the penalty for flexible armour and ignores carried items", () => {
    state.grid = {
      armor: item("armor", armour({ body: 2 }, [{ key: "flexible" }])),
      boots: item("boots", armour({ leg: 4 }), true),
    };

    render(<EquippedArmourSummary campaignId="c" characterId="h" />);

    expect(screen.getByLabelText("wfrpEquipment.locations.leg").textContent).toContain("0");
    expect(screen.getByText(/wfrpEquipment.summary.penalty/).textContent).toContain("0");
    expect(screen.getByText("wfrpEquipment.summary.flexible")).toBeTruthy();
  });

  it("shows carried weight against SB + TB from equipped and backpack items", () => {
    const gear = (weight: number) => ({ type: "gear", weight, price: 1, qualities: [] });

    state.wfrp = { characteristics: [{ key: "s", value: 40 }, { key: "t", value: 30 }] };
    state.grid = { armor: item("armor", armour({ body: 1 })), shield: item("shield", gear(2)) };
    state.stash = { artifacts: [{ id: "bag", systemStats: gear(5) }] };

    render(<EquippedArmourSummary campaignId="c" characterId="h" />);

    expect(screen.getByText(/wfrpEquipment.encumbrance.label/).textContent).toContain('"carried":8,"limit":7');
    expect(screen.getByText("wfrpEquipment.encumbrance.over")).toBeTruthy();
  });
});
