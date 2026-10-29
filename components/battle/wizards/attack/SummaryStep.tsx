import { useTranslations } from "next-intl";
import { Loader2, Swords } from "lucide-react";

import { type AttackWizardModel,btn, primaryBtn } from "./shared";

import { CritWaitingNote } from "@/components/battle/crit-choice/CritWaitingNote";
import { useText } from "@/lib/i18n/use-text";
import { cn } from "@/lib/utils";
import { formatDamageStep } from "@/lib/utils/battle/view";

export function SummaryStep({ wizard: { state, view, actions } }: { wizard: AttackWizardModel }) {
  const t = useTranslations("battleWizards.attack.summary");

  const tc = useTranslations("common.actions");

  const text = useText();

  const submitting = state.step === "submitting";

  return (
    <>
      {view.steps.map((list, k) => (
        <div key={k} className="mt-1">
          {list.map((s, i) => (
            <div key={i} className={cn("flex min-h-9 items-center justify-between border-b border-white/[.06] text-sm", s.side === "attacker" && s.kind === "percent" && s.value > 0 && "text-[#cdb87e]", s.side === "target" && "text-hud-danger")}>
              <span>{text(s.label)}</span>
              <span>{text(formatDamageStep(s))}</span>
            </div>
          ))}
        </div>
      ))}
      {view.unknownDefense && <div className="flex min-h-9 items-center justify-between text-sm italic text-[var(--hud-muted)]"><span>{t("unknownDefense")}</span><span>{t("unknown")}</span></div>}
      {view.steps.length > 0 && <div className="hud-sc flex h-12 items-center justify-between text-lg font-bold"><span>{t("estimate")}</span><span className="text-[26px]">{view.estimate}</span></div>}
      {view.cunning && (
        <div className="mt-3 border border-white/15 p-2" data-cunning-strike>
          <div className="text-sm text-[#cdb87e]">{t("cunning", { dice: view.cunning.sneakDice })}</div>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {view.cunning.options.map((o) => (
              <button key={o.effect} type="button" aria-pressed={o.selected} disabled={submitting} onClick={() => actions.toggleCunning(o.effect)} className={cn("h-9 border px-3 text-sm", o.selected ? "border-[var(--enemy)] bg-white/10 font-bold text-[var(--ink)]" : "border-white/25 text-[#a89c88]")}>
                {text(o.label)} · −{o.dice}d6
              </button>
            ))}
          </div>
        </div>
      )}
      {state.waitingCrit && <CritWaitingNote />}
      {state.error && <p className="mt-2 text-sm text-[#e9a08f]">{text(state.error)}</p>}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" disabled={submitting} onClick={actions.back} className={cn(btn, "border-white/25")}>← {tc("back")}</button>
        <button type="button" disabled={submitting} onClick={actions.submit} className={cn(btn, primaryBtn)}>
          {submitting ? <Loader2 className="size-5 animate-spin" /> : <><Swords className="size-5" />{t("submit")}</>}
        </button>
      </div>
    </>
  );
}
