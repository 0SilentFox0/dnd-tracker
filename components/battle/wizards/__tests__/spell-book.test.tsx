// @vitest-environment happy-dom
import { useEffect } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));

const lib = vi.hoisted(() => ({
  spells: [
    { id: "ray", name: "Палаючий промінь", level: 2, type: "target", damageType: "damage", diceCount: 2, diceType: "d6", hitCheck: { ability: "int", dc: 12 } },
    { id: "bolt", name: "Крижаний спис", level: 1, type: "target", damageType: "damage", diceCount: 3, diceType: "d8" },
  ],
}));

vi.mock("@/lib/hooks/spells", () => ({
  useSpells: vi.fn(() => ({ data: undefined })),
  useSpellsByIds: vi.fn((_campaignId: string, ids: string[]) => ({ data: lib.spells.filter((s) => ids.includes(s.id)) })),
}));

import { SpellBook } from "@/components/battle/wizards/SpellBook";
import { useSpellBook } from "@/lib/hooks/battle";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";
import { useSpells, useSpellsByIds } from "@/lib/hooks/spells";

function Harness({ caster }: { caster: Parameters<typeof useSpellBook>[0] }) {
  const book = useSpellBook(caster, {});

  useEffect(() => book.open(2), []); // eslint-disable-line react-hooks/exhaustive-deps

  return <SpellBook book={book} />;
}

describe("SpellBook", () => {
  it("стрічки кіл зі слотами; сторінка кола; спел → цілі → кидки → підсумок → застосувати", async () => {
    const { wrapper, caster, castSpell } = fakeScene({ knownSpells: ["ray", "bolt"], slots: { "1": { max: 3, current: 3 }, "2": { max: 3, current: 1 } } });

    render(<Harness caster={caster} />, { wrapper });

    expect(await screen.findByRole("button", { name: /II коло, слотів 1/ })).toBeTruthy();
    expect(screen.getByText("Палаючий промінь")).toBeTruthy();
    expect(screen.queryByText("Крижаний спис")).toBeNull();

    fireEvent.click(screen.getByText("Палаючий промінь"));
    fireEvent.click(screen.getByRole("button", { name: /Обрати цілі/ }));
    fireEvent.click(screen.getByRole("button", { name: /Гоблін/ }));
    fireEvent.click(screen.getByRole("button", { name: "Далі · кидки" }));
    fireEvent.click(screen.getByRole("button", { name: "15" }));
    fireEvent.change(screen.getByLabelText("Кубик 1 (d6)"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Кубик 2 (d6)"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Далі · підсумок" }));
    fireEvent.click(screen.getByRole("button", { name: /Застосувати/ }));

    await waitFor(() => expect(castSpell).toHaveBeenCalledWith(expect.objectContaining({ spellId: "ray", targetIds: ["gob"], hitRoll: 15, damageRolls: [4, 5] })));
  });

  it("гортання на I коло показує його заклинання", async () => {
    const { wrapper, caster } = fakeScene({ knownSpells: ["ray", "bolt"], slots: { "1": { max: 3, current: 3 } } });

    render(<Harness caster={caster} />, { wrapper });

    fireEvent.click(await screen.findByRole("button", { name: /^I коло/ }));

    expect(screen.getByText("Крижаний спис")).toBeTruthy();
  });

  it("гравець бере відомі заклинання героя за id, а не всю бібліотеку", async () => {
    const { wrapper, caster } = fakeScene({ knownSpells: ["bolt"], slots: { "1": { max: 3, current: 3 } } });

    render(<Harness caster={caster} />, { wrapper });

    expect(await screen.findByText("Крижаний спис")).toBeTruthy();
    expect(useSpellsByIds).toHaveBeenLastCalledWith(expect.any(String), ["bolt"], { enabled: true });
    expect(useSpells).toHaveBeenLastCalledWith(expect.any(String), { enabled: false });
  });
});
