import { textRef } from "@/lib/i18n/text-ref";
import { signed } from "@/lib/utils/common/format";
import type { DamageStep } from "@/types/battle";
import type { LogLine } from "@/types/text";

const VALUE: Record<Exclude<DamageStep["kind"], "immunity">, (value: number) => string> = {
  dice: String,
  flat: signed,
  percent: (v) => `${signed(v)}%`,
  multiplier: (v) => `×${+v.toFixed(2)}`,
};

export const formatDamageStep = (step: Pick<DamageStep, "kind" | "value" | "after">): LogLine =>
  step.kind === "immunity" ? textRef("battleLog.damage.immunityStep", { after: step.after }) : `${VALUE[step.kind](step.value)} → ${step.after}`;
