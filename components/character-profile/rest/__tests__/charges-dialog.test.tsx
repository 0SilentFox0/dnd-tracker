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
  ],
  inspiration: null,
  xp: null,
};

afterEach(cleanup);

describe("ResourcesDialog: item charges", () => {
  it("lists only item pools and sends changed spent charges", () => {
    mockMatchMedia(false);
    renderWithConfirm(
      <ProfileProvider campaignId="c" characterId="ch" sheet={{ ...sheetFixture, rest }} canEdit={false}>
        <ResourcesDialog rest={rest} open onOpenChange={vi.fn()} />
      </ProfileProvider>,
    );

    expect(screen.queryByLabelText("Rage: витрачено")).toBeNull();

    const input = screen.getByLabelText("Wand of Magic Missiles: витрачено");

    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.submit(input.closest("form")!);

    expect(h.edit.mutateOk).toHaveBeenCalledWith({ hp: 10, tempHp: 0, exhaustion: 0, charges: { "pool:item:wand": 0 } });
  });
});
