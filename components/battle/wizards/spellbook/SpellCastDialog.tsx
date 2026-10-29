import { useTranslations } from "next-intl";
import { Loader2, Sparkles } from "lucide-react";

import { btn, primaryBtn } from "../attack/shared";
import { TargetButton } from "../TargetButton";
import { SaveRolls } from "./SaveRolls";
import { SlotSelect } from "./SlotSelect";
import { SpellSummary } from "./SpellSummary";

import { AiRollButton, DamageDice } from "@/components/battle/hud/DiceInput";
import { HUD_SURFACE } from "@/components/hud";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import type { useSpellBook } from "@/lib/hooks/battle";
import { useText } from "@/lib/i18n/use-text";
import { cn } from "@/lib/utils";
import { canGoBack, optionMissing, rollsComplete } from "@/lib/utils/battle/flows";

type Book = ReturnType<typeof useSpellBook>;

const ghost = cn(btn, "border-white/25");

const primary = cn(btn, primaryBtn, "disabled:opacity-50");

function BackCancel({ book, disabled }: { book: Book; disabled?: boolean }) {
  const tc = useTranslations("common.actions");

  const { state, actions } = book;

  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <button type="button" disabled={disabled || !canGoBack(state)} onClick={actions.back} className={cn(ghost, "disabled:opacity-50")}>← {tc("back")}</button>
      <button type="button" disabled={disabled} onClick={actions.close} className={ghost}>{tc("cancel")}</button>
    </div>
  );
}

function TargetsStep({ book }: { book: Book }) {
  const tw = useTranslations("battleWizards.spell.cast");

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
              trailing={!reachable && <span className="ml-auto text-sm italic">{view.filteredOut(t) ? tw("notSuitable") : tw("outOfRange")}</span>}
            />
          );
        })}
      </div>
      {view.chain.length > 0 && <div className="hud-sc mt-3 text-sm">{tw("chain", { chain: view.chain.map((p, i) => `${i + 1}. ${p.basicInfo.name}`).join(", ") })}</div>}
      <button type="button" disabled={state.targetIds.length === 0} onClick={actions.confirmTargets} className={cn(primary, "mt-3 w-full")}>{tw("next")}</button>
      <BackCancel book={book} />
    </>
  );
}

function RollsStep({ book }: { book: Book }) {
  const tw = useTranslations("battleWizards.spell.cast");

  const { state, view, actions } = book;

  const { selected } = view;

  return (
    <>
      <SaveRolls targets={view.saveTargets} saves={state.saves} onChange={actions.setSave} />
      <SaveRolls targets={view.attackTargets} saves={state.attacks} onChange={actions.setAttack} title={tw("attackRoll")} />
      {view.attackTargets.length > 0 && <p className="mt-1 text-xs italic text-[var(--hud-muted)]">{tw("serverD20")}</p>}
      {state.pick?.inputDice && (
        <label className="mt-3 flex items-center justify-between gap-3 text-sm">
          <span className="hud-sc font-bold">{state.pick.inputDice.label}</span>
          <input type="number" inputMode="numeric" min={1} max={state.pick.inputDice.max} value={state.inputCount ?? 1} onChange={(e) => actions.setInputCount(Number(e.target.value))} className="w-20 rounded border border-white/25 bg-transparent px-2 py-1 text-right" />
        </label>
      )}
      {state.pick && state.pick.diceSlots.length > 0 && (
        <>
          <div className="hud-sc mt-4 text-lg font-bold">{tw("dice")}{selected ? ` · ${view.formulaOf(selected)}` : ""}</div>
          <DamageDice slots={state.pick.diceSlots} values={state.damage} onChange={actions.setDamage} />
        </>
      )}
      <div className="mt-3 grid grid-cols-[1.25fr_1fr] gap-2">
        <AiRollButton onClick={actions.aiDamage} />
        <button type="button" disabled={!rollsComplete(state)} onClick={actions.toSummary} className={primary}>{tw("nextSummary")}</button>
      </div>
      <BackCancel book={book} />
    </>
  );
}

function OptionPicker({ book }: { book: Book }) {
  const tw = useTranslations("battleWizards.spell.cast");

  const text = useText();

  const { state, actions } = book;

  if (!state.pick?.options) return null;

  return (
    <fieldset className="mt-3 space-y-1 text-sm">
      <legend className="hud-sc mb-1 font-bold">{tw("pickOption")}</legend>
      {state.pick.options.map((label, i) => (
        <label key={i} className="flex items-start gap-2">
          <input type="radio" name="spell-option" checked={state.optionIndex === i} onChange={() => actions.setOption(i)} className="mt-1" />
          {text(label)}
        </label>
      ))}
    </fieldset>
  );
}

function SummaryStep({ book }: { book: Book }) {
  const tw = useTranslations("battleWizards.spell.cast");

  const { state, view, actions } = book;

  const { selected } = view;

  const submitting = state.step === "submitting";

  return (
    <>
      {selected && <SpellSummary spell={selected} state={state} targets={view.targets} formula={view.formulaOf(selected)} targeting={view.definitionOf(selected).targeting} slotCost={view.slotCostLabel(selected)} />}
      <OptionPicker book={book} />
      <button type="button" disabled={submitting || optionMissing(state)} onClick={actions.submit} className={cn(primary, "mt-3 w-full")}>
        {submitting ? <Loader2 className="size-5 animate-spin" /> : <><Sparkles className="size-5" />{tw("apply")}</>}
      </button>
      <BackCancel book={book} disabled={submitting} />
    </>
  );
}

export function SpellCastDialog({ book }: { book: Book }) {
  const tw = useTranslations("battleWizards.spell");

  const { state, view, actions } = book;

  const { step } = state;

  const open = (step === "targets" && !view.mapTargeting) || step === "rolls" || step === "summary" || step === "submitting";

  return (
    <ResponsiveDialog open={open} onOpenChange={(o) => !o && actions.close()} title={view.selected?.name ?? tw("fallbackName")} className={cn(HUD_SURFACE, "border-white/25 bg-[#15110e]")}>
      {step !== "submitting" && <SlotSelect book={book} />}
      {step === "targets" && <TargetsStep book={book} />}
      {step === "rolls" && <RollsStep book={book} />}
      {(step === "summary" || step === "submitting") && <SummaryStep book={book} />}
    </ResponsiveDialog>
  );
}
