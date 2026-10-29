import { createTranslator } from "use-intl/core";
import { describe, expect, it } from "vitest";

import { localSource } from "@/lib/i18n/local-source";
import { translateIssue } from "@/lib/i18n/translate-issue";
import type { Translator } from "@/lib/i18n/translator";
import { heroBaseHp } from "@/lib/utils/characters/hero-hp";

describe("heroBaseHp", () => {
  it("3 × HP/рівень + рівень × (HP/рівень + мод. ВИТ × 1.5)", () => {
    expect(heroBaseHp({ level: 1, constitution: 12 }).total).toBe(41);
    expect(heroBaseHp({ level: 10, constitution: 12, archetype: "warrior" }).total).toBe(171);
    expect(heroBaseHp({ level: 15, constitution: 12, archetype: "paladin" }).total).toBe(256);
    expect(heroBaseHp({ level: 1, constitution: 12, archetype: "mage" }).total).toBe(33);
  });

  it("невідомий архетип = Універсал", () => {
    expect(heroBaseHp({ level: 5, constitution: 10, archetype: "bogus" }).total).toBe(80);
  });

  it("мінімум 1", () => expect(heroBaseHp({ level: 1, constitution: 1, archetype: "mage" }).total).toBeGreaterThanOrEqual(1));

  it("розкладка: ключі й параметри", () => {
    const { breakdown } = heroBaseHp({ level: 1, constitution: 12 });

    expect(breakdown).toEqual([
      { message: "characterProfile.sheet.heroHp.formula", params: { archetype: "universal", baseLevels: "3", hpPerLevel: "10", conMod: "1", conCoefficient: "1.5" } },
      { message: "characterProfile.sheet.heroHp.total", params: { base: "30", level: "1", perLevel: "11.5", total: "41" } },
    ]);
  });

  it("uk-текст розкладки слово в слово, en повний", async () => {
    const render = async (locale: "uk" | "en", archetype?: string) => {
      const messages = { characterProfile: await localSource.load(locale, "characterProfile") };

      const t = createTranslator({ locale, messages }) as unknown as Translator;

      return heroBaseHp({ level: 1, constitution: 12, archetype }).breakdown.map((line) => translateIssue(t, { message: line.message, params: line.params }));
    };

    expect(await render("uk")).toEqual(["Універсал: 3 × 10 + рівень × (10 + мод. ВИТ 1 × 1.5)", "= 30 + 1 × 11.5 = 41"]);
    expect(await render("uk", "ranger")).toEqual(["Лучник: 3 × 9 + рівень × (9 + мод. ВИТ 1 × 1.5)", "= 27 + 1 × 10.5 = 37"]);
    expect((await render("en", "warrior"))[0]).toBe("Warrior: 3 × 12 + level × (12 + CON mod 1 × 1.5)");
  });
});
