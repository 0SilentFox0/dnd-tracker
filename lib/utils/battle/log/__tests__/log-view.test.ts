import { describe, expect, it } from "vitest";

import { textOf } from "@/lib/i18n/test/text";
import { dynamicTextRef, textRef } from "@/lib/i18n/text-ref";
import { ukT } from "@/lib/utils/abilities/__tests__/describe-fixtures";
import { critOutcome, effectLines, effectTitle, logEntryView, sanitizeLogEntry } from "@/lib/utils/battle/view";
import { getLogEntryDetailItems } from "@/lib/utils/battle/view/log-format";
import type { ActiveEffect, BattleAction } from "@/types/battle";

const entry = (resultText: string) => ({ resultText, hpChanges: [], actionType: "ability" }) as unknown as BattleAction;

describe("logEntryView: legacy resultText дає те саме, що до зміни", () => {
  it.each([
    ["атака з вогняною хвилею", "Гоблін → Арвен: 6 шкоди (КРИТИЧНЕ ПОПАДАННЯ!) | 🔥 Вогняна хвиля: Гоблін #2 −3", "Гоблін → Арвен: 6 шкоди (КРИТИЧНЕ ПОПАДАННЯ!)", ["🔥 Вогняна хвиля: Гоблін #2 −3"], false],
    ["заклинання", "Мирон застосовує Вогняна стріла (шкода: 8) | 🎲 Орк: рятівний кидок 12 проти СК 13 — провал", "Мирон застосовує Вогняна стріла (шкода: 8)", ["🎲 Орк: рятівний кидок 12 проти СК 13 — провал"], false],
    ["мораль", "Орк #1: мораль −3, пропускає хід", "Орк #1: мораль −3, пропускає хід", [], false],
    ["перемога з досвідом", "Перемога · ⭐ Досвід: 120 кожному", "Перемога · ⭐ Досвід: 120 кожному", [], false],
    ["тригери", "Тригери початку бою: 🛡 Клятва: Арвен; 💚 Сила: Айвен", "Тригери початку бою", ["🛡 Клятва: Арвен", "💚 Сила: Айвен"], true],
    ["дія ДМ", "Зміна HP (DM): Орк, 10 → 5", "Зміна HP (DM): Орк, 10 → 5", [], false],
  ])("%s", (_name, text, headline, lines, isTrigger) => {
    const v = logEntryView(entry(text));

    expect(v.headline).toBe(headline);
    expect(v.lines).toEqual(lines);
    expect(v.isTrigger).toBe(isTrigger);
  });
});

describe("logEntryView: структурований log", () => {
  const log = [dynamicTextRef("battleLog.triggers.roundStart", { round: 3 }), "🛡 Клятва: Арвен"];

  it("перший рядок — заголовок, ознака тригера за ключем, без регексу", () => {
    const v = logEntryView({ ...entry(""), log });

    expect(v.headline).toBe(log[0]);
    expect(v.lines).toEqual(["🛡 Клятва: Арвен"]);
    expect(v.isTrigger).toBe(true);
  });

  it("звичайний рядок з log не вважається тригером", () => {
    expect(logEntryView({ ...entry(""), log: ["Гоблін б'є"] }).isTrigger).toBe(false);
  });
});

describe("критичний ефект: текст з battleTerms", () => {
  const stored = { id: 1, type: "success", source: "attack", flavorIndex: 2 };

  const action = { actionIndex: 1, actionType: "attack", actorId: "me", actorName: "Арвен", targets: [{ participantId: "t", participantName: "Гоблін" }], actionDetails: { criticalEffect: stored }, hpChanges: [], resultText: "", log: ["x"] } as unknown as BattleAction;

  it("назва й флейвор рендеряться мовою глядача", () => {
    const out = critOutcome([action], new Set(), "me", "t");

    expect(textOf(out?.name ?? "", "uk")).toBe("Подвійний урон");
    expect(textOf(out?.name ?? "", "en")).not.toBe("Подвійний урон");
    expect(textOf(out?.flavor ?? "", "uk")).toContain("Арвен");
    expect(textOf(out?.flavor ?? "", "uk")).toContain("Гоблін");
    expect(textOf(out?.flavor ?? "", "en")).toContain("Гоблін");
  });

  it("деталі логу: ефект [d10] з назвою й описом", () => {
    const item = getLogEntryDetailItems(action).find((i) => i.kind === "text" && typeof i.label === "object" && i.label.message === "battleLog.details.effect");

    expect(item && item.kind === "text" && textOf(item.text, "uk")).toBe("Подвійний урон — Урон подвоюється (x2)");
  });
});

describe("damageRows і приховані дані", () => {
  it("гравець не бачить damageRows, ДМ — бачить", () => {
    const e = { ...entry(""), actionDetails: { targetAC: 12, damageBreakdown: "x", damageRows: [{ label: "a", tone: "step" }] } } as unknown as BattleAction;

    expect(sanitizeLogEntry(e, { isDM: false } as never).actionDetails).toEqual({});
    expect(sanitizeLogEntry(e, { isDM: true } as never)).toBe(e);
  });

  it("damageRows іде в деталі таблицею замість розбору рядка", () => {
    const rows = [{ label: textRef("battleCommon.actors.dm"), value: "+2", tone: "step" as const }];

    const items = getLogEntryDetailItems({ ...entry(""), actionDetails: { damageRows: rows, damageBreakdown: "Сума кубиків: 7" } } as unknown as BattleAction);

    expect(items).toContainEqual({ kind: "damage", rows });
  });
});

describe("ефекти рушія з label", () => {
  const effect = { id: "e", name: "Ухилення", label: textRef("battleCommon.actors.dm"), type: "buff", duration: 1, effects: [], description: "Опис" } as unknown as ActiveEffect;

  it("effectTitle віддає label, а без нього — name", () => {
    expect(effectTitle(effect)).toEqual(effect.label);
    expect(effectTitle({ ...effect, label: undefined })).toBe("Ухилення");
  });

  it("effectLines без опису капіталізує описи й прибирає дублі", async () => {
    const lines = effectLines({ ...effect, description: undefined, abilityEffects: [{ kind: "changeMorale", delta: 1 }, { kind: "changeMorale", delta: 1 }] } as unknown as ActiveEffect, await ukT());

    expect(lines).toHaveLength(1);
    expect(textOf(lines[0], "uk").charAt(0)).toBe(textOf(lines[0], "uk").charAt(0).toUpperCase());
  });
});
