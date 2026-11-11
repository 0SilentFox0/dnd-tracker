// @vitest-environment happy-dom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));
vi.mock("@/components/battle/use-system-battle-ui", async () => {
  const { CastTestBody } = await import("@/systems/wfrp/ui/battle/CastTestBody");

  return { useSystemBattleUi: () => ({ CastTest: CastTestBody }) };
});

import { SpellCastDialog } from "../SpellCastDialog";

import { render } from "@/lib/i18n/test/render-uk";

vi.unmock("next-intl");

type Props = Parameters<typeof SpellCastDialog>[0];

const target = { basicInfo: { id: "g", name: "Гоблін" } };

const book = (cast: object | null) => ({
  state: { step: "rolls", targetIds: ["g"], saves: {}, attacks: {}, damage: [], pick: { diceSlots: [], needsSaves: true, castTest: !!cast } },
  view: {
    cast,
    selected: { id: "s", name: "Іскра", level: 1 },
    slot: { options: [{ key: "1", label: "Слот 1", castLevel: 1, left: 1 }], value: "1" },
    saveTargets: [target],
    attackTargets: [],
    formulaOf: () => "",
    chain: [],
  },
  actions: { back: vi.fn(), close: vi.fn(), setSave: vi.fn(), setAttack: vi.fn(), setCastRoll: vi.fn(), setCastFortune: vi.fn(), aiDamage: vi.fn(), toSummary: vi.fn() },
}) as unknown as Props["book"];

describe("SpellCastDialog rolls step", () => {
  afterEach(cleanup);

  it("percentile casting: CN line, no slot select, no save rolls", () => {
    render(<SpellCastDialog book={book({ cn: 6, target: 50, channelTarget: 40, channelled: 2, armourSl: 0, fortune: { available: false, left: 0, value: null } })} />);
    expect(screen.getByText("СН 6 · ціль 50 · Скерування +2 · броня −0")).toBeTruthy();
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByText(/· Гоблін/)).toBeNull();
  });

  it("d20 casting keeps slot select and saves", () => {
    render(<SpellCastDialog book={book(null)} />);
    expect(screen.getByRole("combobox")).toBeTruthy();
    expect(screen.getByText(/· Гоблін/)).toBeTruthy();
    expect(screen.queryByText(/СН 6/)).toBeNull();
  });
});

describe("SpellCastDialog summary step", () => {
  afterEach(cleanup);

  const summary = (magic: boolean) => ({
    state: { step: "summary", targetIds: [], saves: {}, attacks: {}, damage: [], pick: { diceSlots: [] } },
    view: { selected: { id: "s", name: "Іскра", level: 1 }, magic, slot: { options: [], value: "" }, targets: [], formulaOf: () => "", definitionOf: () => ({ targeting: { kind: "single" } }), slotCostLabel: () => "Витратить слот I кола", ingredients: null },
    actions: { back: vi.fn(), close: vi.fn() },
  }) as unknown as Props["book"];

  it("hides slot cost line for magic systems only", () => {
    const { unmount } = render(<SpellCastDialog book={summary(true)} />);

    expect(screen.queryByText("Витратить слот I кола")).toBeNull();
    unmount();
    render(<SpellCastDialog book={summary(false)} />);
    expect(screen.getByText("Витратить слот I кола")).toBeTruthy();
  });
});
