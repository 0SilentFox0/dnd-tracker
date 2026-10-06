// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DMUnitsPageClient } from "@/app/campaigns/[id]/dm/units/page-client";
import { mockMatchMedia } from "@/components/ui/__tests__/match-media";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import type { Unit } from "@/types/units";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const races = [{ id: "r1", campaignId: "c1", name: "Гобліни", color: "#22c55e", icon: null, availableSkills: [], disabledSkills: [] }];

const base = { campaignId: "c1", level: 1, strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10, armorClass: 12, initiative: 0, speed: 30, maxHp: 7, proficiencyBonus: 2, minTargets: 1, maxTargets: 1, attacks: [], immunities: [], knownSpells: [], avatar: null };

const goblin = { ...base, id: "u1", name: "Гоблін-лучник", raceId: "r1" } as unknown as Unit;

const wolf = { ...base, id: "u2", name: "Вовк", raceId: null } as unknown as Unit;

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });

function renderPage(units: Unit[]) {
  vi.stubGlobal("fetch", vi.fn(async (url: RequestInfo | URL) => json(String(url).includes("/races") ? races : units)));

  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ConfirmProvider>
        <DMUnitsPageClient campaignId="c1" initialUnits={units} />
      </ConfirmProvider>
    </QueryClientProvider>,
  );
}

describe("DM units list", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("порожній список — EmptyState із заголовком", () => {
    renderPage([]);

    expect(screen.getByText("Ще немає юнітів")).toBeInTheDocument();
  });

  it("раси згорнуті за замовчуванням, «Без раси» — остання", async () => {
    mockMatchMedia(false);
    renderPage([goblin, wolf]);

    await screen.findByText("Гобліни");

    expect(screen.getAllByText(/^(Гобліни|Без раси)$/).map((n) => n.textContent)).toEqual(["Гобліни", "Без раси"]);
    expect(screen.queryByText("Гоблін-лучник")).toBeNull();
    expect(screen.queryByText("Вовк")).toBeNull();
  });

  it("пошук розгортає групу зі збігом і ховає групи без збігів", async () => {
    mockMatchMedia(false);
    renderPage([goblin, wolf]);
    await screen.findByText("Гобліни");

    fireEvent.change(screen.getByLabelText("Пошук юнітів"), { target: { value: "вовк" } });

    expect(await screen.findByText("Вовк")).toBeInTheDocument();
    expect(screen.queryByText("Гобліни")).toBeNull();
  });

  it("чіп раси лишає лише її групу", async () => {
    mockMatchMedia(false);
    renderPage([goblin, wolf]);
    await screen.findByText("Гобліни");

    fireEvent.click(screen.getByRole("button", { name: /Гобліни · 1/ }));

    expect(screen.getByRole("button", { name: /Гобліни · 1/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText("Без раси")).toBeNull();
  });
});
