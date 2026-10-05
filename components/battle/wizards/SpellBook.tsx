"use client";

import Image from "next/image";
import { Loader2, Sparkles, Swords } from "lucide-react";

import { AiRollButton, DamageDice, DiceGrid } from "./DiceInput";

import { metalClass, Portrait } from "@/components/battle/hud";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import type { useSpellBook } from "@/lib/hooks/battle";
import { useMediaQuery } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";
import { rollsComplete } from "@/lib/utils/battle/flows";
import { ROMAN, spellTier } from "@/lib/utils/battle/view";

type Book = ReturnType<typeof useSpellBook>;

const LEVELS = [0, 1, 2, 3, 4, 5] as const;

const CIRCLE = ["Замовляння", "Перше коло", "Друге коло", "Третє коло", "Четверте коло", "П'яте коло"];

const METAL = ["залізне", "бронзове", "срібне", "золоте", "міфрилове", "платинове"];

const seal = "hud-sc flex h-[52px] w-full items-center justify-center gap-3 bg-[#7a2a1f] text-lg tracking-[.08em] text-[#f3e7cc] shadow-[inset_0_0_0_1px_#a8473a,inset_0_0_0_3px_#7a2a1f,inset_0_0_0_4px_rgba(243,231,204,.35)] disabled:opacity-50";

