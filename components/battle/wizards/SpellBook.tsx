"use client";

import { Swords } from "lucide-react";

import { SlotSelect } from "./spellbook/SlotSelect";
import { SpellAimPanel } from "./spellbook/SpellAimPanel";
import { SpellCastDialog } from "./spellbook/SpellCastDialog";

import { HUD_SURFACE } from "@/components/hud";
import { SpellBookPages, SpellDetail } from "@/components/spells/book/SpellBookPages";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import type { useSpellBook } from "@/lib/hooks/battle";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";
import { canGoBack, type SpellTargetMode } from "@/lib/utils/battle/flows";

type Book = ReturnType<typeof useSpellBook>;

const seal = "hud-sc flex h-[52px] w-full items-center justify-center gap-3 bg-[#7a2a1f] text-lg tracking-[.08em] text-[#f3e7cc] shadow-[inset_0_0_0_1px_#a8473a,inset_0_0_0_3px_#7a2a1f,inset_0_0_0_4px_rgba(243,231,204,.35)] disabled:opacity-50";

const TARGETS_LABEL: Partial<Record<SpellTargetMode, string>> = { none: "Далі", all: "Далі", template: "Навести на карті" };

const targetsLabel = (mode: SpellTargetMode | undefined) => (mode && TARGETS_LABEL[mode]) ?? "Обрати цілі";

export function SpellBook({ book }: { book: Book }) {
  const { state, view, actions } = book;

  const { byLevel, selected } = view;

  const wide = useMediaQuery(DESKTOP_QUERY);

  const open = state.step === "book" || state.step === "spell";

  const widening = selected && view.wideningOf(selected);

  const detailPage = selected && (
    <div className="relative flex h-full flex-1 flex-col px-5 pb-5 pt-6">
      <SpellDetail spell={selected} formula={view.formulaOf(selected)}>
        {view.grantLabel(selected) && <p className="mt-3 text-sm font-semibold">{view.grantLabel(selected)}</p>}
        {widening && <p role="note" className="mt-4 border-l-4 border-[#7a2a1f] bg-[#7a2a1f]/10 py-2 pl-3 pr-2 text-base font-semibold text-[#7a2a1f]">{widening.note}</p>}
        {state.step === "spell" && <div className="mt-4"><SlotSelect book={book} /></div>}
        <button type="button" disabled={(selected.level > 0 && !view.grantLabel(selected) && (view.noSlot(selected) || (!view.slot.options.length && view.slotLeft(selected.level) === 0))) || view.costUsed(selected)} onClick={actions.toTargets} className={cn(seal, "mt-auto")}>
          <Swords className="size-5" />{targetsLabel(state.pick?.targetMode)}
        </button>
      </SpellDetail>
    </div>
  );

  const showDetail = state.step === "spell";

  return (
    <>
      {view.mapTargeting && selected && <SpellAimPanel book={book} spellName={selected.name} />}
      <SpellCastDialog book={book} />
    <ResponsiveDialog open={open} onOpenChange={(o) => !o && actions.close()} title={showDetail && !wide ? "← До списку" : "Книга заклинань"} size="lg" className={cn(HUD_SURFACE, "max-w-[980px] border-none bg-[#3a2016] p-2.5 text-[#2a2018] shadow-[0_30px_80px_rgba(0,0,0,.9),inset_0_0_0_2px_#2a160f]")}>
      <SpellBookPages byLevel={byLevel} page={{ level: state.level, slotOf: view.slotLeft, onLevel: actions.setLevel }} pick={{ pickedId: state.pick?.spellId ?? null, onPick: actions.pick, formulaOf: view.formulaOf, badgeOf: (s) => [view.grantLabel(s), view.wideningOf(s)?.badge].filter(Boolean).join(" · ") || undefined }} layout={{ wide, showDetail }} detail={detailPage || null} />
      {showDetail && !wide && canGoBack(state) && <button type="button" onClick={actions.back} className="hud-sc mt-2 h-10 w-full text-sm text-hud-bone">← Назад</button>}
    </ResponsiveDialog>
    </>
  );
}
