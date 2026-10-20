"use client";

import { useRef, useState } from "react";
import Link from "next/link";

import { SpellArena } from "./SpellArena";
import { SpellCard } from "./SpellCard";
import { SpellLegend } from "./SpellLegend";
import type { SpellArenaHandle, SpellCardData } from "./types";

import "@/components/battle/hud/battle-hud.css";
import "@/components/battle/fx/fx.css";
import "@/components/battle/dev/fx-lab.css";
import { HudChipTabs, HudPage, HudPageHeader } from "@/components/hud/page";
import { SpellBattlePreview } from "@/components/spells/preview/SpellBattlePreview";

const ALL = "all";

const bySchool = (spells: SpellCardData[]) => {
  const groups = new Map<string, SpellCardData[]>();

  for (const s of spells) groups.set(s.school, [...(groups.get(s.school) ?? []), s]);

  return [...groups].map(([school, list]) => ({ school, spells: [...list].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, "uk")) }));
};

export function FxSpells({ spells }: { spells: SpellCardData[] }) {
  const arena = useRef<SpellArenaHandle>(null);

  const [school, setSchool] = useState(ALL);

  const groups = bySchool(spells);

  const tabs = [{ key: ALL, label: "Усі" }, ...groups.map((g) => ({ key: g.school, label: g.school }))];

  const [picked, setPicked] = useState<SpellCardData | null>(null);

  const [bookLook, setBookLook] = useState(true);

  const play = (spell: SpellCardData) => {
    setPicked(spell);
    arena.current?.play(spell);
  };

  return (
    <div className="battle-hud min-h-dvh">
      <HudPage className="max-w-screen-xl">
        <HudPageHeader
          title="Заклинання та ефекти"
          subtitle={`Усі ${spells.length} заклинань бібліотеки: що вони роблять і які анімацію, рамку та аури показує бій.`}
          actions={
            <Link href="/dev/fx-lab" className="flex h-9 items-center rounded-full px-4 text-sm text-hud-bone shadow-[inset_0_0_0_1px_var(--color-hud-gold)]">
              Лабораторія анімацій
            </Link>
          }
        >
          <HudChipTabs ariaLabel="Школа" items={tabs.map((t) => ({ ...t, active: t.key === school, onSelect: () => setSchool(t.key) }))} />
        </HudPageHeader>
        <SpellLegend />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
          <div className="lg:sticky lg:top-[calc(var(--app-header-h)+1rem)] lg:order-2">
            <SpellArena ref={arena} />
            {picked && (
              <div data-testid="fx-spells-book" className="hud-book mt-3 rounded-xl bg-[#e9dec5] p-4 text-[#2a2018]">
                <p className="text-[13px] italic text-[#7a6650]">Так закляття виглядає в книзі магій і довіднику</p>
                <p className="hud-sc text-lg font-bold">{picked.name}</p>
                <label className="mt-1 flex items-center gap-2 text-[13px]">
                  <input type="checkbox" checked={bookLook} onChange={(e) => setBookLook(e.target.checked)} />
                  Вигляд у книзі
                </label>
                <SpellBattlePreview key={`${picked.key}-${bookLook}`} spell={picked.previewSpell} variant={bookLook ? "book" : "hud"} className="mt-3" />
              </div>
            )}
          </div>
          <div className="space-y-6 lg:order-1">
            {groups
              .filter((g) => school === ALL || g.school === school)
              .map((g) => (
                <section key={g.school} aria-label={g.school}>
                  <h2 className="hud-sc mb-2 text-lg font-bold text-[var(--ink)]">
                    {g.school} <span className="text-sm font-normal text-hud-muted">· {g.spells.length}</span>
                  </h2>
                  <div className="space-y-2">
                    {g.spells.map((s) => (
                      <SpellCard key={s.key} spell={s} onPlay={play} />
                    ))}
                  </div>
                </section>
              ))}
          </div>
        </div>
      </HudPage>
    </div>
  );
}
