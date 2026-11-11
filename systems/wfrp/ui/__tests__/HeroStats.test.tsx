// @vitest-environment happy-dom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HeroStats } from "../HeroStats";

import { ProfileProvider } from "@/components/character-profile/ProfileContext";
import { render } from "@/lib/i18n/test/render-uk";
import type { CharacterSheet } from "@/types/characters";

vi.unmock("next-intl");

const mount = (corruption?: { points: number; threshold: number; mutations: [] }) =>
  render(
    <ProfileProvider campaignId="c" characterId="h" canEdit={false} sheet={{ systemSlot: { key: "wfrp", data: { wounds: { max: 10 }, move: { walkYd: 8, runYd: 16 }, fate: 2, fortune: 2, sin: 0, ...(corruption && { corruption }) } } } as unknown as CharacterSheet}>
      <HeroStats />
    </ProfileProvider>,
  );

describe("HeroStats", () => {
  afterEach(cleanup);

  it("shows a corruption chip points/threshold", () => {
    mount({ points: 3, threshold: 6, mutations: [] });

    expect(screen.getAllByText("3/6").length).toBeGreaterThan(0);
  });

  it("omits the chip without corruption", () => {
    mount();

    expect(screen.queryByText("3/6")).toBeNull();
  });
});
