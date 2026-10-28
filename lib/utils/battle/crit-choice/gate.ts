import { type DisabledCrits, enabledCritEffects, randomCritEffect } from "./catalog";
import type { CritPicker, CritTrigger } from "./types";

import type { Rng } from "@/lib/utils/common/rng";

export function createCritGate(opts: { rng: Rng; choices?: Record<string, number>; disabled?: DisabledCrits }): { pick: CritPicker; triggers: CritTrigger[] } {
  const triggers: CritTrigger[] = [];

  const seen = new Map<string, number>();

  const pick: CritPicker = (info) => {
    // завжди рівно один rng(), щоб потік кидків не залежав від вибору
    const random = randomCritEffect(info.source, info.kind, opts.rng, opts.disabled);

    const base = `${info.source}:${info.actorId}:${info.targetId}`;

    const n = seen.get(base) ?? 0;

    seen.set(base, n + 1);

    const key = `${base}:${n}`;

    triggers.push({ ...info, key });

    const chosen = opts.choices?.[key];

    return (chosen !== undefined && enabledCritEffects(info.source, info.kind, opts.disabled).find((e) => e.id === chosen)) || random;
  };

  return { pick, triggers };
}
