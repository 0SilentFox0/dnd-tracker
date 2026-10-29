// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ArtifactSetBonusDisplay } from "@/components/artifact-sets/ArtifactSetBonusDisplay";
import { ArtifactCard } from "@/components/artifacts/ArtifactCard";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import type { AbilityFlowSummary } from "@/lib/utils/abilities/segments";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/api/artifacts", () => ({ updateArtifact: vi.fn(async () => { throw new Error("offline"); }) }));

Object.assign(Element.prototype, { hasPointerCapture: () => false, releasePointerCapture: () => {}, setPointerCapture: () => {}, scrollIntoView: () => {} });

const withQuery = (ui: React.ReactElement) => <QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>;

const line = (value: string): AbilityFlowSummary => ({ when: [{ key: "summary.text", params: { value } }], if: [], then: [], limits: [] });

const shown = (value: string) => `abilityRegistry.summary.text {"value":"${value}"}`;

describe("картки артефактів", () => {
  it("ArtifactCard без іконки — літера назви в повній і компактній картці", () => {
    const artifact = { id: "a1", name: "меч зорі", slot: "weapon", rarity: null, icon: null, description: null, abilitySummary: [] };

    renderWithConfirm(withQuery(<ArtifactCard campaignId="c1" artifact={artifact} />));
    expect(screen.getByText("М")).toBeInTheDocument();
    cleanup();
    renderWithConfirm(withQuery(<ArtifactCard campaignId="c1" artifact={artifact} variant="compact" />));
    expect(screen.getByText("М")).toBeInTheDocument();
  });

  afterEach(cleanup);

  it("ArtifactCard показує опис умінь", () => {
    renderWithConfirm(
      withQuery(
        <ArtifactCard
          campaignId="c1"
          artifact={{ id: "a1", name: "Меч", slot: "weapon", rarity: null, icon: null, description: null, abilitySummary: [line("шкода +2")] }}
        />,
      ),
    );

    expect(screen.getByText(shown("шкода +2"))).toBeInTheDocument();
  });

  it("ArtifactSetBonusDisplay показує назву бонусу й уміння сету", () => {
    render(<ArtifactSetBonusDisplay setBonus={{ name: "Кров дракона" }} abilitySummary={[line("AC +1")]} />);

    expect(screen.getByText("Кров дракона")).toBeInTheDocument();
    expect(screen.getByText(shown("AC +1"))).toBeInTheDocument();
  });

  it("невдала зміна слоту повертає попередній слот і показує повідомлення", async () => {
    renderWithConfirm(
      withQuery(<ArtifactCard campaignId="c1" artifact={{ id: "a1", name: "Меч", slot: "weapon", rarity: null, icon: null, description: null, abilitySummary: [] }} />),
    );

    fireEvent.pointerDown(screen.getByRole("combobox"), { button: 0, ctrlKey: false, pointerType: "mouse" });
    fireEvent.click(await screen.findByRole("option", { name: "artifacts.slots.ring" }));

    expect(await screen.findByText("artifacts.card.slotChangeFailed")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { hidden: true })).toHaveTextContent("artifacts.slots.weapon");
  });
});
