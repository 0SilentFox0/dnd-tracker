import { Loader2, Sparkles } from "lucide-react";

import { btn, primaryBtn } from "../attack/shared";
import { TargetButton } from "../TargetButton";
import { SaveRolls } from "./SaveRolls";
import { SpellSummary } from "./SpellSummary";

import { AiRollButton, DamageDice } from "@/components/battle/hud/DiceInput";
import { HUD_SURFACE } from "@/components/hud";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import type { useSpellBook } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import { canGoBack, rollsComplete } from "@/lib/utils/battle/flows";

type Book = ReturnType<typeof useSpellBook>;

const ghost = cn(btn, "border-white/25");

const primary = cn(btn, primaryBtn, "disabled:opacity-50");

function BackCancel({ book, disabled }: { book: Book; disabled?: boolean }) {
  const { state, actions } = book;

  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <button type="button" disabled={disabled || !canGoBack(state)} onClick={actions.back} className={cn(ghost, "disabled:opacity-50")}>← Назад</button>
      <button type="button" disabled={disabled} onClick={actions.close} className={ghost}>Скасувати</button>
    </div>
  );
}

function TargetsStep({ book }: { book: Book }) {
  const { state, view, actions } = book;

  return (
    <>
      <div className="space-y-2">
        {view.targets.map((t) => {
          const reachable = view.inRange(t);

          return (
            <TargetButton
              key={t.basicInfo.id}
              participant={t}
              tone="enemy"
              selected={state.targetIds.includes(t.basicInfo.id)}
              disabled={!reachable}
              onClick={() => actions.toggleTarget(t.basicInfo.id)}
              trailing={!reachable && <span className="ml-auto text-sm italic">Поза дальністю</span>}
            />
          );
        })}
      </div>
      {view.chain.length > 0 && <div className="hud-sc mt-3 text-sm">Ланцюг: {view.chain.map((p, i) => `${i + 1}. ${p.basicInfo.name}`).join(", ")}</div>}
      <button type="button" disabled={state.targetIds.length === 0} onClick={actions.confirmTargets} className={cn(primary, "mt-3 w-full")}>Далі · кидки</button>
      <BackCancel book={book} />
    </>
  );
}

function RollsStep({ book }: { book: Book }) {
  const { state, view, actions } = book;

  const { selected } = view;

  return (
    <>
      <SaveRolls targets={view.saveTargets} saves={state.saves} onChange={actions.setSave} />
      {state.pick && state.pick.diceSlots.length > 0 && (
        <>
          <div className="hud-sc mt-4 text-lg font-bold">Кубики{selected ? ` · ${view.formulaOf(selected)}` : ""}</div>
          <DamageDice slots={state.pick.diceSlots} values={state.damage} onChange={actions.setDamage} />
        </>
      )}
      <div className="mt-3 grid grid-cols-[1.25fr_1fr] gap-2">
        <AiRollButton onClick={actions.aiDamage} />
        <button type="button" disabled={!rollsComplete(state)} onClick={actions.toSummary} className={primary}>Далі · підсумок</button>
      </div>
      <BackCancel book={book} />
    </>
  );
}

function SummaryStep({ book }: { book: Book }) {
  const { state, view, actions } = book;

  const { selected } = view;

  const submitting = state.step === "submitting";

  return (
    <>
      {selected && <SpellSummary spell={selected} state={state} targets={view.targets} formula={view.formulaOf(selected)} targeting={view.definitionOf(selected).targeting} slotCost={view.slotCostLabel(selected)} />}
      <button type="button" disabled={submitting} onClick={actions.submit} className={cn(primary, "mt-3 w-full")}>
        {submitting ? <Loader2 className="size-5 animate-spin" /> : <><Sparkles className="size-5" />Застосувати</>}
      </button>
      <BackCancel book={book} disabled={submitting} />
    </>
  );
}

/** Цілі (без карти), кидки й підсумок заклинання — окреме вікно, як у атаки; книга при цьому закрита. */
export function SpellCastDialog({ book }: { book: Book }) {
  const { state, view, actions } = book;

  const { step } = state;

  const open = (step === "targets" && !view.mapTargeting) || step === "rolls" || step === "summary" || step === "submitting";

  return (
    <ResponsiveDialog open={open} onOpenChange={(o) => !o && actions.close()} title={view.selected?.name ?? "Заклинання"} className={cn(HUD_SURFACE, "border-white/25 bg-[#15110e]")}>
      {step === "targets" && <TargetsStep book={book} />}
      {step === "rolls" && <RollsStep book={book} />}
      {(step === "summary" || step === "submitting") && <SummaryStep book={book} />}
    </ResponsiveDialog>
  );
}
