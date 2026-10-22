import { describe, expect, it } from "vitest";

import { checklistProgress, checklistState, isHintHidden, unseenWhatsNew, visibleWhatsNew } from "@/lib/onboarding/progress";
import type { WhatsNewEntry } from "@/lib/onboarding/types";

const dm = { races: 1, units: 1, players: 0, activePlayerCharacters: 0, pendingDrafts: 0, battles: 0, battlesStarted: 0, scenarioPages: 0, decks: 0, tracks: 0, aiKeys: 0 };

describe("checklistProgress", () => {
  it("рахує лише обов'язкові й підставляє campaignId у href", () => {
    const p = checklistProgress({ role: "dm", dm }, "c1");

    expect(p.requiredDone).toBe(2);
    expect(p.requiredTotal).toBe(6);
    expect(p.allRequiredDone).toBe(false);
    expect(p.steps[0].href).toContain("/campaigns/c1/");
  });

  it("гравцю — лише кроки гравця", () => {
    const p = checklistProgress({ role: "player", player: { ownCharacter: "active", sheetSeen: true, inActiveBattle: true } }, "c1");

    expect(p.steps.map((s) => s.id)).toEqual(["character", "sheet", "battle", "show"]);
    expect(p.allRequiredDone).toBe(true);
  });
});

describe("checklistState", () => {
  const now = new Date("2026-10-22T12:00:00Z");

  it("не все виконано — open", () => {
    expect(checklistState(undefined, false, now)).toBe("open");
  });

  it("hidden — завжди hidden", () => {
    expect(checklistState("hidden", false, now)).toBe("hidden");
  });

  it("виконано < 7 днів тому — collapsed, ≥ 7 — hidden", () => {
    expect(checklistState("2026-10-20T12:00:00.000Z", true, now)).toBe("collapsed");
    expect(checklistState("2026-10-15T12:00:00.000Z", true, now)).toBe("hidden");
  });

  it("виконано, але дати ще немає — collapsed", () => {
    expect(checklistState(undefined, true, now)).toBe("collapsed");
  });
});

describe("whats-new", () => {
  const entries: WhatsNewEntry[] = [
    { id: "n3", date: "2026-10-21", audience: "player", title: "", body: "" },
    { id: "n2", date: "2026-10-20", audience: "dm", title: "", body: "" },
    { id: "n1", date: "2026-10-19", audience: "all", title: "", body: "" },
  ];

  it("лише новіші за побачений і за аудиторією", () => {
    expect(unseenWhatsNew(entries, ["dm"], "n1").map((e) => e.id)).toEqual(["n2"]);
    expect(unseenWhatsNew(entries, ["dm", "player"], "n1").map((e) => e.id)).toEqual(["n3", "n2"]);
  });

  it("невідомий або порожній id — нічого непобаченого", () => {
    expect(unseenWhatsNew(entries, ["dm"], "deleted")).toEqual([]);
    expect(unseenWhatsNew(entries, ["dm"], null)).toEqual([]);
  });

  it("без ролей — бачить лише all", () => {
    expect(visibleWhatsNew(entries, []).map((e) => e.id)).toEqual(["n1"]);
  });
});

describe("isHintHidden", () => {
  it("закрита окремо або всі", () => {
    expect(isHintHidden("dm.races", { "hint:dm.races": null })).toBe(true);
    expect(isHintHidden("dm.races", { "hint:*": null })).toBe(true);
    expect(isHintHidden("dm.races", {})).toBe(false);
  });
});
