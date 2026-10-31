// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BackgroundCard } from "@/components/backgrounds/BackgroundCard";
import { FeatCard } from "@/components/feats/FeatCard";
import { RaceCard } from "@/components/races/RaceCard";
import type { BackgroundData } from "@/types/backgrounds";
import type { FeatData } from "@/types/choices";
import type { Race } from "@/types/races";

vi.mock("@/lib/hooks/skills", () => ({
  useSkills: () => ({ data: [] }),
  useMainSkills: () => ({ data: [] }),
  useRacialSkills: () => ({ treeSkillCount: 0 }),
}));

const bg = (icon: string | null) => ({ id: "b", name: "Sage", icon, choices: [] }) as unknown as BackgroundData;

const feat = (icon: string | null) => ({ id: "f", name: "Alert", icon, type: "general", prerequisite: {}, repeatable: false, choices: [] }) as unknown as FeatData;

const race = (icon: string | null) => ({ id: "r", name: "Elf", icon, availableSkills: [], disabledSkills: [] }) as unknown as Race;

describe("entity cards", () => {
  afterEach(cleanup);

  it.each([
    ["BackgroundCard", (icon: string | null) => <BackgroundCard background={bg(icon)} campaignId="c" onDelete={() => {}} />, "S"],
    ["FeatCard", (icon: string | null) => <FeatCard feat={feat(icon)} campaignId="c" onDelete={() => {}} />, "A"],
    ["RaceCard", (icon: string | null) => <RaceCard race={race(icon)} campaignId="c" onDelete={() => {}} />, "E"],
  ])("%s shows the icon, or the initial without one", (_, ui, initial) => {
    const withIcon = render(ui("https://x/i.webp"));

    expect(withIcon.container.querySelectorAll("img")).toHaveLength(1);
    cleanup();

    const without = render(ui(null));

    expect(without.container.querySelectorAll("img")).toHaveLength(0);
    expect(screen.getAllByText(initial).length).toBeGreaterThan(0);
  });
});
