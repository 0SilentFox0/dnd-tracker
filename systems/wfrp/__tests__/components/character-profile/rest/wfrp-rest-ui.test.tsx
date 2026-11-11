// @vitest-environment happy-dom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { sheetFixture } from "@/components/character-profile/__tests__/sheet-fixture";
import { ProfileProvider } from "@/components/character-profile/ProfileContext";
import { RestBadges } from "@/components/character-profile/rest/RestBadges";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import type { CharacterSheet, SheetRest } from "@/types/characters";

const rest: SheetRest = { persist: true, hp: { current: 10, max: 30, temp: 0 }, dead: false, exhaustion: 2, shortRestOpen: true, hitDice: [], charges: [], arcaneRecovery: null, inspiration: true, xp: null };

const show = (over: Partial<CharacterSheet>) =>
  renderWithConfirm(
    <ProfileProvider campaignId="c" characterId="ch" sheet={{ ...sheetFixture, rest, ...over }} canEdit={false}>
      <RestBadges />
    </ProfileProvider>,
  );

describe("RestBadges d20 pills", () => {
  afterEach(cleanup);

  it("d20: exhaustion, inspiration and the short-rest window show", () => {
    show({});

    expect(screen.getByText(/rest.badges.exhaustion/)).toBeTruthy();
    expect(screen.getByText("rest.badges.inspiration")).toBeTruthy();
    expect(screen.getByText("rest.badges.shortRest")).toBeTruthy();
  });

  it("wfrp: none of them show", () => {
    show({ system: "wfrp" });

    expect(screen.queryByText(/rest.badges.exhaustion/)).toBeNull();
    expect(screen.queryByText("rest.badges.inspiration")).toBeNull();
    expect(screen.queryByText("rest.badges.shortRest")).toBeNull();
  });
});
