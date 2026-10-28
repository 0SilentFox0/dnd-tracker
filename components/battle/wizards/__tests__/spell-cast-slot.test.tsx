// @vitest-environment happy-dom
import { useEffect } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));

const lib = vi.hoisted(() => ({
  spells: [
    { id: "bolt", name: "Крижаний спис", level: 1, dice: 3, upcastDice: 1, cost: "action", targeting: { kind: "enemy" }, resolution: { kind: "auto" } },
    { id: "ray", name: "Промінь слабкості", level: 1, dice: 1, cost: "action", targeting: { kind: "enemy" }, resolution: { kind: "attack" } },
    { id: "mark", name: "Знак мисливця", level: 1, dice: 0, upcastTargets: 1, cost: "action", targeting: { kind: "enemy" }, resolution: { kind: "auto" } },
  ],
}));

vi.mock("@/lib/hooks/spells", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/hooks/spells")>()),
  useSpells: vi.fn(() => ({ data: undefined })),
  useSpellsByIds: vi.fn((_campaignId: string, ids: string[]) => ({ data: lib.spells.filter((s) => ids.includes(s.id)) })),
}));

import { SpellBook } from "@/components/battle/wizards/SpellBook";
import { useSpellBook } from "@/lib/hooks/battle";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";
import { slotOptions } from "@/lib/utils/battle/flows";

type Caster = NonNullable<Parameters<typeof useSpellBook>[0]>;

const hero = (p: Caster, model?: "5e"): Caster => ({ ...p, basicInfo: { ...p.basicInfo, sourceType: "character" as const }, abilities: { ...p.abilities, ...(model && { damageModel: model }) } });

const SLOTS = { "1": { max: 2, current: 2 }, "2": { max: 1, current: 0 }, "3": { max: 1, current: 1 }, pact: { max: 1, current: 1, level: 3 } };

function Harness({ caster, model }: { caster: Caster; model?: "5e" }) {
  const book = useSpellBook(hero(caster, model), {});

  useEffect(() => book.actions.open(1), []); // eslint-disable-line react-hooks/exhaustive-deps

  return <SpellBook book={book} />;
}

describe("slotOptions", () => {
  it("лише кола не нижче заклинання з непорожнім слотом і пакт не нижче", () => {
    const { caster } = fakeScene({ slots: SLOTS });

    const keys = (level: number, p = hero(caster, "5e")) => slotOptions(p, level).map((o) => `${o.key}:${o.label}`);

    expect(keys(1)).toEqual(["1:Коло 1", "3:Коло 3", "pact:Пакт · коло 3"]);
    expect(keys(2)).toEqual(["3:Коло 3", "pact:Пакт · коло 3"]);
    expect(keys(4)).toEqual([]);
    expect(keys(0)).toEqual([]);
    expect(keys(1, hero(caster))).toEqual([]);
  });
});

describe("слот у вікні касту", () => {
  afterEach(cleanup);

  it("герой 5e: селект слота, вибір «Коло 3» дає 5 кубиків і slotKey у запиті", async () => {
    const { wrapper, caster, castSpell } = fakeScene({ knownSpells: ["bolt"], slots: SLOTS });

    render(<Harness caster={caster} model="5e" />, { wrapper });

    fireEvent.click(await screen.findByText("Крижаний спис"));
    fireEvent.click(screen.getByRole("button", { name: /Обрати цілі/ }));

    const select = screen.getByLabelText("Слот") as HTMLSelectElement;

    expect([...select.options].map((o) => o.text)).toEqual(["Коло 1", "Коло 3", "Пакт · коло 3"]);

    fireEvent.change(select, { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: /Гоблін/ }));
    fireEvent.click(screen.getByRole("button", { name: "Далі · кидки" }));

    expect(screen.getByLabelText("Кубик 5 (d6)")).toBeTruthy();
    expect(screen.queryByLabelText("Кубик 6 (d6)")).toBeNull();

    for (let i = 1; i <= 5; i += 1) fireEvent.change(screen.getByLabelText(`Кубик ${i} (d6)`), { target: { value: "2" } });

    fireEvent.click(screen.getByRole("button", { name: "Далі · підсумок" }));
    fireEvent.click(screen.getByRole("button", { name: /Застосувати/ }));

    await waitFor(() => expect(castSpell).toHaveBeenCalledWith(expect.objectContaining({ spellId: "bolt", slotKey: "3", diceRolls: [2, 2, 2, 2, 2] })));
  });

  it("герой HOMM не бачить селекта й не шле slotKey", async () => {
    const { wrapper, caster, castSpell } = fakeScene({ knownSpells: ["bolt"], slots: SLOTS });

    render(<Harness caster={caster} />, { wrapper });

    fireEvent.click(await screen.findByText("Крижаний спис"));
    expect(screen.queryByLabelText("Слот")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Обрати цілі/ }));
    expect(screen.queryByLabelText("Слот")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Гоблін/ }));
    fireEvent.click(screen.getByRole("button", { name: "Далі · кидки" }));

    for (let i = 1; i <= 3; i += 1) fireEvent.change(screen.getByLabelText(`Кубик ${i} (d6)`), { target: { value: "1" } });

    fireEvent.click(screen.getByRole("button", { name: "Далі · підсумок" }));
    fireEvent.click(screen.getByRole("button", { name: /Застосувати/ }));

    await waitFor(() => expect(castSpell).toHaveBeenCalled());
    expect(castSpell.mock.calls[0][0]).not.toHaveProperty("slotKey");
  });

  it("атака заклинанням: d20 цілі йде в attackRolls", async () => {
    const { wrapper, caster, castSpell } = fakeScene({ knownSpells: ["ray"], slots: SLOTS });

    render(<Harness caster={caster} model="5e" />, { wrapper });

    fireEvent.click(await screen.findByText("Промінь слабкості"));
    fireEvent.click(screen.getByRole("button", { name: /Обрати цілі/ }));
    fireEvent.click(screen.getByRole("button", { name: /Гоблін/ }));
    fireEvent.click(screen.getByRole("button", { name: "Далі · кидки" }));
    fireEvent.change(screen.getByLabelText("Кидок атаки: Гоблін"), { target: { value: "17" } });
    fireEvent.change(screen.getByLabelText("Кубик 1 (d6)"), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Далі · підсумок" }));
    fireEvent.click(screen.getByRole("button", { name: /Застосувати/ }));

    await waitFor(() => expect(castSpell).toHaveBeenCalledWith(expect.objectContaining({ spellId: "ray", attackRolls: [{ participantId: "gob", roll: 17 }] })));
  });
});