export function SpellBook({ book }: { book: Book }) {
  const { state, byLevel, slots, selected, targets } = book;

  const wide = useMediaQuery("(min-width: 1024px)");

  const open = state.step !== "closed" && state.step !== "result";

  const slotOf = (l: number) => (l === 0 ? Infinity : slots.find((s) => s.level === l)?.current ?? 0);

  const ribbons = (
    <div className="absolute right-1.5 top-6 z-10 flex flex-col gap-1.5">
      {LEVELS.map((l) => (
        <button
          key={l}
          type="button"
          aria-label={`${ROMAN[l]} коло, слотів ${l === 0 ? "∞" : slotOf(l)}`}
          onClick={() => book.setLevel(l)}
          className={cn("hud-sc flex h-14 flex-col items-center justify-center gap-1 pb-1.5 text-[13px] [clip-path:polygon(0_0,100%_0,100%_100%,50%_86%,0_100%)]", metalClass(spellTier(l)), "metal-fill", state.level === l ? "-ml-2 w-10" : "w-8", l > 0 && slotOf(l) === 0 && "opacity-55 grayscale")}
        >
          {ROMAN[l]}
          <span className="font-sans text-[11px] opacity-85">{l === 0 ? "∞" : slotOf(l)}</span>
        </button>
      ))}
    </div>
  );

  const listPage = (
    <div className="px-5 pb-12 pt-4">
      <div className="text-[13px] italic text-[#7a6650]">Книга заклинань</div>
      <div className="hud-sc flex items-center gap-3 text-2xl font-bold leading-8">
        {CIRCLE[state.level]}
        <span className="font-sans text-[13px] font-normal italic tracking-normal text-[#6d7177]">{METAL[state.level]} коло</span>
      </div>
      <div className="my-1 h-px bg-[#2a2018]/35" />
      {(byLevel[state.level] ?? []).length === 0 && <p className="py-6 text-center italic text-[#7a6650]">На цьому колі заклинань немає</p>}
      {(byLevel[state.level] ?? []).map((s) => (
        <button key={s.id} type="button" onClick={() => book.pick(s)} className={cn("flex h-[72px] w-full items-center gap-3 border-b border-[#2a2018]/15 text-left", state.pick?.spellId === s.id && "-mx-3 w-[calc(100%+1.5rem)] bg-[#9c2a1d]/10 px-3 shadow-[inset_3px_0_0_#9c2a1d]")}>
          <span className="flex size-10 shrink-0 items-center justify-center border border-[#2a2018] bg-[#2a2018]/5">
            {s.icon ? <Image src={s.icon} alt="" width={26} height={26} className="size-[26px] object-contain" /> : <Sparkles className="size-5" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="hud-sc block truncate text-[17px] font-bold">{s.name}</span>
            <span className="block truncate text-sm italic text-[#6b5a45]">{[s.savingThrow && `рятівний кидок ${s.savingThrow.ability}`, s.hitCheck && "атака заклинанням", s.range].filter(Boolean).join(" · ")}</span>
          </span>
          {s.diceCount && s.diceType && <span className="w-11 text-right text-[15px] text-[#7a2a1f]">{s.diceCount}{s.diceType}</span>}
        </button>
      ))}
    </div>
  );

  const detailPage = selected && (
    <div className="relative flex h-full flex-col px-5 pb-5 pt-6">
      {state.step === "spell" && (
        <>
          <div className="flex items-center gap-4">
            <span className="flex size-16 items-center justify-center border border-[#2a2018] bg-[#7a2a1f]/10 text-[#7a2a1f]">
              {selected.icon ? <Image src={selected.icon} alt="" width={44} height={44} /> : <Sparkles className="size-10" />}
            </span>
            <div>
              <div className="hud-sc text-[26px] font-bold leading-[30px]">{selected.name}</div>
              <div className="text-sm italic text-[#7a6650]">{selected.spellGroup?.name ?? "Без школи"} · {CIRCLE[selected.level].toLowerCase()}{selected.concentration ? " · концентрація" : ""}</div>
            </div>
          </div>
          {selected.description && <p className="mt-4 text-[17px] leading-6 first-letter:float-left first-letter:pr-1.5 first-letter:pt-1 first-letter:font-[family-name:var(--font-hud-sc)] first-letter:text-[52px] first-letter:leading-[44px] first-letter:text-[#7a2a1f]">{selected.description}</p>}
          <div className="mt-4 grid grid-cols-2 border-t border-[#2a2018]/25">
            {[["Шкода", selected.diceCount && selected.diceType ? `${selected.diceCount}${selected.diceType} ${selected.damageElement ?? ""}` : "—"], ["Дальність", selected.range ?? "—"], ["Влучання", selected.hitCheck ? "атака заклинанням" : selected.savingThrow ? `рятівний ${selected.savingThrow.ability}` : "автоматично"], ["Тривалість", selected.duration ?? "миттєво"]].map(([a, b]) => (
              <div key={a} className="flex h-12 flex-col justify-center border-b border-[#2a2018]/15 odd:border-r odd:pr-3 even:pl-3">
                <span className="text-xs italic text-[#7a6650]">{a}</span>
                <span className="text-base">{b}</span>
              </div>
            ))}
          </div>
          <button type="button" disabled={selected.level > 0 && slotOf(selected.level) === 0} onClick={book.toTargets} className={cn(seal, "mt-auto")}>
            <Swords className="size-5" />{selected.type === "no_target" ? "Далі" : "Обрати цілі"}
          </button>
        </>
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
    <ResponsiveDialog open={open} onOpenChange={(o) => !o && book.close()} title={showDetail && !wide ? "← До списку" : "Книга заклинань"} size="lg" className="max-w-[980px] border-none bg-[#3a2016] p-2.5 text-[#2a2018] shadow-[0_30px_80px_rgba(0,0,0,.9),inset_0_0_0_2px_#2a160f]">
      <div className="relative pr-11">
        {ribbons}
        <div className={cn("hud-book relative min-h-[70dvh] bg-[#e9dec5] shadow-[inset_14px_0_18px_-10px_rgba(60,40,20,.55)]", wide && "grid grid-cols-2")}>
          {(wide || !showDetail) && listPage}
          {(wide || showDetail) && (detailPage ?? (wide && <div className="flex items-center justify-center italic text-[#7a6650]">Оберіть заклинання</div>))}
        </div>
      </div>
      {showDetail && !wide && <button type="button" onClick={book.back} className="hud-sc mt-2 h-10 w-full text-sm text-[#e6dccb]">← Назад</button>}
    </ResponsiveDialog>
  );
}
