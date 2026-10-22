import { describe, expect, it } from "vitest";

import { campaignIdFromChecklistKey, checklistKey, FLAG_KEY_RE, HIDE_ALL_HINTS_KEY, hintKey, PLAYER_SHEET_SEEN_KEY, WHATS_NEW_KEY } from "@/lib/onboarding/flag-keys";

describe("flag keys", () => {
  it("дозволені ключі", () => {
    for (const key of [hintKey("dm.races"), HIDE_ALL_HINTS_KEY, WHATS_NEW_KEY, PLAYER_SHEET_SEEN_KEY, checklistKey("cmabc123")]) expect(FLAG_KEY_RE.test(key)).toBe(true);
  });

  it("сміття відхиляється", () => {
    for (const key of ["", "foo", "hint:", "hint:DM", "checklist:", "checklist:a b", "whats-new:x", `hint:${"a".repeat(100)}`]) expect(FLAG_KEY_RE.test(key)).toBe(false);
  });

  it("campaignId з ключа чекліста", () => {
    expect(campaignIdFromChecklistKey(checklistKey("cmabc"))).toBe("cmabc");
    expect(campaignIdFromChecklistKey("hint:x")).toBeNull();
  });
});
