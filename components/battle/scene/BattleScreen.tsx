"use client";

import { type ComponentType, useEffect, useState } from "react";
import dynamic from "next/dynamic";

import { BattleToast } from "./BattleToast";
import { MobileBattleLayout } from "./MobileBattleLayout";

import { hudFontClassName } from "@/components/battle/hud";
import { useBattleScene, useSpellBookPrefetch } from "@/lib/hooks/battle";
import { useMediaQuery } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";

type DesktopLayout = ComponentType<{ onComplete: () => void }>;

let desktopLayout: DesktopLayout | null = null;

let desktopLoad: Promise<void> | null = null;

// телефони завжди на мобільному макеті: він у entry-чанку, десктопний вантажиться лише на широких екранах
function loadDesktopLayout() {
  desktopLoad ??= import("./DesktopBattleLayout").then((m) => {
    desktopLayout = m.DesktopBattleLayout;
  });

  return desktopLoad;
}

if (typeof window !== "undefined" && window.matchMedia?.("(min-width: 1024px)").matches) void loadDesktopLayout();

function useDesktopLayout(wide: boolean): DesktopLayout | null {
  const [, setLoaded] = useState(desktopLayout !== null);

  useEffect(() => {
    if (wide && !desktopLayout) void loadDesktopLayout().then(() => setLoaded(true));
  }, [wide]);

  return wide ? desktopLayout : null;
}

const CompleteBattleDialog = dynamic(() => import("./CompleteBattleDialog").then((m) => m.CompleteBattleDialog), { ssr: false });

const ResultOverlay = dynamic(() => import("@/components/battle/fx/ResultOverlay").then((m) => m.ResultOverlay), { ssr: false });

const BattlePreparationView = dynamic(() => import("@/components/battle/views/BattlePreparationView").then((m) => m.BattlePreparationView));

export function BattleScreen() {
  const { battle, isDM, actions } = useBattleScene();

  // перший HTML — мобільний макет: телефони не бачать підміни після гідратації
  const wide = useMediaQuery("(min-width: 1024px)");

  const Desktop = useDesktopLayout(wide);

  const [completeOpen, setCompleteOpen] = useState(false);

  useSpellBookPrefetch();

  if (battle.status === "prepared") {
    const count = (side: string) => battle.participants.filter((p) => p.side === side).reduce((s, p) => s + (p.quantity ?? 1), 0);

    return (
      <div className={cn("battle-hud below-header overflow-y-auto", hudFontClassName)} >
        <BattlePreparationView alliesCount={count("ally")} enemiesCount={count("enemy")} isDM={isDM} onStartBattle={() => actions.start.mutate({})} isStarting={actions.start.isPending} />
      </div>
    );
  }

  return (
    <div className={cn("battle-hud", hudFontClassName)}>
      {Desktop ? <Desktop onComplete={() => setCompleteOpen(true)} /> : <MobileBattleLayout />}
      <ResultOverlay />
      <BattleToast />
      {Desktop && <CompleteBattleDialog open={completeOpen} onOpenChange={setCompleteOpen} />}
    </div>
  );
}
