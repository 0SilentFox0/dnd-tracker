import { describe, expect, it } from "vitest";

import { DM_STEPS, PLAYER_STEPS } from "@/lib/onboarding/checklists";
import type { DmFacts, PlayerFacts } from "@/lib/onboarding/types";

const emptyDm: DmFacts = { races: 0, units: 0, players: 0, activePlayerCharacters: 0, pendingDrafts: 0, battles: 0, battlesStarted: 0, scenarioPages: 0, decks: 0, tracks: 0, aiKeys: 0 };

const fullDm: DmFacts = { races: 1, units: 1, players: 1, activePlayerCharacters: 1, pendingDrafts: 0, battles: 1, battlesStarted: 1, scenarioPages: 1, decks: 1, tracks: 1, aiKeys: 1 };

const done = <F,>(steps: { id: string; isDone: (f: F) => boolean }[], facts: F) => steps.filter((s) => s.isDone(facts)).map((s) => s.id);

describe("DM_STEPS", () => {
  it("порожня кампанія — нічого не виконано", () => {
    expect(done(DM_STEPS, emptyDm)).toEqual([]);
  });

  it("повна кампанія — усе виконано", () => {
    expect(done(DM_STEPS, fullDm)).toEqual(DM_STEPS.map((s) => s.id));
  });

  it("кожен крок залежить від свого факту", () => {
    expect(done(DM_STEPS, { ...emptyDm, races: 2 })).toEqual(["races"]);
    expect(done(DM_STEPS, { ...emptyDm, battles: 1 })).toEqual(["battle-prepare"]);
    expect(done(DM_STEPS, { ...emptyDm, battlesStarted: 1 })).toEqual(["battle-run"]);
  });

  it("чернетки на схваленні — variant кроку героя", () => {
    const step = DM_STEPS.find((s) => s.id === "characters")!;

    expect(step.variant?.({ ...emptyDm, pendingDrafts: 2 })).toEqual({ name: "pending", params: { count: 2 } });
    expect(step.variant?.(emptyDm)).toBeUndefined();
  });

  it("6 обов'язкових кроків, решта optional", () => {
    expect(DM_STEPS.filter((s) => !s.optional)).toHaveLength(6);
  });
});

describe("PLAYER_STEPS", () => {
  const base: PlayerFacts = { ownCharacter: "none", sheetSeen: false, joinedBattle: false };

  it("чернетка на схваленні — крок героя ще не виконано, variant про очікування", () => {
    const step = PLAYER_STEPS.find((s) => s.id === "character")!;

    expect(step.isDone({ ...base, ownCharacter: "pending" })).toBe(false);
    expect(step.variant?.({ ...base, ownCharacter: "pending" })).toEqual({ name: "pending" });
    expect(step.isDone({ ...base, ownCharacter: "active" })).toBe(true);
  });

  it("аркуш і бій", () => {
    expect(done(PLAYER_STEPS, { ownCharacter: "active", sheetSeen: true, joinedBattle: true })).toEqual(["character", "sheet", "battle"]);
  });

  it("герой уже бився — аркуш вважається переглянутим", () => {
    expect(done(PLAYER_STEPS, { ownCharacter: "active", sheetSeen: false, joinedBattle: true })).toEqual(["character", "sheet", "battle"]);
  });

  it("крок бою без «Перейти» — кнопка бою з'являється в хедері сама", () => {
    expect(PLAYER_STEPS.find((s) => s.id === "battle")?.href).toBeUndefined();
  });

  it("показ — інформаційний, не рахується", () => {
    expect(PLAYER_STEPS.find((s) => s.id === "show")).toMatchObject({ informational: true, optional: true });
  });
});
