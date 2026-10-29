import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export function StepIndicator({ steps, current, label }: { steps: string[]; current: number; label: string }) {
  return (
    <ol aria-label={label} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      {steps.map((step, i) => {
        const done = i < current, active = i === current;

        return (
          <li key={step} aria-current={active ? "step" : undefined} data-state={done ? "done" : active ? "current" : "todo"} className={cn("flex items-center gap-1.5", active ? "text-hud-gold" : done ? "text-hud-ink" : "text-hud-muted")}>
            <span className={cn("flex size-5 items-center justify-center rounded-full border text-xs", active ? "border-hud-gold" : "border-hud-rule")}>{done ? <Check className="size-3" aria-hidden /> : i + 1}</span>
            {step}
          </li>
        );
      })}
    </ol>
  );
}
