"use client";

import { useState } from "react";
import { Crosshair, Swords } from "lucide-react";

import { Breakdown } from "./Breakdown";
import { useProfile } from "./ProfileContext";
import { Section } from "./Section";

import { EmptyState } from "@/components/common/states";
import { ABILITY_SHORT_LABELS } from "@/lib/constants/abilities";
import { cn } from "@/lib/utils";
import { signed } from "@/lib/utils/format";
import type { SheetLine } from "@/types/characters";

function Row({ label, value, lines }: { label: string; value: string; lines?: SheetLine[] }) {
  const [open, setOpen] = useState(false);

  const expandable = !!lines && lines.length > 1;

  return (
    <div className="border-b border-[#2a2218] py-1.5 text-sm">
      <button type="button" disabled={!expandable} aria-expanded={expandable ? open : undefined} onClick={() => setOpen((v) => !v)} className="flex min-h-8 w-full items-center justify-between gap-3 text-left disabled:cursor-default">
        <span>{label}</span>
        <span className="tabular-nums text-[#efe5d2]">{value}</span>
      </button>
      {open && lines && <Breakdown lines={lines} />}
    </div>
  );
}

export function CombatTab() {
  const { sheet } = useProfile();

  const [openAttack, setOpenAttack] = useState<string | null>(null);

  return (
    <>
      <Section title="ХАРАКТЕРИСТИКИ">
        <div className="grid grid-cols-6 gap-1">
          {sheet.abilities.map((a) => (
            <div key={a.key} className={cn("min-w-0 rounded-lg border bg-[#1a140f] py-1 text-center", a.isPrimary ? "border-[#c9b37a] shadow-[inset_0_0_0_1px_#c9b37a]" : "border-[#4a3c2c]")}>
              <small className="block text-[10px] text-[#8f8473]">
                {ABILITY_SHORT_LABELS[a.key]}
                {a.isPrimary ? " ★" : ""}
              </small>
              <b className="block text-[17px] leading-5">{a.score}</b>
              <small className={cn("text-[11px]", a.isPrimary ? "text-[#c9b37a]" : "text-[#8f8473]")}>{signed(a.mod)}</small>
            </div>
          ))}
        </div>
        {sheet.primaryAbility && <p className="mt-1.5 text-xs text-[#8f8473]">★ основна характеристика: від неї влучання і шкода всіх атак</p>}
      </Section>
      <Section title="АТАКИ">
        {sheet.attacks.length === 0 ? (
          <EmptyState title="Немає зброї — атак поки немає" className="border-[#3a2e22] py-6 text-[#8f8473]" />
        ) : (
          sheet.attacks.map((a) => (
            <div key={a.id} className="mb-1.5 rounded-[10px] border border-[#4a3c2c] bg-[#1a140f] px-2.5 py-2">
              <button type="button" aria-expanded={openAttack === a.id} onClick={() => setOpenAttack((v) => (v === a.id ? null : a.id))} className="flex min-h-10 w-full flex-wrap items-center justify-between gap-x-2 text-left">
                <span className="flex min-w-0 items-center gap-1.5 truncate">
                  {a.kind === "ranged" ? <Crosshair className="size-4 shrink-0" /> : <Swords className="size-4 shrink-0" />}
                  {a.name}
                </span>
                <span className="shrink-0 whitespace-nowrap text-sm text-[#8f8473]">
                  <b className="text-lg text-[#efe5d2]">{signed(a.toHit.total)}</b> влуч · <b className="text-lg text-[#efe5d2]">≈{a.avgDamage.total}</b> шкода
                </span>
              </button>
              {openAttack === a.id && (
                <>
                  <p className="mt-2 text-[11px] uppercase text-[#c9b37a]">Влучання</p>
                  <Breakdown lines={a.toHit.lines} />
                  <p className="mt-2 text-[11px] uppercase text-[#c9b37a]">Середня шкода</p>
                  <Breakdown lines={a.avgDamage.lines} />
                </>
              )}
            </div>
          ))
        )}
      </Section>
      <Section title="ЗАХИСТ І ПАРАМЕТРИ">
        <Row label="AC" value={String(sheet.armorClass.total)} lines={sheet.armorClass.lines} />
        <Row label="Ініціатива" value={signed(sheet.initiative)} />
        <Row label="Швидкість" value={String(sheet.speed)} />
        <Row label="Мораль" value={signed(sheet.morale)} />
        <Row label="Цілей за атаку" value={sheet.targets.min === sheet.targets.max ? String(sheet.targets.max) : `${sheet.targets.min}–${sheet.targets.max}`} />
        {sheet.immunities.length > 0 && <Row label="Імунітети" value={sheet.immunities.join(", ")} />}
      </Section>
      <Section title="РЯТІВНІ КИДКИ">
        <ul className="grid grid-cols-2 gap-x-4 text-sm">
          {sheet.saves.map((s) => (
            <li key={s.key} className="flex justify-between gap-2 border-b border-[#2a2218] py-1">
              <span className="min-w-0 truncate">
                {s.proficient ? "● " : ""}
                {s.label}
              </span>
              <span className="tabular-nums">{signed(s.bonus)}</span>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="НАВИЧКИ">
        <ul className="grid grid-cols-2 gap-x-4 text-sm">
          {sheet.skills.map((s) => (
            <li key={s.key} className="flex justify-between gap-2 border-b border-[#2a2218] py-1">
              <span className="min-w-0 truncate">
                {s.proficient ? "● " : ""}
                {s.label}
              </span>
              <span className="tabular-nums">{signed(s.bonus)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-[#8f8473]">
          Пасивні: сприйняття {sheet.passives.perception} · розслідування {sheet.passives.investigation} · проникливість {sheet.passives.insight}
        </p>
        {(sheet.languages.length > 0 || sheet.proficiencies.length > 0) && (
          <p className="mt-1 text-xs text-[#8f8473]">
            {[sheet.languages.length ? `Мови: ${sheet.languages.join(", ")}` : null, sheet.proficiencies.length ? `Володіння: ${sheet.proficiencies.join(", ")}` : null].filter(Boolean).join(" · ")}
          </p>
        )}
      </Section>
    </>
  );
}
