// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ArtifactSetBonusDisplay } from "@/components/artifact-sets/ArtifactSetBonusDisplay";
import { ArtifactCard } from "@/components/artifacts/ArtifactCard";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/api/artifacts", () => ({ updateArtifact: vi.fn(async () => { throw new Error("offline"); }) }));

Object.assign(Element.prototype, { hasPointerCapture: () => false, releasePointerCapture: () => {}, setPointerCapture: () => {}, scrollIntoView: () => {} });

const withQuery = (ui: React.ReactElement) => <QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>;

describe("картки артефактів", () => {
  afterEach(cleanup);

  it("ArtifactCard показує опис умінь", () => {
    renderWithConfirm(
      withQuery(
        <ArtifactCard
          campaignId="c1"
          artifact={{ id: "a1", name: "Меч", slot: "weapon", rarity: null, icon: null, description: null, abilitySummary: ["Пасивно · шкода (ближня) +2"] }}
        />,
      ),
    );

    expect(screen.getByText("Пасивно · шкода (ближня) +2")).toBeInTheDocument();
  });

  it("ArtifactSetBonusDisplay показує назву бонусу й уміння сету", () => {
    render(<ArtifactSetBonusDisplay setBonus={{ name: "Кров дракона" }} abilitySummary={["Пасивно · AC +1"]} />);

    expect(screen.getByText("Кров дракона")).toBeInTheDocument();
    expect(screen.getByText("Пасивно · AC +1")).toBeInTheDocument();
  });

  it("невдала зміна слоту повертає попередній слот і показує повідомлення", async () => {
    renderWithConfirm(
      withQuery(<ArtifactCard campaignId="c1" artifact={{ id: "a1", name: "Меч", slot: "weapon", rarity: null, icon: null, description: null, abilitySummary: [] }} />),
    );

    fireEvent.pointerDown(screen.getByRole("combobox"), { button: 0, ctrlKey: false, pointerType: "mouse" });
    fireEvent.click(await screen.findByRole("option", { name: "Кільце" }));

    expect(await screen.findByText("Не вдалося змінити слот")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { hidden: true })).toHaveTextContent("Зброя");
  });
});
