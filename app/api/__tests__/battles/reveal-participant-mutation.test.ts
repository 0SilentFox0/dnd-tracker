import { describe, expect, it, vi } from "vitest";

import { context, goblin, hero, participant } from "./fixtures";

import { revealParticipantMutation, revealParticipantSchema } from "@/app/api/campaigns/[id]/battles/[battleId]/reveal-participant/reveal-participant-mutation";
import { ParticipantSide } from "@/lib/constants/battle";
import { cellsOf } from "@/lib/utils/battle/grid/occupancy";
import { at, mazeMap, withMap } from "@/lib/utils/battle/maze/__tests__/fixtures";
import { BattleAccess, runBattleMutation } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { type BattleMutationOutcome, prepareSave } from "@/lib/utils/battle/store";
import type { BattleMapConfig, BattleParticipant } from "@/types/battle";

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

describe("reveal-participant на карті", () => {
  const map: BattleMapConfig = { cols: 6, rows: 4, background: null, opacity: 0.3 };

  const at = (p: BattleParticipant, x: number, y: number): BattleParticipant => ({ ...p, battleData: { ...p.battleData, position: { x, y } } });

  it("пайплайн ставить введеного на вільну клітинку, і він стає токеном карти", async () => {
    const base = context({ isDM: true, participants: [at(hero, 0, 1), at(goblin, 5, 1)], pending: [reserved("imp")], meta: { ...context().meta, map } });

    let saved: BattleMutationOutcome | undefined;

    const res = await runBattleMutation(
      new Request("http://x/reveal-participant", { method: "POST", body: JSON.stringify({ participantIds: ["imp"] }) }),
      { params: { id: "c1", battleId: "b1" }, access: BattleAccess.DM, requireStatus: "active", allowWhileAwaitingDm: true, schema: revealParticipantSchema, mutate: revealParticipantMutation },
      {
        getUserId: async () => "dm-user",
        rateLimit: vi.fn(),
        loadBattle: async () => ({ scene: base.scene, meta: base.meta, participants: base.participants, pending: base.pending, isDM: true, isMember: true }),
        saveBattle: async (before, outcome) => {
          saved = outcome;

          return prepareSave(before, outcome).delta;
        },
        publish: vi.fn(),
        loadRecentEvents: async () => [],
      },
    );

    expect(res.status).toBe(200);

    const imp = saved?.participants.find((p) => p.basicInfo.id === "imp");

    expect(imp?.battleData.position).toBeDefined();

    const taken = (saved?.participants ?? []).filter((p) => p !== imp).flatMap((p) => cellsOf(p).map((c) => `${c.x}:${c.y}`));

    expect(cellsOf(imp as BattleParticipant).some((c) => taken.includes(`${c.x}:${c.y}`))).toBe(false);
  });
});

describe("reveal-participant у лабіринті", () => {
  it("розкритий ворог входить сплячим", () => {
    const base = context({ isDM: true, participants: [at(hero, { x: 0, y: 2 }), at(goblin, { x: 5, y: 5 }, { dormant: true })], pending: [reserved("imp")] });

    const out = revealParticipantMutation(withMap(base, mazeMap({ exit: { x: 5, y: 0 } }, 6)), { participantIds: ["imp"] });

    expect(out.participants.find((p) => p.basicInfo.id === "imp")?.battleData.dormant).toBe(true);
  });
});
