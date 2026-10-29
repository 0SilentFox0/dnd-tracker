import { describe, expect, it } from "vitest";

import { makeT } from "@/lib/i18n/test/mock-t";
import { logTextOf, textOf } from "@/lib/i18n/test/text";
import { textRef } from "@/lib/i18n/text-ref";
import { splitLegacyTriggers } from "@/lib/utils/battle/log/legacy";
import { actionLines, formatBattleLog, lineText, logFields, withLines, withPrefix } from "@/lib/utils/battle/log/lines";
import type { BattleAction } from "@/types/battle";

const legacy = { resultText: "Гоблін б'є | гарантована шкода: 2" };

const structured = { resultText: "", log: [textRef("battleCommon.actors.dm"), "Гоблін"] };

describe("actionLines", () => {
  it("legacy event: segments of resultText", () => {
    expect(actionLines(legacy)).toEqual(["Гоблін б'є", "гарантована шкода: 2"]);
  });

  it("structured event: its log", () => {
    expect(actionLines(structured)).toBe(structured.log);
  });
});

describe("formatBattleLog / logTextOf", () => {
  it("legacy text comes back unchanged", () => {
    expect(formatBattleLog(makeT(), legacy)).toBe(legacy.resultText);
    expect(logTextOf(legacy)).toBe(legacy.resultText);
  });

  it("structured lines render in the viewer's language", () => {
    expect(logTextOf(structured, "uk")).toBe("DM | Гоблін");
    expect(logTextOf({ resultText: "", log: [textRef("battleCommon.actors.system")] }, "uk")).toBe("Система");
    expect(logTextOf({ resultText: "", log: [textRef("battleCommon.actors.system")] }, "en")).toBe("System");
  });
});

describe("lineText / logFields", () => {
  it("plain lines stay a legacy resultText", () => {
    expect(logFields(lineText(["a", "b"], "; "))).toEqual({ resultText: "a; b" });
  });

  it("refs become a structured log with an empty resultText", () => {
    const ref = textRef("battleCommon.actors.dm");

    expect(logFields(lineText(["a", ref], "; "))).toEqual({ resultText: "", log: ["a", ref] });
    expect(logFields(ref)).toEqual({ resultText: "", log: [ref] });
  });
});

describe("withLines / withPrefix", () => {
  it("keep a legacy action legacy while everything is text", () => {
    const action = { resultText: "x | y" } as BattleAction;

    expect(withLines(action, ["z"]).resultText).toBe("x | y | z");
    expect(withPrefix(action, "🏰 ").resultText).toBe("🏰 x | y");
  });

  it("move to a structured log once a ref is appended", () => {
    const ref = textRef("battleCommon.actors.dm");

    const next = withLines({ resultText: "x | y" } as BattleAction, [ref]);

    expect(next.resultText).toBe("");
    expect(next.log).toEqual(["x", "y", ref]);
    expect(textOf(withPrefix(structured as BattleAction, "› ").log?.[0] ?? "")).toBe("› DM");
  });
});

describe("splitLegacyTriggers", () => {
  it("splits «Тригери …: a; b» into the headline and items", () => {
    expect(splitLegacyTriggers(["Тригери початку раунду 7: 💚 Сила; 🛡 Клятва", "ще"])).toEqual({ headline: "Тригери початку раунду 7", lines: ["💚 Сила", "🛡 Клятва", "ще"], isTrigger: true });
  });

  it("an ordinary first line stays the headline", () => {
    expect(splitLegacyTriggers(["Гоблін б'є", "x"])).toEqual({ headline: "Гоблін б'є", lines: ["x"], isTrigger: false });
  });
});
