// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { sheetFixture } from "../../__tests__/sheet-fixture";
import { ProfileProvider } from "../../ProfileContext";
import { ResourcesDialog } from "../ResourcesDialog";

import { mockMatchMedia } from "@/components/ui/__tests__/match-media";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import type { SheetRest } from "@/types/characters";

const h = vi.hoisted(() => ({ edit: { mutateOk: vi.fn(async () => true), isPending: false } }));

vi.mock("@/lib/hooks/characters", async (orig) => ({ ...(await orig<object>()), useEditResources: () => h.edit }));

const rest: SheetRest = {
  persist: true,
  hp: { current: 10, max: 20, temp: 0 },
  dead: false,
  exhaustion: 0,
  shortRestOpen: false,
  hitDice: [],
  charges: [
    { key: "pool:item:wand", name: "Wand of Magic Missiles", uses: 7, used: 2, rest: "long" },
    { key: "artifact:x:rage", name: "Rage", uses: 3, used: 1, rest: "long" },
    { key: "pool:grant:feat%3Amagic-initiate:sp-guidance", name: "Magic Initiate: Guidance", uses: 1, used: 1, rest: "long" },
    { key: "pool:consumable:scroll-stack", name: "Spell Scroll", uses: 1, used: 0, rest: null },
  ],
  arcaneRecovery: null, inspiration: null,
  xp: null,
};

afterEach(cleanup);

describe("ResourcesDialog: persistent charges", () => {
  it("lists item and spell grant pools but excludes consumables, then saves changed use counts", () => {
    mockMatchMedia(false);
    renderWithConfirm(
      <ProfileProvider campaignId="c" characterId="ch" sheet={{ ...sheetFixture, rest }} canEdit={false}>
        <ResourcesDialog rest={rest} open onOpenChange={vi.fn()} />
      </ProfileProvider>,
    );

    expect(screen.getByLabelText("Magic Initiate: Guidance: витрачено")).toBeTruthy();
    expect(screen.queryByLabelText("Spell Scroll: витрачено")).toBeNull();
    expect(screen.queryByLabelText("Rage: витрачено")).toBeNull();

    const input = screen.getByLabelText("Wand of Magic Missiles: витрачено");

    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Magic Initiate: Guidance: витрачено"), { target: { value: "0" } });

    const form = input.closest("form");

    if (!form) throw new Error("Resources form missing");

    fireEvent.submit(form);

    expect(h.edit.mutateOk).toHaveBeenCalledWith({ hp: 10, tempHp: 0, exhaustion: 0, charges: { "pool:item:wand": 0, "pool:grant:feat%3Amagic-initiate:sp-guidance": 0 } });
  });
});
