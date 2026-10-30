import { describe, expect, it, vi } from "vitest";

import { prepareSave } from "../save-battle";

import * as battleConstants from "@/lib/constants/battle";
import { textRef } from "@/lib/i18n/text-ref";
import { context } from "@/lib/server/battles/__tests__/mutations/fixtures";
import { legacyLines } from "@/lib/utils/battle/log/legacy";
import { systemEvent } from "@/lib/utils/battle/store/event-mapping";

const log = [textRef("battleCommon.actors.dm"), "Гоблін"];

function save(events: ReturnType<typeof systemEvent>[], logText?: (l: typeof log) => string) {
  const c = context();

  return prepareSave(c, { participants: c.participants, pending: c.pending, events }, logText);
}

describe("prepareSave: fallback resultText", () => {
  it("подія з log отримує рендер через ' | ', details.log без змін", () => {
    const { events, delta } = save([systemEvent(1, log)], (l) => l.map(String).join(" | "));

    expect(events[0].resultText).toContain(" | ");
    expect(events[0].details).toMatchObject({ log });
    expect(delta.events[0].resultText).toBe("");
  });

  it("без log resultText як був", () => {
    expect(save([systemEvent(1, "legacy")], () => "x").events[0].resultText).toBe("legacy");
  });

  it("без logText resultText порожній", () => {
    expect(save([systemEvent(1, log)]).events[0].resultText).toBe("");
  });

  it("прапорець false вимикає запис", () => {
    vi.spyOn(battleConstants, "BATTLE_LOG_TEXT_FALLBACK", "get").mockReturnValue(false as never);

    expect(save([systemEvent(1, log)], () => "x").events[0].resultText).toBe("");

    vi.restoreAllMocks();
  });

  it("legacyLines(fallback) повертає ті самі рядки", () => {
    expect(legacyLines(["a", "b"].join(" | "))).toEqual(["a", "b"]);
  });
});
