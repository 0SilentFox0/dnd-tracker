"use client";

import { useRef, useState } from "react";
import Link from "next/link";

import { SpellArena } from "./SpellArena";
import { SpellCard } from "./SpellCard";
import { SpellLegend } from "./SpellLegend";
import type { SpellArenaHandle, SpellCardData } from "./types";

import "@/components/battle/hud/battle-hud.css";
import "@/components/battle/fx/fx.css";
import "../fx-lab.css";
import { HudChipTabs, HudPage, HudPageHeader } from "@/components/hud/page";

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

  const play = (spell: SpellCardData) => arena.current?.play(spell);

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
