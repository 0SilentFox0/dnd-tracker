import { describe, expect, it } from "vitest";

import { describeCharacterLog } from "@/lib/utils/characters/resources/describe-log";

describe("describeCharacterLog", () => {
  it.each([
    [{ kind: "check", data: { label: "Скритність", rolls: [11, 20], total: 23, mode: "advantage", inspiration: true } }, "🎲 Скритність: 11 / 20 → 23 (перевага) · натхнення"],
    [{ kind: "save", data: { label: "Рятівний кидок: Мудрість", rolls: [], total: 0, autoFail: true } }, "🎲 Рятівний кидок: Мудрість: автопровал"],
    [{ kind: "hit_die", data: { die: 10, roll: 6, healed: 8, hpBefore: 10, hpAfter: 18 } }, "🎲 Кістка хітів d10: 6 → +8 HP (10 → 18)"],
    [{ kind: "xp", data: { amount: -50, total: 0 } }, "⭐ Досвід -50 (разом 0)"],
    [{ kind: "battle_result", data: { hpBefore: 20, hpAfter: 0, maxHp: 20, dead: true } }, "⚔ Після бою: HP 20 → 0 / 20 · загинув"],
    [{ kind: "short_rest", data: {} }, "☕ Короткий відпочинок"],
  ] as const)("%j", (entry, text) => {
    expect(describeCharacterLog(entry as never)).toBe(text);
  });
});
