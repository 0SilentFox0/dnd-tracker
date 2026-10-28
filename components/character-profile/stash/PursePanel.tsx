"use client";

import { useState } from "react";

import { MoneyDialog, type MoneyMode } from "./MoneyDialog";

import { HudSection } from "@/components/hud/form";
import { HudPanel } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { COIN_LABEL, COINS } from "@/lib/constants/inventory";
import type { Purse } from "@/types/inventory";

export function PursePanel({ purse, canAct, isDM }: { purse: Purse; canAct: boolean; isDM: boolean }) {
  const [mode, setMode] = useState<MoneyMode | null>(null);

  return (
    <HudPanel>
      <HudSection title="ГАМАНЕЦЬ">
        <dl className="grid grid-cols-3 gap-2 text-center">
          {COINS.map((c) => (
            <div key={c} className="rounded-lg border border-hud-rule bg-hud-field py-2">
              <dd className="text-lg text-hud-ink">{purse[c]}</dd>
              <dt className="text-xs text-hud-muted">{COIN_LABEL[c]}</dt>
            </div>
          ))}
        </dl>
        {canAct && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setMode("spend")}>Витратити</Button>
            <Button variant="outline" onClick={() => setMode("gain")}>Отримати</Button>
            {isDM && <Button variant="outline" onClick={() => setMode("set")}>Задати суму</Button>}
          </div>
        )}
      </HudSection>
      {mode && <MoneyDialog mode={mode} purse={purse} open onOpenChange={(o) => !o && setMode(null)} />}
    </HudPanel>
  );
}
