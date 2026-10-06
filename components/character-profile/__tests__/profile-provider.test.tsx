// @vitest-environment happy-dom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { sheetFixture } from "./sheet-fixture";

import { type ProfileContextValue, ProfileProvider, useProfile } from "@/components/character-profile/ProfileContext";

describe("ProfileProvider", () => {
  afterEach(cleanup);

  it("keeps the context value between renders while its fields are unchanged", () => {
    const seen: ProfileContextValue[] = [];

    function Probe() {
      seen.push(useProfile());

      return null;
    }

    const ui = (canEdit: boolean) => (
      <ProfileProvider campaignId="c" characterId="ch" sheet={sheetFixture} canEdit={canEdit}>
        <Probe />
      </ProfileProvider>
    );

    const { rerender } = render(ui(false));

    rerender(ui(false));
    rerender(ui(true));

    expect(seen).toHaveLength(3);
    expect(seen[1]).toBe(seen[0]);
    expect(seen[2]).not.toBe(seen[1]);
    expect(seen[2].canEdit).toBe(true);
  });
});
