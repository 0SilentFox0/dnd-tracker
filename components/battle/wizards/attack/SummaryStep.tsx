import { Loader2, Swords } from "lucide-react";

import { type AttackWizardModel,btn, primaryBtn } from "./shared";

import { cn } from "@/lib/utils";
import { formatDamageStep } from "@/lib/utils/battle/view";

export function SummaryStep({ wizard: { state, view, actions } }: { wizard: AttackWizardModel }) {
  const submitting = state.step === "submitting";

  return (
    <>
      {view.steps.map((list, k) => (
        <div key={k} className="mt-1">
          {list.map((s, i) => (
            <div key={i} className={cn("flex min-h-9 items-center justify-between border-b border-white/[.06] text-sm", s.side === "attacker" && s.kind === "percent" && s.value > 0 && "text-[#cdb87e]", s.side === "target" && "text-hud-danger")}>
              <span>{s.label}</span>
              <span>{formatDamageStep(s)}</span>
            </div>
          ))}
        </div>
      ))}
      {view.unknownDefense && <div className="flex min-h-9 items-center justify-between text-sm italic text-[var(--hud-muted)]"><span>Захист і опори цілі</span><span>невідомо</span></div>}
      {view.steps.length > 0 && <div className="hud-sc flex h-12 items-center justify-between text-lg font-bold"><span>Орієнтовно</span><span className="text-[26px]">{view.estimate}</span></div>}
      {state.error && <p className="mt-2 text-sm text-[#e9a08f]">{state.error}</p>}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" disabled={submitting} onClick={actions.back} className={cn(btn, "border-white/25")}>← Назад</button>
        <button type="button" disabled={submitting} onClick={actions.submit} className={cn(btn, primaryBtn)}>
          {submitting ? <Loader2 className="size-5 animate-spin" /> : <><Swords className="size-5" />Атакувати</>}
        </button>
      </div>
    </>
  );
}
