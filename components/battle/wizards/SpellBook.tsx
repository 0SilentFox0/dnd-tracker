"use client";

import { Loader2, Sparkles, Swords } from "lucide-react";

import { AiRollButton, DamageDice, DiceGrid } from "./DiceInput";
import { SpellBookPages, SpellDetail } from "./SpellBookPages";

import { Portrait } from "@/components/battle/hud";
import { HUD_SURFACE } from "@/components/hud";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import type { useSpellBook } from "@/lib/hooks/battle";
import { useMediaQuery } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";
import { rollsComplete } from "@/lib/utils/battle/flows";
import { ROMAN } from "@/lib/utils/battle/view";

type Book = ReturnType<typeof useSpellBook>;

const seal = "hud-sc flex h-[52px] w-full items-center justify-center gap-3 bg-[#7a2a1f] text-lg tracking-[.08em] text-[#f3e7cc] shadow-[inset_0_0_0_1px_#a8473a,inset_0_0_0_3px_#7a2a1f,inset_0_0_0_4px_rgba(243,231,204,.35)] disabled:opacity-50";

export function SpellBook({ book }: { book: Book }) {
  const { state, byLevel, slots, selected, targets } = book;

  const wide = useMediaQuery("(min-width: 1024px)");

  const open = state.step !== "closed" && state.step !== "result";

  const slotOf = (l: number) => (l === 0 ? Infinity : slots.find((s) => s.level === l)?.current ?? 0);

  const detailPage = selected && (
    <div className="relative flex h-full flex-col px-5 pb-5 pt-6">
      {state.step === "spell" && (
        <SpellDetail spell={selected}>
          <button type="button" disabled={selected.level > 0 && slotOf(selected.level) === 0} onClick={book.toTargets} className={cn(seal, "mt-auto")}>
            <Swords className="size-5" />{selected.type === "no_target" ? "Далі" : "Обрати цілі"}
          </button>
        </SpellDetail>
      )}
      {state.step === "targets" && (
        <>
          <div className="hud-sc text-xl font-bold">Цілі · {selected.name}</div>
          <div className="mt-3 space-y-2">
            {targets.map((t) => (
              <button key={t.basicInfo.id} type="button" onClick={() => book.toggleTarget(t.basicInfo.id)} className={cn("flex h-14 w-full items-center gap-3 border px-3 text-left", state.targetIds.includes(t.basicInfo.id) ? "border-[#7a2a1f] bg-[#7a2a1f]/10" : "border-[#2a2018]/20")}>
                <Portrait participant={t} size={32} />
                <span className="hud-sc font-bold">{t.basicInfo.name}</span>
              </button>
            ))}
          </div>
          <button type="button" disabled={state.targetIds.length === 0} onClick={book.confirmTargets} className={cn(seal, "mt-auto")}>Далі · кидки</button>
        </>
      )}
      {state.step === "rolls" && state.pick && (
        <>
          {state.pick.needsHit && (
            <>
              <div className="hud-sc text-lg font-bold">Влучання · d20</div>
              <DiceGrid sides={20} value={state.hitRoll} onPick={book.setHit} />
            </>
          )}
          {state.pick.needsSaves && state.targetIds.map((id) => {
            const t = targets.find((x) => x.basicInfo.id === id);

            return (
              <label key={id} className="mt-3 flex items-center justify-between gap-3 text-sm">
                Рятівний кидок · {t?.basicInfo.name}
                <input aria-label={`Рятівний кидок ${t?.basicInfo.name}`} inputMode="numeric" className="h-10 w-16 border border-[#2a2018]/30 bg-transparent text-center" value={state.saves[id] ?? ""} onChange={(e) => { const n = parseInt(e.target.value, 10);

 if (n >= 1 && n <= 20) book.setSave(id, n); }} />
              </label>
            );
          })}
          {state.pick.diceSlots.length > 0 && (
            <>
              <div className="hud-sc mt-4 text-lg font-bold">Шкода</div>
              <DamageDice slots={state.pick.diceSlots} values={state.damage} onChange={book.setDamage} />
            </>
          )}
          <div className="mt-auto grid grid-cols-[1.25fr_1fr] gap-2 pt-3">
            <AiRollButton onClick={() => { if (state.pick?.needsHit && !state.hitRoll) book.aiHit();

 book.aiDamage(); }} />
            <button type="button" disabled={!rollsComplete(state)} onClick={book.toSummary} className={seal}>Далі · підсумок</button>
          </div>
        </>
      )}
      {(state.step === "summary" || state.step === "submitting") && (
        <>
          <div className="hud-sc text-xl font-bold">{selected.name}</div>
          <div className="mt-2 text-[15px]">
            {state.targetIds.length > 0 && <p>Цілі: {state.targetIds.map((id) => targets.find((t) => t.basicInfo.id === id)?.basicInfo.name).join(", ")}</p>}
            {state.hitRoll && <p>Влучання: d20 = {state.hitRoll}</p>}
            {state.damage.length > 0 && <p>Кубики шкоди: {state.damage.join(" + ")} = {state.damage.reduce<number>((a, b) => a + (b ?? 0), 0)}</p>}
            <p className="mt-2 text-sm italic text-[#7a6650]">Остаточну шкоду порахує бій з урахуванням захисту цілей.</p>
            {selected.level > 0 && <p className="text-sm italic text-[#7a6650]">Витратить слот {ROMAN[selected.level]} кола.</p>}
          </div>
          {state.error && <p className="mt-2 text-sm text-[#9c2a1d]">{state.error}</p>}
          <button type="button" disabled={state.step === "submitting"} onClick={book.submit} className={cn(seal, "mt-auto")}>
            {state.step === "submitting" ? <Loader2 className="size-5 animate-spin" /> : <><Sparkles className="size-5" />Застосувати</>}
          </button>
        </>
      )}
    </div>
  );

  const showDetail = state.step !== "book";

  return (
    <ResponsiveDialog open={open} onOpenChange={(o) => !o && book.close()} title={showDetail && !wide ? "← До списку" : "Книга заклинань"} size="lg" className={cn(HUD_SURFACE, "max-w-[980px] border-none bg-[#3a2016] p-2.5 text-[#2a2018] shadow-[0_30px_80px_rgba(0,0,0,.9),inset_0_0_0_2px_#2a160f]")}>
      <SpellBookPages byLevel={byLevel} slotOf={slotOf} level={state.level} pickedId={state.pick?.spellId ?? null} wide={wide} showDetail={showDetail} onLevel={book.setLevel} onPick={book.pick} detail={detailPage || null} />
      {showDetail && !wide && <button type="button" onClick={book.back} className="hud-sc mt-2 h-10 w-full text-sm text-[#e6dccb]">← Назад</button>}
    </ResponsiveDialog>
  );
}
