"use client";

import { useState } from "react";
import Link from "next/link";
import { Play } from "lucide-react";

import { FxLabPanel } from "./FxLabPanel";

import "@/components/battle/hud/battle-hud.css";
import "@/components/battle/fx/fx.css";
import "./fx-lab.css";
import { AuraCanvas } from "@/components/battle/fx/auras/canvas/AuraCanvas";
import { FRAMES } from "@/components/battle/fx/frames/canvas";
import { CanvasFrame } from "@/components/battle/fx/frames/canvas/CanvasFrame";
import type { FrameAnimation } from "@/components/battle/fx/frames/canvas/types";
import { ARCHETYPE_LABEL, AURA_KINDS, AURA_LABEL, ELEMENT_LABEL } from "@/components/battle/fx/labels";
import { PALETTE } from "@/components/battle/fx/runtime/palette";
import { HudChipTabs, HudPage, HudPageHeader } from "@/components/hud/page";
import { FX_ARCHETYPES, type FxArchetype, type FxElement } from "@/lib/utils/battle/fx";

const ELEMENTS = Object.keys(PALETTE) as FxElement[];

function CanvasFrameTile({ label, frame }: { label: string; frame: FrameAnimation }) {
  const [token, setToken] = useState(0);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex min-h-[76px] w-full items-center gap-3 border-b border-white/[.08] px-2 py-2 text-[#d6cbb7]">
        {token > 0 && <CanvasFrame key={token} frame={frame} delayMs={0} />}
        <span className="flex size-12 items-center justify-center rounded-full bg-[#241d16] text-xs font-bold shadow-[0_0_0_2px_var(--enemy),0_0_0_3px_#000]">Ог</span>
        <span className="min-w-0 flex-1">
          <span className="hud-sc block font-bold text-[var(--ink)]">Огр · {label}</span>
          <span className="mt-1 block h-1.5 rounded-full bg-[#c0392b]" />
        </span>
      </div>
      <button type="button" onClick={() => setToken((t) => t + 1)} aria-label={`Програти рамку: ${label}`} className="flex h-8 items-center gap-1.5 rounded-full px-3 text-xs text-[#2a1d05] [background:linear-gradient(135deg,#8a6414,#e6c25a_55%,#8a6414)]">
        <Play className="size-3" />
        Програти
      </button>
    </div>
  );
}

export function FxLab() {
  const [archetype, setArchetype] = useState<FxArchetype>("bolt");

  const [element, setElement] = useState<FxElement>("fire");

  const [critical, setCritical] = useState(false);

  const [miss, setMiss] = useState(false);

  const [token, setToken] = useState(0);

  const toggle = (label: string, on: boolean, set: (v: boolean) => void) => ({ key: label, label, active: on, onSelect: () => set(!on) });

  return (
    <div className="battle-hud min-h-dvh">
      <HudPage className="max-w-screen-xl">
        <HudPageHeader
          title="Лабораторія анімацій"
          subtitle="Оберіть архетип і стихію та програйте анімацію з бібліотеки."
          actions={
            <>
              <Link href="/dev/fx-spells" className="flex h-9 items-center rounded-full px-4 text-sm text-hud-bone shadow-[inset_0_0_0_1px_var(--color-hud-gold)]">
                Заклинання та ефекти
              </Link>
              <button type="button" onClick={() => setToken((t) => t + 1)} aria-label="Програти" className="flex h-9 items-center gap-2 rounded-full px-4 text-sm text-[#2a1d05] [background:linear-gradient(135deg,#8a6414,#e6c25a_55%,#8a6414)]">
              <Play className="size-4" />
              Програти
            </button>
            </>
          }
        >
          <HudChipTabs ariaLabel="Архетип" items={FX_ARCHETYPES.map((a) => ({ key: a, label: ARCHETYPE_LABEL[a], active: a === archetype, onSelect: () => setArchetype(a) }))} />
          <HudChipTabs ariaLabel="Стихія" items={ELEMENTS.map((e) => ({ key: e, label: ELEMENT_LABEL[e], active: e === element, onSelect: () => setElement(e) }))} />
          <HudChipTabs ariaLabel="Параметри" items={[toggle("Крит", critical, setCritical), toggle("Промах", miss, setMiss)]} />
        </HudPageHeader>
        <FxLabPanel archetype={archetype} element={element} critical={critical} hit={!miss} playToken={token} />
        <section aria-label="Рамки" className="mt-8">
          <h2 className="hud-sc mb-4 text-lg font-bold text-[var(--ink)]">Рамки</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <CanvasFrameTile label="Ближня атака" frame={FRAMES["physical-melee"]} />
            <CanvasFrameTile label="Стріла" frame={FRAMES["physical-ranged"]} />
            {ELEMENTS.flatMap((e) => (e === "physical" ? [] : [<CanvasFrameTile key={e} label={ELEMENT_LABEL[e]} frame={FRAMES[e]} />]))}
            <CanvasFrameTile label="Лікування" frame={FRAMES.heal} />
          </div>
        </section>
        <section aria-label="Аури" className="mt-8">
          <h2 className="hud-sc mb-4 text-lg font-bold text-[var(--ink)]">Аури</h2>
          <div className="grid grid-cols-3 gap-x-4 gap-y-10 sm:grid-cols-5">
            {AURA_KINDS.map((kind) => (
              <div key={kind} className="flex flex-col items-center gap-3">
                <span className="relative size-12 shrink-0 rounded-full bg-[#3a3326] ring-1 ring-white/20">
                  <AuraCanvas kinds={[kind]} size={48} />
                </span>
                <span className="text-xs text-[#d6cbb7]">{AURA_LABEL[kind]}</span>
              </div>
            ))}
          </div>
        </section>
      </HudPage>
    </div>
  );
}
