// @vitest-environment happy-dom
import { useEffect } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));

const lib = vi.hoisted(() => ({
  spells: [
    { id: "ray", name: "Палаючий промінь", level: 2, dice: 2, cost: "action", targeting: { kind: "enemy" }, resolution: { kind: "auto" } },
    { id: "bolt", name: "Крижаний спис", level: 1, dice: 3, cost: "action", targeting: { kind: "enemy" }, resolution: { kind: "auto" } },
    { id: "ball", name: "Вогняна куля", level: 2, dice: 4, cost: "action", targeting: { kind: "area", side: "enemy", maxTargets: 2 }, resolution: { kind: "save", ability: "dexterity", onSuccess: "half" }, spellGroup: { id: "chaos", name: "Хаос" } },
    { id: "light", name: "Слово світла", level: 2, dice: 2, cost: "action", targeting: { kind: "allEnemies" }, resolution: { kind: "auto" } },
    { id: "rebirth", name: "Відродження лісу", level: 2, dice: 0, cost: "action", targeting: { kind: "allAlliesDead" }, resolution: { kind: "auto" } },
    { id: "meteor", name: "Метеор", level: 2, dice: 1, cost: "action", targeting: { kind: "template", shape: "circle", size: 5, side: "enemy", maxTargets: 4, range: 30 }, resolution: { kind: "save", ability: "dexterity", onSuccess: "half" } },
    { id: "dart", name: "Дротик", level: 2, dice: 1, cost: "action", targeting: { kind: "enemy", range: 5 }, resolution: { kind: "auto" } },
    { id: "revive", name: "Воскресіння", level: 2, dice: 0, cost: "action", targeting: { kind: "allyDead" }, resolution: { kind: "auto" } },
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
import { useSpells, useSpellsByIds } from "@/lib/hooks/spells";
import type { MapAim } from "@/lib/utils/battle/grid";

const asHero = <T extends NonNullable<Parameters<typeof useSpellBook>[0]>>(p: T): T => ({ ...p, basicInfo: { ...p.basicInfo, sourceType: "character" as const } });

function Harness({ caster }: { caster: Parameters<typeof useSpellBook>[0] }) {
  const book = useSpellBook(caster && asHero(caster), {});

  useEffect(() => book.actions.open(2), []); // eslint-disable-line react-hooks/exhaustive-deps

  return <SpellBook book={book} />;
}

describe("SpellBook", () => {
  afterEach(cleanup);

  it("стрічки кіл зі слотами; сторінка кола; спел → цілі → кидки → підсумок → застосувати", async () => {
    const { wrapper, caster, castSpell } = fakeScene({ knownSpells: ["ray", "bolt", "ball", "light", "revive", "rebirth"], slots: { "1": { max: 3, current: 3 }, "2": { max: 3, current: 1 } } });

    render(<Harness caster={caster} />, { wrapper });

    expect(await screen.findByRole("button", { name: /II коло, слотів 1/ })).toBeTruthy();
    expect(screen.getByText("Палаючий промінь")).toBeTruthy();
    expect(screen.queryByText("Крижаний спис")).toBeNull();

    fireEvent.click(screen.getByText("Палаючий промінь"));
    expect(screen.getAllByText("2к6").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /Обрати цілі/ }));
    fireEvent.click(screen.getByRole("button", { name: /Гоблін/ }));
    fireEvent.click(screen.getByRole("button", { name: "Далі · кидки" }));
    fireEvent.change(screen.getByLabelText("Кубик 1 (d6)"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Кубик 2 (d6)"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Далі · підсумок" }));
    fireEvent.click(screen.getByRole("button", { name: /Застосувати/ }));

    await waitFor(() => expect(castSpell).toHaveBeenCalledWith(expect.objectContaining({ spellId: "ray", targetIds: ["gob"], diceRolls: [4, 5] })));
  });

  it("закладки шкіл фільтрують сторінку кола; «Усі» групує за школами", async () => {
    const { wrapper, caster } = fakeScene({ knownSpells: ["ray", "ball"], slots: { "2": { max: 1, current: 1 } } });

    render(<Harness caster={caster} />, { wrapper });

    expect(await screen.findByRole("button", { name: /Хаос/ })).toBeTruthy();
    expect(screen.getByText("Палаючий промінь")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Хаос/ }));

    expect(screen.getByText("Вогняна куля")).toBeTruthy();
    expect(screen.queryByText("Палаючий промінь")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Усі" }));

    expect(screen.getByText("Палаючий промінь")).toBeTruthy();
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

    fireEvent.click(await screen.findByRole("button", { name: /^I коло/ }));

    expect(await screen.findByText("Крижаний спис")).toBeTruthy();
    expect(useSpellsByIds).toHaveBeenLastCalledWith(expect.any(String), ["bolt"], { enabled: true });
    expect(useSpells).toHaveBeenLastCalledWith(expect.any(String), { enabled: false });
  });

  it("герой: формула «6к10» і слоти кубиків за майстерністю та рівнем", async () => {
    const { wrapper, caster } = fakeScene({ knownSpells: ["ball"], slots: { "2": { max: 3, current: 3 } } });

    const hero = { ...caster, abilities: { ...caster.abilities, level: 6 }, battleData: { ...caster.battleData, schoolMastery: { chaos: "expert" as const } } };

    render(<Harness caster={hero} />, { wrapper });

    fireEvent.click(await screen.findByText("Вогняна куля"));
    expect(screen.getAllByText("6к10").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /Обрати цілі/ }));
    fireEvent.click(screen.getByRole("button", { name: /Гоблін/ }));
    fireEvent.click(screen.getByRole("button", { name: "Далі · кидки" }));

    expect(screen.getByLabelText("Кубик 6 (d10)")).toBeTruthy();
    expect(screen.queryByLabelText("Кубик 7 (d10)")).toBeNull();
    expect(screen.queryByLabelText("Рятівний кидок: Гоблін")).toBeNull();
  });

  it("DM вводить рятівні кидки за всі цілі", async () => {
    const { wrapper, caster } = fakeScene({ knownSpells: ["ball"], slots: { "2": { max: 3, current: 3 } }, isDM: true });

    render(<Harness caster={caster} />, { wrapper });

    fireEvent.click(await screen.findByText("Вогняна куля"));
    fireEvent.click(screen.getByRole("button", { name: /Обрати цілі/ }));
    fireEvent.click(screen.getByRole("button", { name: /Гоблін/ }));
    fireEvent.click(screen.getByRole("button", { name: "Далі · кидки" }));

    expect(screen.getByLabelText("Рятівний кидок: Гоблін")).toBeTruthy();
  });

  it("автоціль (усі вороги): кроку вибору цілей немає, одразу кидки", async () => {
    const { wrapper, caster } = fakeScene({ knownSpells: ["light"], slots: { "2": { max: 3, current: 3 } } });

    render(<Harness caster={caster} />, { wrapper });

    fireEvent.click(await screen.findByText("Слово світла"));
    fireEvent.click(screen.getByRole("button", { name: "Далі" }));

    expect(screen.getByLabelText("Кубик 2 (d6)")).toBeTruthy();
    expect(screen.queryByLabelText(/Рятівний кидок/)).toBeNull();
  });

  it("полеглий союзник: у цілях лише полеглі", async () => {
    const { wrapper, caster } = fakeScene({ knownSpells: ["revive"], slots: { "2": { max: 3, current: 3 } } });

    render(<Harness caster={caster} />, { wrapper });

    fireEvent.click(await screen.findByText("Воскресіння"));
    fireEvent.click(screen.getByRole("button", { name: /Обрати цілі/ }));

    expect(screen.queryByRole("button", { name: /Гоблін/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Годрік/ })).toBeNull();
  });

  it("область: не більше maxTargets цілей", async () => {
    const { wrapper, caster } = fakeScene({ knownSpells: ["ball"], slots: { "2": { max: 3, current: 3 } } });

    render(<Harness caster={caster} />, { wrapper });

    fireEvent.click(await screen.findByText("Вогняна куля"));
    fireEvent.click(screen.getByRole("button", { name: /Обрати цілі/ }));

    expect(screen.getByRole("button", { name: /Гоблін/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Годрік/ })).toBeNull();
  });

  it("усі полеглі союзники: автоціль, кроку вибору цілей немає", async () => {
    const { wrapper, caster } = fakeScene({ knownSpells: ["rebirth"], slots: { "2": { max: 3, current: 3 } } });

    render(<Harness caster={caster} />, { wrapper });

    fireEvent.click(await screen.findByText("Відродження лісу"));
    expect(screen.getByRole("button", { name: "Далі" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Обрати цілі/ })).toBeNull();
  });

  it("юніт з універсальним слотом: книга відкривається на колі з його закляттям, і його можна обрати", async () => {
    const { wrapper, caster } = fakeScene({ knownSpells: ["ray"], slots: { universal: { max: 3, current: 3 } } });

    function UnitHarness() {
      const book = useSpellBook(caster, {});

      useEffect(() => book.actions.open(), []); // eslint-disable-line react-hooks/exhaustive-deps

      return <SpellBook book={book} />;
    }

    render(<UnitHarness />, { wrapper });

    fireEvent.click(await screen.findByText("Палаючий промінь"));

    expect((screen.getByRole("button", { name: /Обрати цілі/ }) as HTMLButtonElement).disabled).toBe(false);
  });

  describe("на карті", () => {
    const onMap = (knownSpells: string[], isDM = false) => {
      const scene = fakeScene({ knownSpells, isDM, slots: { "2": { max: 3, current: 3 } }, map: { cols: 10, rows: 6, background: null, opacity: 0.3 } });

      scene.me.battleData.position = { x: 0, y: 0 };
      scene.gob.battleData.position = { x: 4, y: 0 };
      scene.ally.battleData.position = { x: 4, y: 1 };

      return scene;
    };

    it("одиночне: ціль поза дальністю вимкнена з підписом", async () => {
      const { wrapper, caster } = onMap(["dart"]);

      render(<Harness caster={caster} />, { wrapper });

      fireEvent.click(await screen.findByText("Дротик"));
      fireEvent.click(screen.getByRole("button", { name: /Обрати цілі/ }));

      const gob = screen.getByRole("button", { name: /Гоблін/ }) as HTMLButtonElement;

      expect(gob.disabled).toBe(true);
      expect(gob.textContent).toContain("Поза дальністю");
    });

    it("шаблон: наведення на карті, зачеплені з позначкою союзника, підтвердження → кидки, каст з targetCell", async () => {
      const { wrapper, caster, value, castSpell } = onMap(["meteor"], true);

      render(<Harness caster={caster} />, { wrapper });

      fireEvent.click(await screen.findByText("Метеор"));
      fireEvent.click(screen.getByRole("button", { name: /Обрати цілі/ }));

      expect(screen.getByText("Оберіть точку на карті")).toBeTruthy();
      expect((screen.getByRole("button", { name: "Підтвердити" }) as HTMLButtonElement).disabled).toBe(true);

      const aim = vi.mocked(value.intents.setMapAim).mock.calls.at(-1)?.[0] as MapAim;

      expect(aim).toMatchObject({ template: { shape: "circle", size: 5 }, casterId: "me", range: 30 });

      act(() => aim.onAim({ x: 4, y: 0 }));

      expect(screen.getByText("Гоблін")).toBeTruthy();
      expect(screen.getByText("⚠ союзник")).toBeTruthy();
      expect(vi.mocked(value.intents.setMapAim).mock.calls.at(-1)?.[0]).toMatchObject({ aim: { x: 4, y: 0 } });

      fireEvent.click(screen.getByRole("button", { name: "Підтвердити" }));

      expect(vi.mocked(value.intents.setMapAim).mock.calls.at(-1)?.[0]).toBeNull();
      expect(screen.getByLabelText("Рятівний кидок: Годрік")).toBeTruthy();

      fireEvent.change(screen.getByLabelText("Кубик 1 (d6)"), { target: { value: "4" } });
      fireEvent.click(screen.getByRole("button", { name: "Далі · підсумок" }));
      fireEvent.click(screen.getByRole("button", { name: /Застосувати/ }));

      await waitFor(() => expect(castSpell).toHaveBeenCalledWith(expect.objectContaining({ spellId: "meteor", targetCell: { x: 4, y: 0 } })));
    });

    it("шаблон: список зачеплених рахується від точки наведення на кожному рендері — рух після кліку його оновлює", async () => {
      const { wrapper, caster, value, me, gob, ally } = onMap(["meteor"], true);

      const { rerender } = render(<Harness caster={caster} />, { wrapper });

      fireEvent.click(await screen.findByText("Метеор"));
      fireEvent.click(screen.getByRole("button", { name: /Обрати цілі/ }));

      const aim = vi.mocked(value.intents.setMapAim).mock.calls.at(-1)?.[0] as MapAim;

      act(() => aim.onAim({ x: 4, y: 0 }));

      expect(screen.getByText("Гоблін")).toBeTruthy();

      value.battle = { ...value.battle, initiativeOrder: [me, { ...gob, battleData: { ...gob.battleData, position: { x: 9, y: 5 } } }, ally] };
      rerender(<Harness caster={caster} />);

      expect(screen.queryByText("Гоблін")).toBeNull();
      expect(screen.getByText("Годрік")).toBeTruthy();
    });

    it("шаблон без карти — звичайний вибір цілей", async () => {
      const { wrapper, caster } = fakeScene({ knownSpells: ["meteor"], slots: { "2": { max: 3, current: 3 } } });

      render(<Harness caster={caster} />, { wrapper });

      fireEvent.click(await screen.findByText("Метеор"));
      fireEvent.click(screen.getByRole("button", { name: /Обрати цілі/ }));

      expect(screen.getByRole("button", { name: /Гоблін/ })).toBeTruthy();
      expect(screen.queryByText("Оберіть точку на карті")).toBeNull();
    });

    it("Esc під час наведення закриває майстер", async () => {
      const { wrapper, caster, value } = onMap(["meteor"]);

      render(<Harness caster={caster} />, { wrapper });

      fireEvent.click(await screen.findByText("Метеор"));
      fireEvent.click(screen.getByRole("button", { name: /Обрати цілі/ }));
      act(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      });

      expect(screen.queryByText("Оберіть точку на карті")).toBeNull();
      expect(vi.mocked(value.intents.setMapAim).mock.calls.at(-1)?.[0]).toBeNull();
    });
  });
});
