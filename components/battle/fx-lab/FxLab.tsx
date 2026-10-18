"use client";

import { useState } from "react";
import { Play } from "lucide-react";

import { FxLabPanel } from "./FxLabPanel";

import "@/components/battle/hud/battle-hud.css";
import "@/components/battle/fx/fx.css";
import "./fx-lab.css";
import { ANIMATIONS } from "@/components/battle/fx/animations";
import { AuraLayer } from "@/components/battle/fx/auras/StatusAuras";
import { PALETTE } from "@/components/battle/fx/runtime/palette";
import { HudChipTabs, HudPage, HudPageHeader } from "@/components/hud/page";
import type { FxArchetype, FxAuraKind, FxElement } from "@/lib/utils/battle/fx";

const ARCHETYPES = Object.keys(ANIMATIONS) as FxArchetype[];

const ELEMENTS = Object.keys(PALETTE) as FxElement[];

const ARCHETYPE_LABEL: Record<FxArchetype, string> = { melee: "Ближній", ranged: "Дальній", bolt: "Снаряд", area: "Область", heal: "Лікування", buff: "Бафф", debuff: "Дебафф", summon: "Прикликання", death: "Смерть", swarm: "Рій", quake: "Землетрус", teleport: "Телепорт" };

const ELEMENT_LABEL: Record<FxElement, string> = { fire: "Вогонь", cold: "Холод", lightning: "Блискавка", poison: "Отрута", necrotic: "Некротика", radiant: "Сяйво", arcane: "Аркана", physical: "Фізичний", nature: "Природа", earth: "Земля", fury: "Шал" };

const AURA_LABEL: Record<FxAuraKind, string> = { stun: "Оглушення", charm: "Чарм", rage: "Шал", bind: "Пута", plague: "Мор", burning: "Горіння", frost: "Холод", decay: "Тлін", bleeding: "Кровотеча", static: "Розряд", marked: "Мітка", curse: "Прокляття", regen: "Регенерація", shield: "Захист", blessing: "Благословення" };

const AURA_KINDS = Object.keys(AURA_LABEL) as FxAuraKind[];

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
            <button type="button" onClick={() => setToken((t) => t + 1)} aria-label="Програти" className="flex h-9 items-center gap-2 rounded-full px-4 text-sm text-[#2a1d05] [background:linear-gradient(135deg,#8a6414,#e6c25a_55%,#8a6414)]">
              <Play className="size-4" />
              Програти
            </button>
          }
        >
          <HudChipTabs ariaLabel="Архетип" items={ARCHETYPES.map((a) => ({ key: a, label: ARCHETYPE_LABEL[a], active: a === archetype, onSelect: () => setArchetype(a) }))} />
          <HudChipTabs ariaLabel="Стихія" items={ELEMENTS.map((e) => ({ key: e, label: ELEMENT_LABEL[e], active: e === element, onSelect: () => setElement(e) }))} />
          <HudChipTabs ariaLabel="Параметри" items={[toggle("Крит", critical, setCritical), toggle("Промах", miss, setMiss)]} />
        </HudPageHeader>
        <FxLabPanel archetype={archetype} element={element} critical={critical} hit={!miss} playToken={token} />
        <section aria-label="Аури" className="mt-8">
          <h2 className="hud-sc mb-4 text-lg font-bold text-[var(--ink)]">Аури</h2>
          <div className="grid grid-cols-3 gap-x-4 gap-y-10 sm:grid-cols-5">
            {AURA_KINDS.map((kind) => (
              <div key={kind} className="flex flex-col items-center gap-3">
                <span className="relative size-12 shrink-0 rounded-full bg-[#3a3326] ring-1 ring-white/20">
                  <AuraLayer kinds={[kind]} size={48} />
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
