import { describe, expect, it } from "vitest";

import { makeT } from "@/lib/i18n/test/mock-t";
import { textOf } from "@/lib/i18n/test/text";
import { capitalizeLine, dynamicTextRef, formatText, joinLines, lineKey, textRef } from "@/lib/i18n/text-ref";

describe("formatText", () => {
  const t = makeT();

  it("plain string is shown as is", () => {
    expect(formatText(t, "Гоблін промахується")).toBe("Гоблін промахується");
  });

  it("nested refs resolve before the outer message", () => {
    const line = dynamicTextRef("battleLog.hit", { target: textRef("battleCommon.actors.dm"), damage: 5 });

    expect(formatText(t, line)).toBe('battleLog.hit {"target":"battleCommon.actors.dm","damage":5}');
  });

  it("string params are content and are never translated", () => {
    expect(formatText(t, dynamicTextRef("battleLog.hit", { target: "rest" }))).toBe('battleLog.hit {"target":"rest"}');
  });

  it("joins lines (nested refs included) and capitalizes at render time", () => {
    const line = joinLines(["a: ", textRef("battleCommon.actors.dm")], "");

    expect(formatText(t, line)).toBe("a: battleCommon.actors.dm");
    expect(formatText(t, capitalizeLine("відновлює"))).toBe("Відновлює");
    expect(formatText(t, capitalizeLine(textRef("battleCommon.actors.dm")))).toBe("BattleCommon.actors.dm");
  });

  it("an unknown key is shown as is", () => {
    const missing = { ...makeT(), has: () => false } as unknown as ReturnType<typeof makeT>;

    expect(formatText(Object.assign((k: string) => k, missing), dynamicTextRef("nope.key"))).toBe("nope.key");
  });

  it("plain strings collapse into one string, refs keep the join", () => {
    expect(joinLines(["a", "b"], " · ")).toBe("a · b");
    expect(typeof joinLines(["a", textRef("battleCommon.actors.dm")], " · ")).toBe("object");
  });

  it("lineKey is stable for equal refs", () => {
    expect(lineKey(textRef("battleCommon.actors.dm"))).toBe(lineKey(textRef("battleCommon.actors.dm")));
    expect(lineKey("x")).toBe("x");
  });
});

describe("textOf on the real catalog", () => {
  it("renders the actor in both locales", () => {
    expect(textOf(textRef("battleCommon.actors.dm"), "uk")).toBe("DM");
    expect(textOf(textRef("battleCommon.actors.system"), "uk")).toBe("Система");
    expect(textOf(textRef("battleCommon.actors.system"), "en")).toBe("System");
  });
});

describe("empty params are not stored", () => {
  it("drops empty-string params and renders them as empty", () => {
    const ref = textRef("battleLog.attack.hit", { attacker: "A", target: "B", damage: 3, crit: "" });

    expect(ref.params).toEqual({ attacker: "A", target: "B", damage: 3 });
    expect(textOf(ref, "uk")).toBe("A → B: 3 шкоди");
  });

  it("omits params entirely when all are empty", () => {
    expect(textRef("battleLog.morale.leadership", { bonus: "" })).toEqual({ message: "battleLog.morale.leadership" });
  });
});
