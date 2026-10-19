"use client";

import { Loader2, Sparkles, Swords } from "lucide-react";

import { SaveRolls } from "./spellbook/SaveRolls";
import { SpellAimPanel } from "./spellbook/SpellAimPanel";
import { SpellSummary } from "./spellbook/SpellSummary";

import { Portrait } from "@/components/battle/hud";
import { AiRollButton, DamageDice } from "@/components/battle/hud/DiceInput";
import { HUD_SURFACE } from "@/components/hud";
import { SpellBookPages, SpellDetail } from "@/components/spells/book/SpellBookPages";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import type { useSpellBook } from "@/lib/hooks/battle";
import { useMediaQuery } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";
import { canGoBack, rollsComplete, type SpellTargetMode } from "@/lib/utils/battle/flows";

type Book = ReturnType<typeof useSpellBook>;

const seal = "hud-sc flex h-[52px] w-full items-center justify-center gap-3 bg-[#7a2a1f] text-lg tracking-[.08em] text-[#f3e7cc] shadow-[inset_0_0_0_1px_#a8473a,inset_0_0_0_3px_#7a2a1f,inset_0_0_0_4px_rgba(243,231,204,.35)] disabled:opacity-50";

const TARGETS_LABEL: Partial<Record<SpellTargetMode, string>> = { none: "Далі", template: "Навести на карті" };

const targetsLabel = (mode: SpellTargetMode | undefined) => (mode && TARGETS_LABEL[mode]) ?? "Обрати цілі";

export function SpellBook({ book }: { book: Book }) {
  const { state, view, actions } = book;

  const { byLevel, selected, targets } = view;

  const wide = useMediaQuery("(min-width: 1024px)");

  const aiming = state.step === "targets" && state.pick?.targetMode === "template";

  const open = state.step !== "closed" && state.step !== "result" && !aiming;

  const detailPage = selected && (
    <div className="relative flex h-full flex-1 flex-col px-5 pb-5 pt-6">
      {state.step === "spell" && (
        <SpellDetail spell={selected} formula={view.formulaOf(selected)}>
          <button type="button" disabled={(selected.level > 0 && view.slotLeft(selected.level) === 0) || view.costUsed(selected)} onClick={actions.toTargets} className={cn(seal, "mt-auto")}>
            <Swords className="size-5" />{targetsLabel(state.pick?.targetMode)}
          </button>
        </SpellDetail>
      )}
      {state.step === "targets" && (
        <>
          <div className="hud-sc text-xl font-bold">Цілі · {selected.name}</div>
          <div className="mt-3 space-y-2">
            {targets.map((t) => {
              const reachable = view.inRange(t);

              return (
                <button key={t.basicInfo.id} type="button" disabled={!reachable} onClick={() => actions.toggleTarget(t.basicInfo.id)} className={cn("flex h-14 w-full items-center gap-3 border px-3 text-left disabled:opacity-50", state.targetIds.includes(t.basicInfo.id) ? "border-[#7a2a1f] bg-[#7a2a1f]/10" : "border-[#2a2018]/20")}>
                  <Portrait participant={t} size={32} />
                  <span className="hud-sc font-bold">{t.basicInfo.name}</span>
                  {!reachable && <span className="ml-auto text-sm italic">Поза дальністю</span>}
                </button>
              );
            })}
          </div>
          {view.allCount > 0 && <div className="hud-sc mt-3 text-sm">на всіх: {view.allCount}</div>}
          {view.chain.length > 0 && <div className="hud-sc mt-3 text-sm">Ланцюг: {view.chain.map((p, i) => `${i + 1}. ${p.basicInfo.name}`).join(", ")}</div>}
          <button type="button" disabled={state.targetIds.length === 0} onClick={actions.confirmTargets} className={cn(seal, "mt-auto")}>Далі · кидки</button>
        </>
      )}
      {state.step === "rolls" && state.pick && (
        <>
          <SaveRolls targets={view.saveTargets} saves={state.saves} onChange={actions.setSave} />
          {state.pick.diceSlots.length > 0 && (
            <>
              <div className="hud-sc mt-4 text-lg font-bold">Кубики · {view.formulaOf(selected)}</div>
              <DamageDice slots={state.pick.diceSlots} values={state.damage} onChange={actions.setDamage} tone="parchment" />
            </>
          )}
          <div className="mt-auto grid grid-cols-[1.25fr_1fr] gap-2 pt-3">
            <AiRollButton onClick={actions.aiDamage} tone="parchment" />
            <button type="button" disabled={!rollsComplete(state)} onClick={actions.toSummary} className={seal}>Далі · підсумок</button>
          </div>
        </>
      )}
      {(state.step === "summary" || state.step === "submitting") && (
        <>
          <SpellSummary spell={selected} state={state} targets={targets} formula={view.formulaOf(selected)} targeting={view.definitionOf(selected).targeting} slotCost={view.slotCostLabel(selected)} />
          <button type="button" disabled={state.step === "submitting"} onClick={actions.submit} className={cn(seal, "mt-auto")}>
            {state.step === "submitting" ? <Loader2 className="size-5 animate-spin" /> : <><Sparkles className="size-5" />Застосувати</>}
          </button>
        </>
      )}
    </div>
  );

  const showDetail = state.step !== "book";

  return (
    <>
    {aiming && selected && <SpellAimPanel book={book} spellName={selected.name} />}
    <ResponsiveDialog open={open} onOpenChange={(o) => !o && actions.close()} title={showDetail && !wide ? "← До списку" : "Книга заклинань"} size="lg" className={cn(HUD_SURFACE, "max-w-[980px] border-none bg-[#3a2016] p-2.5 text-[#2a2018] shadow-[0_30px_80px_rgba(0,0,0,.9),inset_0_0_0_2px_#2a160f]")}>
      <SpellBookPages byLevel={byLevel} page={{ level: state.level, slotOf: view.slotLeft, onLevel: actions.setLevel }} pick={{ pickedId: state.pick?.spellId ?? null, onPick: actions.pick, formulaOf: view.formulaOf }} layout={{ wide, showDetail }} detail={detailPage || null} />
      {showDetail && !wide && canGoBack(state) && <button type="button" onClick={actions.back} className="hud-sc mt-2 h-10 w-full text-sm text-hud-bone">← Назад</button>}
    </ResponsiveDialog>
    </>
  );
}
