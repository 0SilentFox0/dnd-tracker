import { describe, expect, it } from "vitest";

import { decodeLog, decodeStoredLog, encodeLog } from "../codec";

import { textOf } from "@/lib/i18n/test/text";
import { joinLines, textRef } from "@/lib/i18n/text-ref";
import type { LogLine } from "@/types/text";

const sample: LogLine[] = [
  "plain",
  textRef("battleLog.attack.hit", { attacker: "A", target: "B", damage: 3, crit: textRef("battleLog.attack.critPlain") }),
  textRef("abilityText.log.withChance", { text: textRef("abilityText.log.applied", { ability: "X", effect: "e", target: "T", rounds: 2 }), chance: 40 }),
  joinLines([textRef("battleLog.attack.critPlain"), textRef("battleLog.attack.critPlain")]),
  textRef("battleTerms.crits.nat20.title"),
];

describe("battle log codec", () => {
  it("round-trips and is smaller", () => {
    const encoded = encodeLog(sample);

    expect(decodeLog(encoded)).toEqual(sample);
    expect(JSON.stringify(encoded).length).toBeLessThan(JSON.stringify(sample).length * 0.7);
  });

  it("renders the same text in both locales", () => {
    const decoded = decodeLog(encodeLog(sample));

    for (const locale of ["uk", "en"] as const) expect(decoded.map((l) => textOf(l, locale))).toEqual(sample.map((l) => textOf(l, locale)));
  });

  it("reads legacy {message, params} rows unchanged", () => {
    expect(decodeLog(sample)).toEqual(sample);
    expect(decodeStoredLog({ log: sample })).toEqual(sample);
    expect(decodeStoredLog({})).toBeUndefined();
  });

  it("keeps a ref in legacy form when a param key collides with a code or the key has the separator", () => {
    const colliding = { message: "battleLog.attack.hit", params: { t: "x", target: "y" } };

    const piped = { message: "a|b", params: { target: "y" } };

    expect(encodeLog([colliding, piped])).toEqual([colliding, piped]);
    expect(decodeLog(encodeLog([colliding, piped]))).toEqual([colliding, piped]);
  });
});
