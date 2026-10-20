import { signed } from "@/lib/utils/common/format";
import type { DamageStep } from "@/types/battle";

const VALUE: Record<DamageStep["kind"], (value: number) => string> = {
  dice: String,
  flat: signed,
  percent: (v) => `${signed(v)}%`,
  multiplier: (v) => `×${v}`,
  immunity: () => "імунітет",
};

export const formatDamageStep = (step: Pick<DamageStep, "kind" | "value" | "after">) => `${VALUE[step.kind](step.value)} → ${step.after}`;
