import { describe, expect, it } from "vitest";

import { context, participant } from "./fixtures";

import { ParticipantSide } from "@/lib/constants/battle";
import { unitControlMutation, unitControlSchema } from "@/lib/server/battles/mutations/unit-control/unit-control-mutation";

const hero = (id: string, owner: string, name = id) => participant(id, { controlledBy: owner, sourceType: "character", name });

const unit = (id: string) => participant(id, { controlledBy: "dm", sourceType: "unit", name: id, side: ParticipantSide.ALLY });

const ctx = () => context({ isDM: true, userId: "dm-user", participants: [hero("h1", "p1", "Айвен"), hero("h2", "p2", "Маркел"), unit("u1"), unit("u2")] });

const owner = (out: ReturnType<typeof unitControlMutation>, id: string) => out.participants.find((p) => p.basicInfo.id === id)?.basicInfo.controlledBy;

describe("unit-control mutation", () => {
  it("assign: передає юніта гравцю і пише в лог", () => {
    const out = unitControlMutation(ctx(), { mode: "assign", participantId: "u1", controlledBy: "p2" });

    expect(owner(out, "u1")).toBe("p2");
    expect(out.events[0].resultText).toBe("🎮 ДМ передає u1 під керування Маркел");
  });

  it("assign: гравець поза боєм — помилка", () => {
    expect(() => unitControlMutation(ctx(), { mode: "assign", participantId: "u1", controlledBy: "zzz" })).toThrow("Гравець не бере участі в бою");
  });

  it("random: роздає вільних юнітів серед власників героїв", () => {
    const out = unitControlMutation({ ...ctx(), rng: () => 0.99 }, { mode: "random" });

    expect(owner(out, "u1")).toBe("p2");
    expect(owner(out, "u2")).toBe("p2");
    expect(out.events[0].resultText).toBe("🎲 ДМ роздає вільних юнітів: u1 → Маркел, u2 → Маркел");
  });

  it("random: немає вільних юнітів чи гравців — помилка", () => {
    expect(() => unitControlMutation(context({ isDM: true, participants: [hero("h1", "p1"), participant("e", { side: ParticipantSide.ENEMY })] }), { mode: "random" })).toThrow();
    expect(() => unitControlMutation(context({ isDM: true, participants: [unit("u1")] }), { mode: "random" })).toThrow();
  });

  it("схема приймає обидва режими", () => {
    expect(unitControlSchema.safeParse({ mode: "random" }).success).toBe(true);
    expect(unitControlSchema.safeParse({ mode: "assign", participantId: "u1", controlledBy: "p1" }).success).toBe(true);
    expect(unitControlSchema.safeParse({ mode: "assign" }).success).toBe(false);
  });
});
