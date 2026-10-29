// @vitest-environment happy-dom
import { useEffect } from "react";
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));

vi.mock("next-intl", async () => (await import("./uk-intl")).catalogIntl());

const lib = vi.hoisted(() => ({
  spells: [
    { id: "ritual", name: "Тривале заклинання", level: 2, dice: 0, cost: "long", casting: { rounds: 10, text: "1 хвилина" }, targeting: { kind: "self" }, resolution: { kind: "auto" } },
    { id: "ray", name: "Палаючий промінь", level: 2, dice: 2, cost: "action", targeting: { kind: "enemy" }, resolution: { kind: "auto" } },
    { id: "bolt", name: "Крижаний спис", level: 1, dice: 3, cost: "action", targeting: { kind: "enemy" }, resolution: { kind: "auto" } },
    { id: "ball", name: "Вогняна куля", level: 2, dice: 4, cost: "action", targeting: { kind: "area", side: "enemy", maxTargets: 2 }, resolution: { kind: "save", ability: "dexterity", onSuccess: "half" }, spellGroup: { id: "chaos", name: "Хаос" } },
    { id: "light", name: "Слово світла", level: 2, dice: 2, cost: "action", targeting: { kind: "allEnemies" }, resolution: { kind: "auto" } },
    { id: "rebirth", name: "Відродження лісу", level: 2, dice: 0, cost: "action", targeting: { kind: "allAlliesDead" }, resolution: { kind: "auto" } },
    { id: "meteor", name: "Метеор", level: 2, dice: 1, cost: "action", targeting: { kind: "template", shape: "circle", size: 5, side: "enemy", maxTargets: 4, range: 30 }, resolution: { kind: "save", ability: "dexterity", onSuccess: "half" } },
    { id: "dart", name: "Дротик", level: 2, dice: 1, cost: "action", targeting: { kind: "enemy", range: 5 }, resolution: { kind: "auto" } },
    { id: "chain", name: "Ланцюгова блискавка", level: 2, dice: 1, cost: "action", targeting: { kind: "area", side: "enemy", maxTargets: 4, range: 60, chain: true }, resolution: { kind: "auto" } },
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
import { render } from "@/lib/i18n/test/render-uk";
import { resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import type { MapAim, MapPick } from "@/lib/utils/battle/grid";
import type { ResolvedAbility } from "@/types/abilities";

vi.unmock("next-intl");

const asHero = <T extends NonNullable<Parameters<typeof useSpellBook>[0]>>(p: T): T => ({ ...p, basicInfo: { ...p.basicInfo, sourceType: "character" as const } });

function Harness({ caster }: { caster: Parameters<typeof useSpellBook>[0] }) {
  const book = useSpellBook(caster && asHero(caster), {});

  useEffect(() => book.actions.open(2), []); // eslint-disable-line react-hooks/exhaustive-deps

  return <SpellBook book={book} />;
}

describe("SpellBook", () => {
  afterEach(cleanup);

  it("keeps an ordinary slot source beside an item-only grant", async () => {
    const { wrapper, caster } = fakeScene({ knownSpells: ["ray"], slots: { "2": { max: 1, current: 1 } } });

    caster.abilities.damageModel = "5e";
    caster.spellcasting.slotSpells = ["ray"];
    caster.spellcasting.grants = [{ spellId: "ray", key: "wand", label: "Wand", cost: 0 }];
    render(<Harness caster={caster} />, { wrapper });
    fireEvent.click(await screen.findByText("Палаючий промінь"));
    expect(screen.getByRole("option", { name: /Слот/ })).toBeTruthy();
    expect(screen.getByRole("option", { name: /Wand/ })).toBeTruthy();
  });

  it("starts long casting without asking for targets or dice", async () => {
    const { wrapper, caster, castSpell } = fakeScene({ knownSpells: ["ritual"], slots: { "2": { max: 1, current: 1 } } });

    render(<Harness caster={caster} />, { wrapper });
    fireEvent.click(await screen.findByText("Тривале заклинання"));
    expect(screen.getByText(/10 раундів/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Почати накладання" }));
    await waitFor(() => expect(castSpell).toHaveBeenCalledWith(expect.objectContaining({ spellId: "ritual", targetIds: [], diceRolls: [] })));
  });

  it("стрічки кіл зі слотами; сторінка кола; спел → цілі → кидки → підсумок → застосувати", async () => {
    const { wrapper, caster, castSpell } = fakeScene({ knownSpells: ["ray", "bolt", "ball", "light", "revive", "rebirth"], slots: { "1": { max: 3, current: 3 }, "2": { max: 3, current: 1 } } });

    render(<Harness caster={caster} />, { wrapper });

    expect(await screen.findByRole("button", { name: /spells.book.bookmark.*"level":"II".*"slots":1/ })).toBeTruthy();
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

  it("вибирає слот або конкретне джерело гранту й блокує вичерпаний грант", async () => {
    const { wrapper, caster, castSpell } = fakeScene({ knownSpells: ["ray"], slots: { "2": { max: 1, current: 1 } } });

    const first = "pool:grant:race:elf:ray";

    const second = "pool:grant:feat:mi:ray";

    const hero = { ...caster, abilities: { ...caster.abilities, damageModel: "5e" as const }, spellcasting: { ...caster.spellcasting, grants: [{ spellId: "ray", key: "race:elf:ray", label: "Elf", via: "slotOrGrant" as const, pool: first, cost: 1 }, { spellId: "ray", key: "feat:mi:ray", label: "Magic Initiate", via: "slotOrGrant" as const, pool: second, cost: 1, castLevel: 2 }] }, battleData: { ...caster.battleData, pools: { [first]: { label: "Elf", max: 1, rest: "long" as const }, [second]: { label: "Magic Initiate", max: 1, rest: "long" as const } }, abilityUsage: { [first]: { battle: 1, round: 0, turn: 0 } } } };

    render(<Harness caster={hero} />, { wrapper });

    fireEvent.click(await screen.findByText("Палаючий промінь"));

    const source = screen.getByLabelText("Джерело каста") as HTMLSelectElement;

    expect([...source.options].map((o) => [o.textContent, o.disabled])).toEqual([["Оберіть джерело", true], ["Слот Коло 2", false], ["Elf · 0/1", true], ["Magic Initiate · 1/1", false]]);
    fireEvent.change(source, { target: { value: `grant:feat:mi:ray` } });
    fireEvent.click(screen.getByRole("button", { name: /Обрати цілі/ }));
    fireEvent.click(screen.getByRole("button", { name: /Гоблін/ }));
    fireEvent.click(screen.getByRole("button", { name: "Далі · кидки" }));
    fireEvent.change(screen.getByLabelText("Кубик 1 (d6)"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Кубик 2 (d6)"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Далі · підсумок" }));
    fireEvent.click(screen.getByRole("button", { name: /Застосувати/ }));

    await waitFor(() => expect(castSpell).toHaveBeenCalledWith(expect.objectContaining({ spellId: "ray", grantKey: "feat:mi:ray", targetIds: ["gob"] })));
  });

  it("дозволяє обрати слот замість одного безкоштовного гранту", async () => {
    const { wrapper, caster, castSpell } = fakeScene({ knownSpells: ["ray"], slots: { "2": { max: 1, current: 1 } } });

    const hero = { ...caster, abilities: { ...caster.abilities, damageModel: "5e" as const }, spellcasting: { ...caster.spellcasting, grants: [{ spellId: "ray", key: "feat:mi:ray", label: "Magic Initiate", via: "slotOrGrant" as const, pool: "pool:grant:mi", cost: 1, castLevel: 2 }] }, battleData: { ...caster.battleData, pools: { "pool:grant:mi": { label: "Magic Initiate", max: 1, rest: "long" as const } } } };

    render(<Harness caster={hero} />, { wrapper });
    fireEvent.click(await screen.findByText("Палаючий промінь"));
    fireEvent.change(screen.getByLabelText("Джерело каста"), { target: { value: "slot:2" } });
    fireEvent.click(screen.getByRole("button", { name: /Обрати цілі/ }));
    fireEvent.click(screen.getByRole("button", { name: /Гоблін/ }));
    fireEvent.click(screen.getByRole("button", { name: "Далі · кидки" }));
    fireEvent.change(screen.getByLabelText("Кубик 1 (d6)"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Кубик 2 (d6)"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Далі · підсумок" }));
    fireEvent.click(screen.getByRole("button", { name: /Застосувати/ }));

    await waitFor(() => expect(castSpell).toHaveBeenCalledWith(expect.objectContaining({ spellId: "ray", slotKey: "2" })));
    expect(castSpell.mock.calls[0][0]).not.toHaveProperty("grantKey");
  });

  it("обирає рівень гранту предмета для додаткових зарядів", async () => {
    const { wrapper, caster, castSpell } = fakeScene({ knownSpells: ["ray"] });

    const pool = "pool:item:ring";

    const hero = { ...caster, abilities: { ...caster.abilities, damageModel: "5e" as const }, spellcasting: { ...caster.spellcasting, grants: [{ spellId: "ray", key: "item:ring:spell:ray", label: "Кільце", pool, cost: 1, castLevel: 2, upcast: { maxLevel: 3, extraCost: 1 } }] }, battleData: { ...caster.battleData, pools: { [pool]: { label: "Кільце", max: 3, rest: "long" as const } } } };

    render(<Harness caster={hero} />, { wrapper });
    fireEvent.click(await screen.findByText("Палаючий промінь"));
    fireEvent.change(screen.getByLabelText("Рівень каста"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: /Обрати цілі/ }));
    fireEvent.click(screen.getByRole("button", { name: /Гоблін/ }));
    fireEvent.click(screen.getByRole("button", { name: "Далі · кидки" }));
    fireEvent.change(screen.getByLabelText("Кубик 1 (d6)"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Кубик 2 (d6)"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Далі · підсумок" }));
    fireEvent.click(screen.getByRole("button", { name: /Застосувати/ }));
    await waitFor(() => expect(castSpell).toHaveBeenCalledWith(expect.objectContaining({ grantKey: "item:ring:spell:ray", castLevel: 3 })));
  });

  it("закладки шкіл фільтрують сторінку кола; «Усі» групує за школами", async () => {
    const { wrapper, caster } = fakeScene({ knownSpells: ["ray", "ball"], slots: { "2": { max: 1, current: 1 } } });

    render(<Harness caster={caster} />, { wrapper });

    expect(await screen.findByRole("button", { name: /Хаос/ })).toBeTruthy();
    expect(screen.getByText("Палаючий промінь")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Хаос/ }));

    expect(screen.getByText("Вогняна куля")).toBeTruthy();
    expect(screen.queryByText("Палаючий промінь")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "spells.book.allSchools" }));

    expect(screen.getByText("Палаючий промінь")).toBeTruthy();
  });

  it("гортання на I коло показує його заклинання", async () => {
    const { wrapper, caster } = fakeScene({ knownSpells: ["ray", "bolt"], slots: { "1": { max: 3, current: 3 } } });

    render(<Harness caster={caster} />, { wrapper });

    fireEvent.click(await screen.findByRole("button", { name: /^spells.book.bookmark.*"level":"I"/ }));

    expect(screen.getByText("Крижаний спис")).toBeTruthy();
  });

  it("гравець бере відомі заклинання героя за id, а не всю бібліотеку", async () => {
    const { wrapper, caster } = fakeScene({ knownSpells: ["bolt"], slots: { "1": { max: 3, current: 3 } } });

    render(<Harness caster={caster} />, { wrapper });

    fireEvent.click(await screen.findByRole("button", { name: /^spells.book.bookmark.*"level":"I"/ }));

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
    const onMap = (knownSpells: string[], isDM = false, abilities?: ResolvedAbility[]) => {
      const scene = fakeScene({ knownSpells, isDM, abilities, slots: { "2": { max: 3, current: 3 } }, map: { cols: 10, rows: 6, background: null, opacity: 0.3 } });

      scene.me.battleData.position = { x: 0, y: 0 };
      scene.gob.battleData.position = { x: 4, y: 0 };
      scene.ally.battleData.position = { x: 4, y: 1 };

      return scene;
    };

    const lastPick = (value: ReturnType<typeof onMap>["value"]) => vi.mocked(value.intents.setMapPick).mock.calls.at(-1)?.[0] as MapPick | null;

    it("одиночне: книга закривається, ціль обирається на карті; поза дальністю — недосяжна", async () => {
      const { wrapper, caster, value } = onMap(["dart"]);

      render(<Harness caster={caster} />, { wrapper });

      fireEvent.click(await screen.findByText("Дротик"));
      fireEvent.click(screen.getByRole("button", { name: /Обрати цілі/ }));

      expect(screen.queryByRole("button", { name: /spells.book.bookmark.*"level":"II"/ })).toBeNull();
      expect(screen.getByRole("region", { name: "Наведення заклинання" })).toBeTruthy();
      expect(screen.getByText("Оберіть ціль на карті")).toBeTruthy();
      expect(screen.queryByRole("button", { name: /Гоблін/ })).toBeNull();
      expect(lastPick(value)).toMatchObject({ casterId: "me", targets: [{ id: "gob", reachable: false }], selectedIds: [] });
    });

    it("одиночне: клік по токену одразу веде до вікна кидків, каст з обраною ціллю, карта звільняється", async () => {
      const { wrapper, caster, value, castSpell } = onMap(["ray"]);

      render(<Harness caster={caster} />, { wrapper });

      fireEvent.click(await screen.findByText("Палаючий промінь"));
      fireEvent.click(screen.getByRole("button", { name: /Обрати цілі/ }));

      expect(lastPick(value)).toMatchObject({ targets: [{ id: "gob", reachable: true }] });

      act(() => lastPick(value)?.onPick("gob"));

      expect(screen.queryByRole("region", { name: "Наведення заклинання" })).toBeNull();
      expect(lastPick(value)).toBeNull();

      fireEvent.change(screen.getByLabelText("Кубик 1 (d6)"), { target: { value: "4" } });
      fireEvent.change(screen.getByLabelText("Кубик 2 (d6)"), { target: { value: "5" } });
      fireEvent.click(screen.getByRole("button", { name: "Далі · підсумок" }));
      fireEvent.click(screen.getByRole("button", { name: /Застосувати/ }));

      await waitFor(() => expect(castSpell).toHaveBeenCalledWith(expect.objectContaining({ spellId: "ray", targetIds: ["gob"], diceRolls: [4, 5] })));
    });

    it("кілька цілей: клік перемикає, «Далі · кидки» підтверджує, ліміт maxTargets у підказці", async () => {
      const { wrapper, caster, value, castSpell } = onMap(["ball"], true);

      render(<Harness caster={caster} />, { wrapper });

      fireEvent.click(await screen.findByText("Вогняна куля"));
      fireEvent.click(screen.getByRole("button", { name: /Обрати цілі/ }));

      expect(screen.getByText("Оберіть цілі на карті · 0/2")).toBeTruthy();
      expect((screen.getByRole("button", { name: "Далі · кидки" }) as HTMLButtonElement).disabled).toBe(true);

      act(() => lastPick(value)?.onPick("gob"));

      expect(screen.getByText("Оберіть цілі на карті · 1/2")).toBeTruthy();
      expect(screen.getByRole("list", { name: "Обрані цілі" }).textContent).toContain("Гоблін");
      expect(lastPick(value)?.selectedIds).toEqual(["gob"]);

      fireEvent.click(screen.getByRole("button", { name: "Далі · кидки" }));
      fireEvent.change(screen.getByLabelText("Рятівний кидок: Гоблін"), { target: { value: "12" } });
      fireEvent.click(screen.getByRole("button", { name: "Авто-кидок" }));
      fireEvent.click(screen.getByRole("button", { name: "Далі · підсумок" }));
      fireEvent.click(screen.getByRole("button", { name: /Застосувати/ }));

      await waitFor(() => expect(castSpell).toHaveBeenCalledWith(expect.objectContaining({ spellId: "ball", targetIds: ["gob"], saveRolls: [{ participantId: "gob", roll: 12 }] })));
    });

    it("воскресіння: полеглого союзника немає на карті — ціль обирається зі списку у вікні", async () => {
      const { wrapper, caster, value, castSpell, ally } = onMap(["revive"]);

      ally.combatStats.status = "dead";
      ally.combatStats.currentHp = 0;

      render(<Harness caster={caster} />, { wrapper });

      fireEvent.click(await screen.findByText("Воскресіння"));
      fireEvent.click(screen.getByRole("button", { name: /Обрати цілі/ }));

      expect(screen.queryByRole("region", { name: "Наведення заклинання" })).toBeNull();
      expect(lastPick(value) ?? null).toBeNull();

      fireEvent.click(screen.getByRole("button", { name: /Годрік/ }));
      fireEvent.click(screen.getByRole("button", { name: "Далі · кидки" }));
      fireEvent.click(screen.getByRole("button", { name: /Застосувати/ }));

      await waitFor(() => expect(castSpell).toHaveBeenCalledWith(expect.objectContaining({ spellId: "revive", targetIds: ["ally"] })));
    });

    it("недосяжну ціль клік не обирає", async () => {
      const { wrapper, caster, value } = onMap(["dart"]);

      render(<Harness caster={caster} />, { wrapper });

      fireEvent.click(await screen.findByText("Дротик"));
      fireEvent.click(screen.getByRole("button", { name: /Обрати цілі/ }));
      act(() => lastPick(value)?.onPick("gob"));

      expect(screen.getByRole("region", { name: "Наведення заклинання" })).toBeTruthy();
    });

    it("«Назад» на кидках вертає до карти, «Назад» на карті — до книги; «Скасувати» чистить усе", async () => {
      const { wrapper, caster, value } = onMap(["ray"]);

      render(<Harness caster={caster} />, { wrapper });

      fireEvent.click(await screen.findByText("Палаючий промінь"));
      fireEvent.click(screen.getByRole("button", { name: /Обрати цілі/ }));
      act(() => lastPick(value)?.onPick("gob"));
      fireEvent.click(screen.getByRole("button", { name: "← Назад" }));

      expect(screen.getByRole("region", { name: "Наведення заклинання" })).toBeTruthy();
      expect(lastPick(value)).toMatchObject({ selectedIds: ["gob"] });

      fireEvent.click(screen.getByRole("button", { name: "← Назад" }));

      expect(screen.queryByRole("region", { name: "Наведення заклинання" })).toBeNull();
      expect(screen.getByRole("button", { name: /Обрати цілі/ })).toBeTruthy();

      fireEvent.click(screen.getByRole("button", { name: /Обрати цілі/ }));
      fireEvent.click(screen.getByRole("button", { name: "Скасувати" }));

      expect(screen.queryByRole("region", { name: "Наведення заклинання" })).toBeNull();
      expect(screen.queryByRole("button", { name: /Обрати цілі/ })).toBeNull();
      expect(lastPick(value)).toBeNull();
    });

    it("Esc під час вибору цілей закриває майстер і звільняє карту", async () => {
      const { wrapper, caster, value } = onMap(["ray"]);

      render(<Harness caster={caster} />, { wrapper });

      fireEvent.click(await screen.findByText("Палаючий промінь"));
      fireEvent.click(screen.getByRole("button", { name: /Обрати цілі/ }));
      act(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      });

      expect(screen.queryByRole("region", { name: "Наведення заклинання" })).toBeNull();
      expect(lastPick(value)).toBeNull();
    });

    it("шаблон: клік по точці з цілями одразу підтверджує → кидки, каст з targetCell; кнопки «Підтвердити» немає", async () => {
      const { wrapper, caster, value, castSpell } = onMap(["meteor"], true);

      render(<Harness caster={caster} />, { wrapper });

      fireEvent.click(await screen.findByText("Метеор"));
      fireEvent.click(screen.getByRole("button", { name: "Навести на карті" }));

      expect(screen.getByText("Оберіть точку на карті")).toBeTruthy();
      expect(screen.queryByRole("button", { name: "Підтвердити" })).toBeNull();
      expect(screen.getByRole("button", { name: "← Назад" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Скасувати" })).toBeTruthy();

      const aim = vi.mocked(value.intents.setMapAim).mock.calls.at(-1)?.[0] as MapAim;

      expect(aim).toMatchObject({ template: { shape: "circle", size: 5 }, casterId: "me", range: 30 });

      act(() => aim.onAim({ x: 4, y: 0 }));

      expect(screen.queryByText("Оберіть точку на карті")).toBeNull();
      expect(vi.mocked(value.intents.setMapAim).mock.calls.at(-1)?.[0]).toBeNull();
      expect(screen.getByLabelText("Рятівний кидок: Годрік")).toBeTruthy();

      fireEvent.change(screen.getByLabelText("Кубик 1 (d6)"), { target: { value: "4" } });
      fireEvent.click(screen.getByRole("button", { name: "Далі · підсумок" }));
      fireEvent.click(screen.getByRole("button", { name: /Застосувати/ }));

      await waitFor(() => expect(castSpell).toHaveBeenCalledWith(expect.objectContaining({ spellId: "meteor", targetCell: { x: 4, y: 0 } })));
    });

    it("шаблон: «Назад» із кидків вертає до наведення, нова точка замінює стару", async () => {
      const { wrapper, caster, value, castSpell } = onMap(["meteor"], true);

      render(<Harness caster={caster} />, { wrapper });

      fireEvent.click(await screen.findByText("Метеор"));
      fireEvent.click(screen.getByRole("button", { name: "Навести на карті" }));

      const aim = vi.mocked(value.intents.setMapAim).mock.calls.at(-1)?.[0] as MapAim;

      act(() => aim.onAim({ x: 1, y: 4 }));

      expect(screen.queryByText("Оберіть точку на карті")).toBeNull();

      fireEvent.click(screen.getByRole("button", { name: "← Назад" }));

      expect(screen.getByText("Оберіть точку на карті")).toBeTruthy();

      const again = vi.mocked(value.intents.setMapAim).mock.calls.at(-1)?.[0] as MapAim;

      act(() => again.onAim({ x: 4, y: 0 }));

      expect(screen.getByLabelText("Рятівний кидок: Годрік")).toBeTruthy();

      fireEvent.change(screen.getByLabelText("Кубик 1 (d6)"), { target: { value: "4" } });
      fireEvent.click(screen.getByRole("button", { name: "Далі · підсумок" }));
      fireEvent.click(screen.getByRole("button", { name: /Застосувати/ }));

      await waitFor(() => expect(castSpell).toHaveBeenCalledWith(expect.objectContaining({ targetCell: { x: 4, y: 0 } })));
    });

    it("шаблон: панель наведення показує живий список зачеплених під курсором", async () => {
      const { wrapper, caster, value } = onMap(["meteor"], true);

      render(<Harness caster={caster} />, { wrapper });

      fireEvent.click(await screen.findByText("Метеор"));
      fireEvent.click(screen.getByRole("button", { name: "Навести на карті" }));

      expect(screen.queryByRole("list", { name: "Зачеплені" })).toBeNull();

      const aim = vi.mocked(value.intents.setMapAim).mock.calls.at(-1)?.[0] as MapAim;

      act(() => aim.onHover?.({ x: 4, y: 0 }));

      const list = screen.getByRole("list", { name: "Зачеплені" });

      expect(list.textContent).toContain("Гоблін");
      expect(list.textContent).toContain("⚠ союзник");

      act(() => aim.onHover?.({ x: 1, y: 4 }));
      expect(screen.getByText("Нікого не зачеплено")).toBeTruthy();

      act(() => aim.onHover?.(null));
      expect(screen.queryByRole("list", { name: "Зачеплені" })).toBeNull();
    });

    it("шаблон: рятівні кидки й каст беруть живі цілі шаблону, а не ті, що були в момент кліку", async () => {
      const { wrapper, caster, value, castSpell, me, gob, ally } = onMap(["meteor"], true);

      const { rerender } = render(<Harness caster={caster} />, { wrapper });

      fireEvent.click(await screen.findByText("Метеор"));
      fireEvent.click(screen.getByRole("button", { name: "Навести на карті" }));

      act(() => (vi.mocked(value.intents.setMapAim).mock.calls.at(-1)?.[0] as MapAim).onAim({ x: 4, y: 0 }));

      value.battle = { ...value.battle, initiativeOrder: [me, { ...gob, battleData: { ...gob.battleData, position: { x: 9, y: 5 } } }, ally] };
      rerender(<Harness caster={caster} />);

      expect(screen.getByLabelText("Рятівний кидок: Годрік")).toBeTruthy();
      expect(screen.queryByLabelText("Рятівний кидок: Гоблін")).toBeNull();

      fireEvent.change(screen.getByLabelText("Кубик 1 (d6)"), { target: { value: "4" } });
      fireEvent.click(screen.getByRole("button", { name: "Далі · підсумок" }));

      expect(screen.queryByText(/Цілі:.*Гоблін/)).toBeNull();

      fireEvent.click(screen.getByRole("button", { name: /Застосувати/ }));

      await waitFor(() => expect(castSpell).toHaveBeenCalledWith(expect.objectContaining({ targetIds: [ally.basicInfo.id] })));
    });

    it("шаблон: клік у порожню зону теж каст — кидки, потім каст без цілей з targetCell", async () => {
      const { wrapper, caster, value, castSpell } = onMap(["meteor"], true);

      render(<Harness caster={caster} />, { wrapper });

      fireEvent.click(await screen.findByText("Метеор"));
      fireEvent.click(screen.getByRole("button", { name: "Навести на карті" }));

      act(() => (vi.mocked(value.intents.setMapAim).mock.calls.at(-1)?.[0] as MapAim).onAim({ x: 1, y: 4 }));

      expect(screen.queryByText("Оберіть точку на карті")).toBeNull();
      expect(vi.mocked(value.intents.setMapAim).mock.calls.at(-1)?.[0]).toBeNull();

      fireEvent.change(screen.getByLabelText("Кубик 1 (d6)"), { target: { value: "4" } });
      fireEvent.click(screen.getByRole("button", { name: "Далі · підсумок" }));
      fireEvent.click(screen.getByRole("button", { name: /Застосувати/ }));

      await waitFor(() => expect(castSpell).toHaveBeenCalledWith(expect.objectContaining({ spellId: "meteor", targetIds: [], targetCell: { x: 1, y: 4 } })));
    });

    it("одиночне, розширене вмінням: на карті — «Навести на карті», коло 10 футів лише по ворогах, каст з targetCell", async () => {
      const area = [resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "spellTargeting", mode: "area" }] })];

      const { wrapper, caster, value, castSpell } = onMap(["ray"], false, area);

      render(<Harness caster={caster} />, { wrapper });

      fireEvent.click(await screen.findByText("Палаючий промінь"));
      fireEvent.click(screen.getByRole("button", { name: "Навести на карті" }));

      const aim = vi.mocked(value.intents.setMapAim).mock.calls.at(-1)?.[0] as MapAim;

      expect(aim).toMatchObject({ template: { shape: "circle", size: 10 }, casterId: "me" });

      act(() => aim.onAim({ x: 4, y: 0 }));

      fireEvent.change(screen.getByLabelText("Кубик 1 (d6)"), { target: { value: "4" } });
      fireEvent.change(screen.getByLabelText("Кубик 2 (d6)"), { target: { value: "5" } });
      fireEvent.click(screen.getByRole("button", { name: "Далі · підсумок" }));
      fireEvent.click(screen.getByRole("button", { name: /Застосувати/ }));

      await waitFor(() => expect(castSpell).toHaveBeenCalledWith(expect.objectContaining({ spellId: "ray", targetIds: ["gob"], targetCell: { x: 4, y: 0 } })));
    });

    it("одиночне, розширене вмінням, без карти — «Обрати цілі» й список", async () => {
      const area = [resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "spellTargeting", mode: "area" }] })];

      const { wrapper, caster } = fakeScene({ knownSpells: ["ray"], abilities: area, slots: { "2": { max: 3, current: 3 } } });

      render(<Harness caster={caster} />, { wrapper });

      fireEvent.click(await screen.findByText("Палаючий промінь"));
      fireEvent.click(screen.getByRole("button", { name: /Обрати цілі/ }));

      expect(screen.getByRole("button", { name: /Гоблін/ })).toBeTruthy();
    });

    it("розширення «all» на карті: бейдж і примітка без зони, «Далі» одразу до кидків без наведення", async () => {
      const wrath = [resolved({ name: "Гнів природи", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "spellTargeting", mode: "all", maxLevel: 4 }] })];

      const { wrapper, caster } = onMap(["ray"], false, wrath);

      render(<Harness caster={caster} />, { wrapper });

      fireEvent.click(await screen.findByText("Палаючий промінь"));

      expect(screen.getByText("усі вороги", { selector: "[data-spell-widening]" })).toBeTruthy();
      expect(screen.getByRole("note").textContent).toBe("Гнів природи: усі вороги");
      expect(screen.queryByRole("button", { name: /Навести на карті/ })).toBeNull();

      fireEvent.click(screen.getByRole("button", { name: /Далі/ }));

      expect(screen.getByText(/Кубики ·/)).toBeTruthy();
    });

    it("розширення «area» без карти — «до N цілей», без зони; без вміння — без примітки", async () => {
      const split = [resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "spellTargeting", mode: "area", maxTargets: 3 }] }, { type: "artifact", name: "Посох розщеплення" })];

      const { wrapper, caster } = fakeScene({ knownSpells: ["ray", "ball"], abilities: split, slots: { "2": { max: 3, current: 3 } } });

      render(<Harness caster={caster} />, { wrapper });

      fireEvent.click(await screen.findByText("Палаючий промінь"));
      expect(screen.getByRole("note").textContent).toBe("Посох розщеплення: до 3 цілей");
      expect(screen.getAllByText("до 3 цілей", { selector: "[data-spell-widening]" })).toHaveLength(1);

      fireEvent.click(screen.getByText("Вогняна куля"));
      expect(screen.queryByRole("note")).toBeNull();
    });

    it("ланцюг: на карті обирається перша ціль, панель показує порядок ланцюга, каст лише з першою", async () => {
      const { wrapper, caster, value, castSpell, me, gob, ally } = onMap(["chain"]);

      const orc = { ...gob, basicInfo: { ...gob.basicInfo, id: "orc", name: "Орк" }, battleData: { ...gob.battleData, position: { x: 7, y: 3 } } };

      const imp = { ...gob, basicInfo: { ...gob.basicInfo, id: "imp", name: "Біс" }, battleData: { ...gob.battleData, position: { x: 5, y: 0 } } };

      value.battle = { ...value.battle, initiativeOrder: [me, orc, gob, imp, ally] };

      render(<Harness caster={caster} />, { wrapper });

      fireEvent.click(await screen.findByText("Ланцюгова блискавка"));
      fireEvent.click(screen.getByRole("button", { name: /Обрати цілі/ }));

      expect(screen.getByText("Оберіть першу ціль на карті")).toBeTruthy();

      act(() => lastPick(value)?.onPick("gob"));

      const names = screen.getAllByRole("listitem").map((li) => li.textContent);

      expect(names.map((n) => /\d\. \S+/.exec(n ?? "")?.[0])).toEqual(["1. Гоблін", "2. Біс", "3. Орк"]);

      fireEvent.click(screen.getByRole("button", { name: "Далі · кидки" }));
      fireEvent.change(screen.getByLabelText("Кубик 1 (d6)"), { target: { value: "4" } });
      fireEvent.click(screen.getByRole("button", { name: "Далі · підсумок" }));
      fireEvent.click(screen.getByRole("button", { name: /Застосувати/ }));

      await waitFor(() => expect(castSpell).toHaveBeenCalledWith(expect.objectContaining({ spellId: "chain", targetIds: ["gob"] })));
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
      fireEvent.click(screen.getByRole("button", { name: "Навести на карті" }));
      act(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      });

      expect(screen.queryByText("Оберіть точку на карті")).toBeNull();
      expect(vi.mocked(value.intents.setMapAim).mock.calls.at(-1)?.[0]).toBeNull();
    });
  });
});
