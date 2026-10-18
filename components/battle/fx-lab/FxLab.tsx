"use client";

import { useState } from "react";
import { Play } from "lucide-react";

import { FxLabPanel } from "./FxLabPanel";

import "@/components/battle/hud/battle-hud.css";
import "@/components/battle/fx/fx.css";
import "./fx-lab.css";
import { ANIMATIONS } from "@/components/battle/fx/animations";
import { PALETTE } from "@/components/battle/fx/runtime/palette";
import { HudChipTabs, HudPage, HudPageHeader } from "@/components/hud/page";
import type { FxArchetype, FxElement } from "@/lib/utils/battle/fx";

const ARCHETYPES = Object.keys(ANIMATIONS) as FxArchetype[];

const ELEMENTS = Object.keys(PALETTE) as FxElement[];

const ARCHETYPE_LABEL: Record<FxArchetype, string> = { melee: "Ближній", ranged: "Дальній", bolt: "Снаряд", area: "Область", heal: "Лікування", buff: "Бафф", debuff: "Дебафф", summon: "Прикликання", death: "Смерть" };

const ELEMENT_LABEL: Record<FxElement, string> = { fire: "Вогонь", cold: "Холод", lightning: "Блискавка", poison: "Отрута", necrotic: "Некротика", radiant: "Сяйво", arcane: "Аркана", physical: "Фізичний", nature: "Природа" };

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
      </HudPage>
    </div>
  );
}
