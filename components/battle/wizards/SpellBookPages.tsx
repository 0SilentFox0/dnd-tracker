"use client";

import { type ReactNode, useState } from "react";
import { Sparkles } from "lucide-react";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { spellLevelMetal } from "@/components/hud";
import { spellLevelName, spellLevelRoman, spellSchoolColor } from "@/lib/constants/spells";
import { cn } from "@/lib/utils";
import { groupSpellsBySchool } from "@/lib/utils/spells/group-by-level";
import { costLabel, resolutionLabel, targetingLabel } from "@/lib/utils/spells/model/labels";
import type { BookSpell } from "@/types/spells";

const LEVELS = [0, 1, 2, 3, 4, 5] as const;

const PAPER = "hud-book relative bg-[#e9dec5] text-[#2a2018] shadow-[inset_14px_0_18px_-10px_rgba(60,40,20,.55)]";

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
  formulaOf?: (spell: BookSpell) => string;
}

const ALL = "__all";

function SchoolTabs({ schools, active, countOf, onPick }: { schools: string[]; active: string; countOf: (name: string) => number; onPick: (name: string) => void }) {
  const tabs = [{ name: ALL, label: "Усі", color: "#2a2018" }, ...schools.map((name) => ({ name, label: name, color: spellSchoolColor(name) }))];

  return (
    <div role="tablist" aria-label="Школи магії" className="sticky top-0 z-10 -mx-5 -mt-4 mb-2 flex flex-wrap items-start gap-1.5 bg-[#e9dec5] px-5 pb-1">
      {tabs.map((t) => {
        const count = t.name === ALL ? undefined : countOf(t.name);

        return (
          <button
            key={t.name}
            type="button"
            role="tab"
            aria-selected={active === t.name}
            onClick={() => onPick(t.name)}
            style={{ backgroundColor: t.color }}
            className={cn(
              "hud-sc flex items-start justify-center px-3 pt-1 text-[13px] font-bold text-white [clip-path:polygon(0_0,100%_0,100%_100%,50%_82%,0_100%)] [text-shadow:0_1px_2px_rgba(0,0,0,.6)]",
              active === t.name ? "h-11" : "h-8 hover:h-9",
              count === 0 && "opacity-40",
            )}
          >
            {t.label}{count !== undefined && <span className="ml-1 font-sans text-[11px] opacity-85">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function SpellBookPages({ byLevel, slotOf, level, pickedId, wide, showDetail, onLevel, onPick, detail, formulaOf }: SpellBookPagesProps) {
  const [school, setSchool] = useState(ALL);

  const schools = groupSpellsBySchool(Object.values(byLevel).flat()).map((g) => g.name);

  const groups = groupSpellsBySchool(byLevel[level] ?? []);

  const shown = school === ALL ? groups : groups.filter((g) => g.name === school);

  return (
    <div className="relative pr-11">
      <div className="absolute bottom-0 right-1.5 top-6 z-10">
        <div className="sticky top-6 flex flex-col gap-1.5">
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
      </div>
      <div className={cn(PAPER, "min-h-[70dvh]", wide && "grid grid-cols-2")}>
        {(wide || !showDetail) && (
          <div className="px-5 pb-12 pt-4">
            {schools.length > 1 && <SchoolTabs schools={schools} active={school} countOf={(name) => groups.find((g) => g.name === name)?.spells.length ?? 0} onPick={setSchool} />}
            <div className="text-[13px] italic text-[#7a6650]">Книга заклинань</div>
            <div className="hud-sc flex items-center gap-3 text-2xl font-bold leading-8">
              {spellLevelName(level)}
            </div>
            <div className="my-1 h-px bg-[#2a2018]/35" />
            {shown.length === 0 && <p className="py-6 text-center italic text-[#7a6650]">{school === ALL ? "На цьому колі заклинань немає" : "На цьому колі заклинань цієї школи немає"}</p>}
            {shown.map((g) => (
              <section key={g.name} className="mt-3 first:mt-1">
                {school === ALL && <div className="hud-sc flex items-center gap-2 text-sm font-bold tracking-[.06em]" style={{ color: spellSchoolColor(g.name) }}>
                  <span className="size-2.5 rotate-45" style={{ backgroundColor: spellSchoolColor(g.name) }} />
                  {g.name}
                  <span className="h-px flex-1 opacity-40" style={{ backgroundColor: spellSchoolColor(g.name) }} />
                </div>}
                {g.spells.map((s) => (
                  <button key={s.id} type="button" onClick={() => onPick(s)} className={cn("flex w-full items-center gap-3 border-b border-[#2a2018]/15 text-left", wide ? "h-[84px]" : "h-[72px]", pickedId === s.id && "-mx-3 w-[calc(100%+1.5rem)] bg-[#9c2a1d]/10 px-3 shadow-[inset_3px_0_0_#9c2a1d]")}>
                    <span className={cn("flex shrink-0 items-center justify-center border-2 bg-[#2a2018]/5", wide ? "size-16" : "size-11")} style={{ borderColor: spellSchoolColor(g.name) }}>
                      {s.icon ? <OptimizedImage src={s.icon} alt="" width={wide ? 52 : 30} height={wide ? 52 : 30} className={cn("object-contain", wide ? "size-[52px]" : "size-[30px]")} /> : <Sparkles className="size-5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="hud-sc block truncate text-[17px] font-bold">{s.name}</span>
                      <span className="block truncate text-sm italic text-[#6b5a45]">{[s.resolution?.kind === "save" && "рятівний кидок", s.targeting && targetingLabel(s.targeting), s.cost === "bonusAction" && "бонусна дія"].filter(Boolean).join(" · ")}</span>
                    </span>
                    {formulaOf && s.dice ? <span className="w-20 text-right text-[15px] text-[#7a2a1f]">{formulaOf(s)}</span> : null}
                  </button>
                ))}
              </section>
            ))}
          </div>
        )}
        {wide ? (
          <div className="sticky top-0 flex min-h-[70dvh] flex-col self-start">
            {detail ?? <div className="flex flex-1 items-center justify-center italic text-[#7a6650]">Оберіть заклинання</div>}
          </div>
        ) : (
          showDetail && detail
        )}
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

export function SpellDetail({ spell, formula, children }: { spell: BookSpell; formula?: string; children?: ReactNode }) {
  return (
    <>
      <div className="flex items-center gap-4">
        <span className="flex size-16 items-center justify-center border border-[#2a2018] bg-[#7a2a1f]/10 text-[#7a2a1f]">
          {spell.icon ? <OptimizedImage src={spell.icon} alt="" width={44} height={44} /> : <Sparkles className="size-10" />}
        </span>
        <div>
          <div className="hud-sc text-[26px] font-bold leading-[30px]">{spell.name}</div>
          <div className="text-sm italic text-[#7a6650]">{spell.spellGroup?.name ?? "Без школи"} · {spellLevelName(spell.level).toLowerCase()}</div>
        </div>
      </div>
      {spell.description && (
        <p className="mt-4 border-l-4 pl-4 text-[19px] font-medium italic leading-7 text-[#3b2716]" style={{ borderColor: spellSchoolColor(spell.spellGroup?.name) }}>
          {spell.description}
        </p>
      )}
      <div className="mt-4 grid grid-cols-2 border-t border-[#2a2018]/25">
        {[["Сила", formula ?? (spell.dice ? `${spell.dice} баз. кубиків` : "—")], ["Ціль", spell.targeting ? targetingLabel(spell.targeting) : "—"], ["Перевірка", spell.resolution ? resolutionLabel(spell.resolution) : "автоматично"], ["Вартість", costLabel(spell.cost ?? "action")]].map(([a, b]) => (
          <div key={a} className="flex h-12 flex-col justify-center border-b border-[#2a2018]/15 odd:border-r odd:pr-3 even:pl-3">
            <span className="text-xs italic text-[#7a6650]">{a}</span>
            <span className="text-base">{b}</span>
          </div>
        ))}
      </div>
      {spell.appearanceDescription && <p className="mt-5 text-[17px] leading-6 first-letter:float-left first-letter:pr-1.5 first-letter:pt-1 first-letter:font-[family-name:var(--font-hud-sc)] first-letter:text-[52px] first-letter:leading-[44px] first-letter:text-[#7a2a1f]">{spell.appearanceDescription}</p>}
      {children}
    </>
  );
}
