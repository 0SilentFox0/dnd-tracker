// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ArtifactSetCard } from "@/components/artifact-sets/ArtifactSetCard";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

afterEach(cleanup);

const set = { id: "s1", name: "Драконяча луска", icon: null, description: null, setBonus: { name: "Кров дракона" }, abilitySummary: ["Пасивно · AC +1"] };

const artifact = { id: "a1", name: "Шолом зорі", slot: "head", rarity: null, icon: null, description: null, abilitySummary: [], artifactSet: { name: set.name } };

const withQuery = (ui: React.ReactElement) => <QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>;

describe("ArtifactSetCard", () => {
  it("withArtifacts: назва, бонус і компактні картки артефактів", () => {
    renderWithConfirm(withQuery(<ArtifactSetCard variant="withArtifacts" campaignId="c1" set={set} artifacts={[artifact]} />));

    expect(screen.getByRole("heading", { name: "Драконяча луска" })).toBeInTheDocument();
    expect(screen.getByText("Кров дракона")).toBeInTheDocument();
    expect(screen.getByText("Шолом зорі")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Редагувати сет" }).getAttribute("href")).toBe("/campaigns/c1/dm/artifact-sets/s1");
  });

  it("summary: назва, бонус і назви артефактів без карток", () => {
    renderWithConfirm(withQuery(<ArtifactSetCard variant="summary" campaignId="c1" set={set} artifacts={[{ id: "a1", name: "Шолом зорі" }]} />));

    expect(screen.getByRole("heading", { name: "Драконяча луска" })).toBeInTheDocument();
    expect(screen.getByText("Кров дракона")).toBeInTheDocument();
    expect(screen.getByText("Шолом зорі")).toBeInTheDocument();
    expect(screen.getByText("Частин: 1")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getByRole("link", { name: "Редагувати" }).getAttribute("href")).toBe("/campaigns/c1/dm/artifact-sets/s1");
  });
});
