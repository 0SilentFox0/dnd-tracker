// @vitest-environment happy-dom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UnitCard } from "../list/UnitCard";

import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";
import type { Unit } from "@/types/units";

vi.unmock("next-intl");

vi.mock("@/lib/hooks/units", () => ({ useUnitQuickStats: () => ({ field: () => ({ id: "f", key: "f", defaultValue: "", commit: vi.fn() }), isBusy: false }) }));

const unit = { id: "u1", name: "Goblin", level: 3, maxHp: 7, armorClass: 12, attacks: [], knownSpells: ["a", "b"], immunities: [], abilitySummary: [] } as unknown as Unit;

describe("UnitCard en", () => {
  afterEach(cleanup);

  it("renders English labels without raw keys", async () => {
    await renderWithIntl(<ConfirmProvider><UnitCard unit={unit} campaignId="c1" onDelete={vi.fn()} /></ConfirmProvider>, { locale: "en", namespaces: ["common", "validation", "units"] });

    expect(screen.getByText("Level 3 • HP 7")).toBeInTheDocument();
    expect(screen.getByText("2 spells")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete unit Goblin" })).toBeInTheDocument();
    expect(screen.getAllByText("Armor (AC)").length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/units\./);
  });
});
