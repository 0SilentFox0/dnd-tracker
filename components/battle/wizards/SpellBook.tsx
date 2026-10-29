"use client";

import { useTranslations } from "next-intl";
import { Swords } from "lucide-react";

import { CastSourceSelect } from "./spellbook/CastSourceSelect";
import { SlotSelect } from "./spellbook/SlotSelect";
import { SpellAimPanel } from "./spellbook/SpellAimPanel";
import { SpellCastDialog } from "./spellbook/SpellCastDialog";

import { HUD_SURFACE } from "@/components/hud";
import { SpellBookPages, SpellDetail } from "@/components/spells/book/SpellBookPages";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import type { useSpellBook } from "@/lib/hooks/battle";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/hooks/common";
import { useText } from "@/lib/i18n/use-text";
import { cn } from "@/lib/utils";
import { canGoBack, type SpellTargetMode } from "@/lib/utils/battle/flows";
import type { LogLine } from "@/types/text";

type Book = ReturnType<typeof useSpellBook>;

const seal = "hud-sc flex h-[52px] w-full items-center justify-center gap-3 bg-[#7a2a1f] text-lg tracking-[.08em] text-[#f3e7cc] shadow-[inset_0_0_0_1px_#a8473a,inset_0_0_0_3px_#7a2a1f,inset_0_0_0_4px_rgba(243,231,204,.35)] disabled:opacity-50";

const TARGETS_LABEL: Partial<Record<SpellTargetMode, "next" | "template">> = { none: "next", all: "next", template: "template" };

const targetsKey = (mode: SpellTargetMode | undefined) => (mode && TARGETS_LABEL[mode]) ?? "pick";

export function SpellBook({ book }: { book: Book }) {
  const tw = useTranslations("battleWizards.spell.book");

  const tc = useTranslations("common.actions");

  const text = useText();

  const { state, view, actions } = book;

  const { byLevel, selected } = view;

  const wide = useMediaQuery(DESKTOP_QUERY);

  const open = state.step === "book" || state.step === "spell";

  const widening = selected && view.wideningOf(selected);

  const pending = view.pendingCast?.spellId === selected?.id ? view.pendingCast : undefined;

  const preparing = !view.free && selected?.cost === "long" && (pending?.remainingRounds ?? view.timing?.rounds ?? 0) > 1;

  const detailPage = selected && (
    <div className="relative flex h-full flex-1 flex-col px-5 pb-5 pt-6">
      <SpellDetail spell={selected} formula={view.formulaOf(selected)}>
        {view.timing?.trigger && <p className="mt-3 text-sm">{tw("reaction", { trigger: view.timing.trigger })}</p>}
        {selected.cost === "long" && <p className="mt-3 text-sm">{tw("castingRounds", { rounds: pending?.remainingRounds ?? view.timing?.rounds ?? 0 })}</p>}
        {state.error && <p role="alert" className="text-sm text-red-700">{text(state.error)}</p>}
        {view.grantLabel(selected) && <p className="mt-3 text-sm font-semibold">{text(view.grantLabel(selected) as LogLine)}</p>}
        {widening && <p role="note" className="mt-4 border-l-4 border-[#7a2a1f] bg-[#7a2a1f]/10 py-2 pl-3 pr-2 text-base font-semibold text-[#7a2a1f]">{text(widening.note)}</p>}
        {state.step === "spell" && <div className="mt-4">{view.sourceOptions.length > 0 ? <CastSourceSelect book={book} /> : <SlotSelect book={book} />}</div>}
        <button type="button" disabled={selected.executionMode === "manual" || (selected.level > 0 && !view.grantLabel(selected) && (view.noSlot(selected) || (!view.slot.options.length && view.slotLeft(selected.level) === 0))) || view.costUsed(selected)} onClick={preparing ? () => void actions.prepareCast() : actions.toTargets} className={cn(seal, "mt-auto")}>
          <Swords className="size-5" />{preparing ? pending ? tw("continueCasting") : tw("startCasting") : tw(`targets.${targetsKey(state.pick?.targetMode)}`)}
        </button>
        {selected.executionMode !== "manual" && pending && view.canFastForward && preparing && <button type="button" className="mt-2 text-sm underline" disabled={view.costUsed(selected)} onClick={actions.completeLong}>{tw("fastForward")}</button>}
        {view.pendingCast && <button type="button" className="mt-2 text-sm underline" onClick={() => void actions.prepareCast(true)}>{tw("cancelCasting")}</button>}
      </SpellDetail>
    </div>
  );

  const showDetail = state.step === "spell";

  return (
    <>
      {view.mapTargeting && selected && <SpellAimPanel book={book} spellName={selected.name} />}
      <SpellCastDialog book={book} />
    <ResponsiveDialog open={open} onOpenChange={(o) => !o && actions.close()} title={showDetail && !wide ? `← ${tw("toList")}` : tw("title")} size="lg" className={cn(HUD_SURFACE, "max-w-[980px] border-none bg-[#3a2016] p-2.5 text-[#2a2018] shadow-[0_30px_80px_rgba(0,0,0,.9),inset_0_0_0_2px_#2a160f]")}>
      <SpellBookPages byLevel={byLevel} page={{ level: state.level, slotOf: view.slotLeft, onLevel: actions.setLevel }} pick={{ pickedId: state.pick?.spellId ?? null, onPick: actions.pick, formulaOf: view.formulaOf, badgeOf: (s) => [view.grantLabel(s), view.wideningOf(s)?.badge].filter(Boolean).map((l) => text(l as LogLine)).join(" · ") || undefined }} layout={{ wide, showDetail }} detail={detailPage || null} />
      {showDetail && !wide && canGoBack(state) && <button type="button" onClick={actions.back} className="hud-sc mt-2 h-10 w-full text-sm text-hud-bone">← {tc("back")}</button>}
    </ResponsiveDialog>
    </>
  );
}
