"use client";

import { useState } from "react";
import { Play } from "lucide-react";

import { LAB_ENGINES, LAB_SCENARIOS } from "./config";
import { FxLabPanel } from "./FxLabPanel";

import "@/components/battle/hud/battle-hud.css";
import "@/components/battle/fx/fx.css";
import "./fx-lab.css";
import { HudChipTabs, HudPage, HudPageHeader } from "@/components/hud/page";

export function FxLab() {
  const [scenarioId, setScenarioId] = useState(LAB_SCENARIOS[0].id);

  const [token, setToken] = useState(0);

  const scenario = LAB_SCENARIOS.find((s) => s.id === scenarioId) ?? LAB_SCENARIOS[0];

  return (
    <div className="battle-hud min-h-dvh">
      <HudPage className="max-w-screen-2xl">
        <HudPageHeader
          title="Лабораторія анімацій"
          subtitle="Та сама дія, зроблена кожною бібліотекою. Оберіть дію і програйте в усіх панелях одночасно або в кожній окремо."
          actions={
            <button type="button" onClick={() => setToken((t) => t + 1)} className="flex h-9 items-center gap-2 rounded-full px-4 text-sm text-[#2a1d05] [background:linear-gradient(135deg,#8a6414,#e6c25a_55%,#8a6414)]">
              <Play className="size-4" />
              Програти в усіх
            </button>
          }
        >
          <HudChipTabs ariaLabel="Дія" items={LAB_SCENARIOS.map((s) => ({ key: s.id, label: s.label, active: s.id === scenarioId, onSelect: () => setScenarioId(s.id) }))} />
        </HudPageHeader>
        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {LAB_ENGINES.map((engine) => <FxLabPanel key={engine.id} engine={engine} scenario={scenario} playToken={token} />)}
        </div>
      </HudPage>
    </div>
  );
}
