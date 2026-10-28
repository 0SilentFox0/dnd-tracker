import { describe, expect, it } from "vitest";

import { context, goblin, hero, participant } from "./fixtures";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { patchParticipantMutation } from "@/lib/server/battles/mutations/participants/patch-participant-mutation";

const orc = participant("orc", { controlledBy: "dm" });

describe("patch-participant mutation", () => {
  it("видалення учасника перед поточним зсуває хід назад", () => {
    const out = patchParticipantMutation(context({ participants: [hero, goblin, orc], scene: { ...context().scene, turnIndex: 2 } }), "hero", { removeFromBattle: true });

    expect(out.participants.map((p) => p.basicInfo.id)).toEqual(["gob", "orc"]);
    expect(out.scene?.turnIndex).toBe(1);
  });

  it("видалення учасника з резерву прибирає його з pending, черга не змінюється", () => {
    const imp = { ...participant("imp", { controlledBy: "dm" }), battleData: { ...goblin.battleData, reserved: true } };

    const out = patchParticipantMutation(context({ pending: [imp] }), "imp", { removeFromBattle: true });

    expect(out.pending).toEqual([]);
    expect(out.participants.map((p) => p.basicInfo.id)).toEqual(["hero", "gob"]);
    expect(out.events[0].resultText).toContain("з резерву");
  });

  it("HP до 0 — unconscious і подія зі зміною HP", () => {
    const out = patchParticipantMutation(context(), "gob", { currentHp: 0 });

    const gob = out.participants.find((p) => p.basicInfo.id === "gob");

    expect(gob?.combatStats).toMatchObject({ currentHp: 0, status: "unconscious" });
    expect(out.events[0].hpChanges).toEqual([expect.objectContaining({ participantId: "gob", newHp: 0 })]);
  });

  it("немає учасника — 404", () => {
    expect(() => patchParticipantMutation(context(), "nobody", { currentHp: 3 })).toThrow(expect.objectContaining({ status: 404 }));
  });

  it("видалення поточного учасника: наступний отримує початок ходу, флаги скинуті", () => {
    const tired = { ...goblin, actionFlags: { ...goblin.actionFlags, hasUsedAction: true } };

    const out = patchParticipantMutation(context({ participants: [hero, tired], scene: { ...context().scene, turnIndex: 0 } }), "hero", { removeFromBattle: true });

    expect(out.participants.map((p) => p.basicInfo.id)).toEqual(["gob"]);
    expect(out.scene?.turnIndex).toBe(0);
    expect(out.participants[0].actionFlags.hasUsedAction).toBe(false);
  });

  it("видалення останнього в черзі, коли хід на ньому, — новий раунд", () => {
    const out = patchParticipantMutation(context({ participants: [hero, goblin, orc], scene: { ...context().scene, turnIndex: 2 } }), "orc", { removeFromBattle: true });

    expect(out.scene).toMatchObject({ round: 2 });
    expect(out.participants[out.scene?.turnIndex ?? -1]?.basicInfo.id).toBe("hero");
  });

  it("HP > 0 повертає непритомного до бою", () => {
    const downed = { ...goblin, combatStats: { ...goblin.combatStats, currentHp: 0, status: "unconscious" as const } };

    const out = patchParticipantMutation(context({ participants: [hero, downed] }), "gob", { currentHp: 5 });

    expect(out.participants.find((p) => p.basicInfo.id === "gob")?.combatStats.status).toBe("active");
  });

  it("kill — HP 0, статус dead і подія «Вбито»", () => {
    const out = patchParticipantMutation(context(), "gob", { kill: true });

    expect(out.participants.find((p) => p.basicInfo.id === "gob")?.combatStats).toMatchObject({ currentHp: 0, status: "dead" });
    expect(out.events[0].resultText).toContain("Вбито (DM)");
  });

  it("revive — мертвий герой повертається з 1 HP і статусом active", () => {
    const fallen = { ...hero, combatStats: { ...hero.combatStats, currentHp: 0, status: "dead" as const } };

    const out = patchParticipantMutation(context({ participants: [fallen, goblin] }), "hero", { revive: true });

    expect(out.participants.find((p) => p.basicInfo.id === "hero")?.combatStats).toMatchObject({ currentHp: 1, status: "active" });
    expect(out.events[0].resultText).toContain("Повернуто до життя (DM)");
  });

  it("revive живого — помилка", () => {
    expect(() => patchParticipantMutation(context(), "hero", { revive: true })).toThrow(API_ERRORS.BATTLE_PARTICIPANT_ALREADY_ALIVE);
  });
});
