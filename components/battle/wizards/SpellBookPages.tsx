"use client";

import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { spellLevelMetal } from "@/components/hud";
import { spellLevelName, spellLevelRoman } from "@/lib/constants/spells";
import { cn } from "@/lib/utils";
import type { BookSpell } from "@/types/spells";

const LEVELS = [0, 1, 2, 3, 4, 5] as const;

const PAPER = "hud-book relative bg-[#e9dec5] text-[#2a2018] shadow-[inset_14px_0_18px_-10px_rgba(60,40,20,.55)]";

const METAL = ["залізне", "бронзове", "срібне", "золоте", "міфрилове", "платинове"];

export interface SpellBookPagesProps {
  byLevel: Record<number, BookSpell[]>;
  slotOf: (level: number) => number;
  level: number;
  pickedId: string | null;
  wide: boolean;
  showDetail: boolean;
  onLevel: (level: number) => void;
  onPick: (spell: BookSpell) => void;
  detail: ReactNode;
}

export function SpellBookPages({ byLevel, slotOf, level, pickedId, wide, showDetail, onLevel, onPick, detail }: SpellBookPagesProps) {
  return (
    <div className="relative pr-11">
      <div className="absolute right-1.5 top-6 z-10 flex flex-col gap-1.5">
        {LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            aria-label={`${spellLevelRoman(l)} коло, слотів ${l === 0 ? "∞" : slotOf(l)}`}
            onClick={() => onLevel(l)}
            className={cn("hud-sc flex h-14 flex-col items-center justify-center gap-1 pb-1.5 text-[13px] [clip-path:polygon(0_0,100%_0,100%_100%,50%_86%,0_100%)]", spellLevelMetal(l), "metal-fill", level === l ? "-ml-2 w-10" : "w-8", l > 0 && slotOf(l) === 0 && "opacity-55 grayscale")}
          >
            {spellLevelRoman(l)}
            <span className="font-sans text-[11px] opacity-85">{l === 0 ? "∞" : slotOf(l)}</span>
          </button>
        ))}
      </div>
      <div className={cn(PAPER, "min-h-[70dvh]", wide && "grid grid-cols-2")}>
        {(wide || !showDetail) && (
          <div className="px-5 pb-12 pt-4">
            <div className="text-[13px] italic text-[#7a6650]">Книга заклинань</div>
            <div className="hud-sc flex items-center gap-3 text-2xl font-bold leading-8">
              {spellLevelName(level)}
              <span className="font-sans text-[13px] font-normal italic tracking-normal text-[#6d7177]">{METAL[level]} коло</span>
            </div>
            <div className="my-1 h-px bg-[#2a2018]/35" />
            {(byLevel[level] ?? []).length === 0 && <p className="py-6 text-center italic text-[#7a6650]">На цьому колі заклинань немає</p>}
            {(byLevel[level] ?? []).map((s) => (
              <button key={s.id} type="button" onClick={() => onPick(s)} className={cn("flex h-[72px] w-full items-center gap-3 border-b border-[#2a2018]/15 text-left", pickedId === s.id && "-mx-3 w-[calc(100%+1.5rem)] bg-[#9c2a1d]/10 px-3 shadow-[inset_3px_0_0_#9c2a1d]")}>
                <span className="flex size-10 shrink-0 items-center justify-center border border-[#2a2018] bg-[#2a2018]/5">
                  {s.icon ? <OptimizedImage src={s.icon} alt="" width={26} height={26} className="size-[26px] object-contain" /> : <Sparkles className="size-5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="hud-sc block truncate text-[17px] font-bold">{s.name}</span>
                  <span className="block truncate text-sm italic text-[#6b5a45]">{[s.savingThrow && `рятівний кидок ${s.savingThrow.ability}`, s.hitCheck && "атака заклинанням", s.range].filter(Boolean).join(" · ")}</span>
                </span>
                {s.diceCount && s.diceType && <span className="w-11 text-right text-[15px] text-[#7a2a1f]">{s.diceCount}{s.diceType}</span>}
              </button>
            ))}
          </div>
        )}
        {(wide || showDetail) && (detail ?? (wide && <div className="flex items-center justify-center italic text-[#7a6650]">Оберіть заклинання</div>))}
      </div>
    </div>
  );
}

export function EmptySpellBook({ text }: { text: string }) {
  return (
    <div className={cn(PAPER, "flex min-h-56 flex-col items-center justify-center gap-2 px-6 py-10 text-center")}>
      <div className="text-[13px] italic text-[#7a6650]">Книга заклинань</div>
      <p className="hud-sc text-lg leading-6">{text}</p>
    </div>
  );
}

export function SpellDetail({ spell, children }: { spell: BookSpell; children?: ReactNode }) {
  return (
    <>
      <div className="flex items-center gap-4">
        <span className="flex size-16 items-center justify-center border border-[#2a2018] bg-[#7a2a1f]/10 text-[#7a2a1f]">
          {spell.icon ? <OptimizedImage src={spell.icon} alt="" width={44} height={44} /> : <Sparkles className="size-10" />}
        </span>
        <div>
          <div className="hud-sc text-[26px] font-bold leading-[30px]">{spell.name}</div>
          <div className="text-sm italic text-[#7a6650]">{spell.spellGroup?.name ?? "Без школи"} · {spellLevelName(spell.level).toLowerCase()}{spell.concentration ? " · концентрація" : ""}</div>
        </div>
      </div>
      {spell.description && <p className="mt-4 text-[17px] leading-6 first-letter:float-left first-letter:pr-1.5 first-letter:pt-1 first-letter:font-[family-name:var(--font-hud-sc)] first-letter:text-[52px] first-letter:leading-[44px] first-letter:text-[#7a2a1f]">{spell.description}</p>}
      <div className="mt-4 grid grid-cols-2 border-t border-[#2a2018]/25">
        {[["Шкода", spell.diceCount && spell.diceType ? `${spell.diceCount}${spell.diceType} ${spell.damageElement ?? ""}` : "—"], ["Дальність", spell.range ?? "—"], ["Влучання", spell.hitCheck ? "атака заклинанням" : spell.savingThrow ? `рятівний ${spell.savingThrow.ability}` : "автоматично"], ["Тривалість", spell.duration ?? "миттєво"]].map(([a, b]) => (
          <div key={a} className="flex h-12 flex-col justify-center border-b border-[#2a2018]/15 odd:border-r odd:pr-3 even:pl-3">
            <span className="text-xs italic text-[#7a6650]">{a}</span>
            <span className="text-base">{b}</span>
          </div>
        ))}
      </div>
      {children}
    </>
  );
}
