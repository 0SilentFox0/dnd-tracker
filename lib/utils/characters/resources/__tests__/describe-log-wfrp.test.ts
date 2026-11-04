import { describe, expect, it, vi } from "vitest";

import { describeCharacterLog } from "@/lib/utils/characters/resources/describe-log";

const getTranslator = async (locale: "uk" | "en") => (await vi.importActual<typeof import("@/lib/i18n/translator")>("@/lib/i18n/translator")).getTranslator(locale);

describe("describeCharacterLog wfrp", () => {
  const data = { label: "WS", rawRoll: 30, roll: 30, reversed: true, target: 45, sl: 1, outcome: "success", auto: null, difficulty: "challenging", mode: "normal" };

  it("test params", () => {
    expect(describeCharacterLog({ kind: "test", data })).toEqual({
      key: "rest.log.test",
      params: { label: "WS", roll: 30, target: 45, sl: 1, outcome: "success", reversed: "yes", auto: "none", difficulty: "challenging" },
    });
  });

  it("test text in en and uk", async () => {
    const d = describeCharacterLog({ kind: "test", data });

    expect((await getTranslator("en"))(d.key, d.params)).toBe("🎲 WS: 30 vs 45 · success, SL 1 · reversed");
    expect((await getTranslator("uk"))(d.key, d.params)).toBe("🎲 WS: 30 проти 45 · успіх, РУ 1 · реверс");
  });

  it("auto outcome", () => {
    expect(describeCharacterLog({ kind: "test", data: { ...data, auto: "failure", reversed: false } }).params).toMatchObject({ auto: "failure", reversed: "no" });
  });

  it("session", async () => {
    const d = describeCharacterLog({ kind: "session", data: {} });

    expect(d).toEqual({ key: "rest.log.session" });
    expect((await getTranslator("en"))(d.key)).toBe("🎭 New session: Fortune restored");
  });
});
