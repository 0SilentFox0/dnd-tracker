import { createCritGate } from "./gate";
import type { CritPicker, CritResume } from "./types";

import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import type { Rng } from "@/lib/utils/common/rng";
import { mulberry32 } from "@/lib/utils/common/rng";

interface RunWithCritChoiceOptions {
  action: "attack" | "spell";
  actorId: string;
  request: unknown;
  enabled: boolean;
  resume?: CritResume;
  run(env: { rng: Rng; crit: CritPicker }): MutationResult | Promise<MutationResult>;
}

export async function runWithCritChoice(ctx: BattleMutationContext, opts: RunWithCritChoiceOptions): Promise<MutationResult> {
  const seed = opts.resume?.seed ?? Math.floor(Math.random() * 2 ** 32);

  const gate = createCritGate({ rng: ctx.rng ?? mulberry32(seed), choices: opts.resume?.choices });

  const result = await opts.run({ rng: gate.rng, crit: gate.pick });

  if (opts.resume) return { ...result, scene: { ...result.scene, pendingCritChoice: null } };

  if (!opts.enabled || gate.triggers.length === 0) return result;

  return {
    participants: ctx.participants,
    pending: ctx.pending,
    events: [],
    scene: { pendingCritChoice: { action: opts.action, actorId: opts.actorId, triggers: gate.triggers, request: opts.request, seed } },
    response: { pendingCritChoice: true },
  };
}
