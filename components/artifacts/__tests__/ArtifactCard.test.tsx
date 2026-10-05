// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ArtifactSetBonusDisplay } from "@/components/artifact-sets/ArtifactSetBonusDisplay";
import { ArtifactCard } from "@/components/artifacts/ArtifactCard";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

describe("картки артефактів", () => {
  afterEach(cleanup);

  it("ArtifactCard показує опис умінь", () => {
    render(
      <ArtifactCard
        campaignId="c1"
        artifact={{ id: "a1", name: "Меч", slot: "weapon", rarity: null, icon: null, description: null, abilitySummary: ["Пасивно · шкода (ближня) +2"] }}
      />,
    );

    expect(screen.getByText("Пасивно · шкода (ближня) +2")).toBeInTheDocument();
  });

  it("ArtifactSetBonusDisplay показує назву бонусу й уміння сету", () => {
    render(<ArtifactSetBonusDisplay setBonus={{ name: "Кров дракона" }} abilitySummary={["Пасивно · AC +1"]} />);

    expect(screen.getByText("Кров дракона")).toBeInTheDocument();
    expect(screen.getByText("Пасивно · AC +1")).toBeInTheDocument();
  });
});
