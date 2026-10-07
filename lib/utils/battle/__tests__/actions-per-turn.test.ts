import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { runAbilities } from "@/lib/utils/abilities/engine/run-abilities";
import { processStartOfTurn } from "@/lib/utils/battle/battle-turn";
import type { AbilityEvent } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";

const bloodlust = resolved({
  trigger: { event: "kill", role: "killer" },
  stackable: true,
  maxStacks: 2,
  effects: [{ kind: "modifyStat", stat: "actionsPerTurn", flat: 1, duration: { rounds: 99 }, target: "self" }],
});

const kill = { type: "kill", actorId: "h", targetId: "e" } as AbilityEvent;

const killOnce = (ps: BattleParticipant[]) => runAbilities(ps, kill, { round: 1, rng: seq(0) }).participants;

const hero = () => makeParticipant({ id: "h", abilities: [bloodlust] });

const foe = () => makeParticipant({ id: "e", side: ParticipantSide.ENEMY });

describe("actionsPerTurn", () => {
  it("two stacks give 2 extra actions at each own turn start (reset, not accumulate); third kill adds nothing", () => {
    let ps = [hero(), foe()];

    ps = killOnce(killOnce(killOnce(ps)));

    const h = ps[0];

    expect(h.battleData.activeEffects.filter((e) => e.abilityKey?.startsWith(bloodlust.key))).toHaveLength(2);

    const first = processStartOfTurn(h, 2, ps);

    expect(first.participant.battleData.pendingExtraActions).toBe(2);

    const second = processStartOfTurn({ ...first.participant, battleData: { ...first.participant.battleData, pendingExtraActions: 1 } }, 3, ps);

    expect(second.participant.battleData.pendingExtraActions).toBe(2);
  });

  it("no grant without the effect", () => {
    const h = hero();

    expect(processStartOfTurn(h, 2, [h, foe()]).participant.battleData.pendingExtraActions ?? 0).toBe(0);
  });

  it("nothing once the effect has expired", () => {
    const ps = killOnce([hero(), foe()]);

    const short = { ...ps[0], battleData: { ...ps[0].battleData, activeEffects: ps[0].battleData.activeEffects.map((e) => ({ ...e, duration: 1 })) } };

    expect(processStartOfTurn(short, 2, [short, foe()]).participant.battleData.pendingExtraActions ?? 0).toBe(0);
  });
});
