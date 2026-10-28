// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/hooks/campaigns", () => ({ useCampaignRules: () => ({ data: undefined }) }));

import { CharacterCombatParams } from "@/components/characters/stats/CharacterCombatParams";

const combatStats = { data: { armorClass: 12, initiative: 10, speed: 30, minTargets: 1, maxTargets: 1, morale: 0 }, set: vi.fn() } as never;

describe("CharacterCombatParams AC in class mode", () => {
  afterEach(cleanup);

  it("plain input outside class mode", () => {
    render(<CharacterCombatParams campaignId="c" combatStats={combatStats} />);

    expect((screen.getByLabelText("Клас Броні (AC)") as HTMLInputElement).value).toBe("12");
  });

  it("read-only value and breakdown in class mode", () => {
    render(<CharacterCombatParams campaignId="c" combatStats={combatStats} classArmor={{ total: 16, lines: [{ label: "Chain Mail", value: "16", source: "artifact" }] }} />);

    expect(screen.queryByLabelText("Клас Броні (AC)")).toBeNull();
    expect(screen.getByText("16")).toBeTruthy();
    expect(screen.getByText("Chain Mail 16")).toBeTruthy();
  });

  it("new class-mode hero: computed automatically", () => {
    render(<CharacterCombatParams campaignId="c" combatStats={combatStats} classArmor={null} />);

    expect(screen.getByText("КЗ рахується з броні й Спритності")).toBeTruthy();
  });
});
