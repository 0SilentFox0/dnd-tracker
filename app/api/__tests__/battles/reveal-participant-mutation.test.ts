import { describe, expect, it } from "vitest";

import { context, goblin, hero, participant } from "./fixtures";

import { revealParticipantMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/reveal-participant/reveal-participant-mutation";
import { ParticipantSide } from "@/lib/constants/battle";

const reserved = (id: string) => participant(id, { side: ParticipantSide.ENEMY, controlledBy: "dm" }, { battleData: { ...goblin.battleData, reserved: true } });

describe("reveal-participant mutation", () => {
  it("ставить відкритого одразу після поточного, поточний не змінюється", () => {
    const out = revealParticipantMutation(context({ isDM: true, pending: [reserved("imp")] }), { participantIds: ["imp"] });

    expect(out.participants.map((p) => p.basicInfo.id)).toEqual(["hero", "imp", "gob"]);
    expect(out.scene?.turnIndex).toBeUndefined();
    expect(out.pending).toEqual([]);
    expect(out.participants[1].battleData).toMatchObject({ revealPending: true });
    expect(out.participants[1].battleData.reserved).toBeUndefined();
    expect(out.events[0].resultText).toContain("ввів у бій");
  });

  it("кілька відкриттів до кінця ходу — у порядку відкриття", () => {
    const first = revealParticipantMutation(context({ isDM: true, pending: [reserved("a"), reserved("b")] }), { participantIds: ["a"] });

    const second = revealParticipantMutation(context({ isDM: true, participants: first.participants, pending: first.pending }), { participantIds: ["b"] });

    expect(second.participants.map((p) => p.basicInfo.id)).toEqual(["hero", "a", "b", "gob"]);
  });

  it("один запит з кількома ID — у переданому порядку; саммони в pending лишаються", () => {
    const wolf = participant("wolf");

    const out = revealParticipantMutation(context({ isDM: true, pending: [reserved("a"), wolf, reserved("b")] }), { participantIds: ["b", "a"] });

    expect(out.participants.map((p) => p.basicInfo.id)).toEqual(["hero", "b", "a", "gob"]);
    expect(out.pending.map((p) => p.basicInfo.id)).toEqual(["wolf"]);
  });

  it("невідомий ID — 404", () => {
    expect(() => revealParticipantMutation(context({ isDM: true, participants: [hero, goblin] }), { participantIds: ["nope"] })).toThrow(expect.objectContaining({ status: 404 }));
  });
});
