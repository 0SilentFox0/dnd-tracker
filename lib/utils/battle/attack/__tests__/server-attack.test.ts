import { describe, expect, it } from "vitest";

import { retaliate, SWORD,swordUnit } from "./helpers";

import { ParticipantSide } from "@/lib/constants/battle";
import { seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { resolveServerAttack } from "@/lib/utils/battle/attack/server-attack";
import type { ActionFlow } from "@/lib/utils/battle/common/action-flow";

const flowOf = (ps: ReturnType<typeof swordUnit>[], rng: () => number): ActionFlow => ({ ps, messages: [], summons: [], ctx: { round: 1, rng } });

describe("resolveServerAttack", () => {
  it("заголовок залежить від label; відсіч збігається з resolveRetaliation", () => {
    const run = (label: "retaliation" | "opportunity" | "readied") => {
      const rng = seq(0.85);

      const ps = [swordUnit("a", ParticipantSide.ALLY), swordUnit("d", ParticipantSide.ENEMY)];

      return resolveServerAttack({ flow: flowOf(ps, rng), attackerId: "d", targetId: "a", attack: SWORD, currentRound: 1, battleId: "b1", rng, label });
    };

    expect(run("readied").battleAction.resultText.startsWith("Підготовлена атака:")).toBe(true);
    expect(run("opportunity").battleAction.resultText.startsWith("Атака можливості:")).toBe(true);
    expect(run("retaliation").battleAction.resultText.startsWith("Відсіч:")).toBe(true);
    expect(run("retaliation").hit).toBe(true);
    expect(retaliate([swordUnit("a", ParticipantSide.ALLY), swordUnit("d", ParticipantSide.ENEMY)])?.battleAction.resultText).toBe(run("retaliation").battleAction.resultText);
  });

  it("промах: hit=false, ціль не падає", () => {
    const rng = seq(0.05);

    const ps = [swordUnit("a", ParticipantSide.ALLY), swordUnit("d", ParticipantSide.ENEMY)];

    const r = resolveServerAttack({ flow: flowOf(ps, rng), attackerId: "d", targetId: "a", attack: SWORD, currentRound: 1, battleId: "b1", rng, label: "readied" });

    expect(r).toMatchObject({ hit: false, downed: false });
  });
});
