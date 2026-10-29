import { describe, expect, it, vi } from "vitest";

import type { Locale } from "@/lib/i18n/config";
import { describeCharacterLog } from "@/lib/utils/characters/resources/describe-log";

const getTranslator = async (locale: Locale) => (await vi.importActual<typeof import("@/lib/i18n/translator")>("@/lib/i18n/translator")).getTranslator(locale);

describe("describeCharacterLog", () => {
  it.each([
    [{ kind: "check", data: { label: "Скритність", rolls: [11, 20], total: 23, mode: "advantage", inspiration: true } }, "rest.log.roll", "🎲 Скритність: 11 / 20 → 23 (перевага) · натхнення"],
    [{ kind: "save", data: { label: "Рятівний кидок: Мудрість", rolls: [], total: 0, autoFail: true } }, "rest.log.roll", "🎲 Рятівний кидок: Мудрість: автопровал"],
    [{ kind: "check", data: { rolls: [4], total: 6, mode: "normal" } }, "rest.log.roll", "🎲 Кидок: 4 → 6"],
    [{ kind: "hit_die", data: { die: 10, roll: 6, healed: 8, hpBefore: 10, hpAfter: 18 } }, "rest.log.hitDie", "🎲 Кістка хітів d10: 6 → +8 HP (10 → 18)"],
    [{ kind: "xp", data: { amount: -50, total: 0 } }, "rest.log.xp", "⭐ Досвід -50 (разом 0)"],
    [{ kind: "xp", data: { amount: 50, total: 80, note: "Бій" } }, "rest.log.xp", "⭐ Досвід +50 (разом 80) · Бій"],
    [{ kind: "battle_result", data: { hpBefore: 20, hpAfter: 0, maxHp: 20, dead: true } }, "rest.log.battleResult", "⚔ Після бою: HP 20 → 0 / 20 · загинув"],
    [{ kind: "short_rest", data: {} }, "rest.log.shortRest", "☕ Короткий відпочинок"],
    [{ kind: "inspiration", data: { value: false } }, "rest.log.inspirationRemoved", "✦ Натхнення знято"],
    [{ kind: "arcane_recovery", data: { levels: 3 } }, "rest.log.arcaneRecovery", "🔮 Arcane Recovery: відновлено 3 кіл слотів"],
  ] as const)("%j", async (entry, key, text) => {
    const described = describeCharacterLog(entry as never);

    expect(described.key).toBe(key);
    expect((await getTranslator("uk"))(described.key, described.params)).toBe(text);
  });

  it("en: roll with advantage and inspiration", async () => {
    const described = describeCharacterLog({ kind: "check", data: { label: "Stealth", rolls: [11, 20], total: 23, mode: "advantage", inspiration: true } });

    expect((await getTranslator("en"))(described.key, described.params)).toBe("🎲 Stealth: 11 / 20 → 23 (advantage) · inspiration");
  });
});
