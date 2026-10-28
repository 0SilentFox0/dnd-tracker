"use client";

import { type ComponentType, useEffect, useState } from "react";
import dynamic from "next/dynamic";

import { BattleToast } from "./BattleToast";
import { CornerStack } from "./CornerStack";
import { NoticeStackContext } from "./MapStrip";
import { MobileBattleLayout } from "./MobileBattleLayout";

import { AudioDock } from "@/components/audio/AudioDock";
import { BattleAudioProvider } from "@/components/battle/audio/BattleAudioProvider";
import { hudFontClassName } from "@/components/hud";
import { BattleStatus, ParticipantSide } from "@/lib/constants/battle";
import { useBattleScene, useFxEnabled, useModeAutoSkip, useSpellBookPrefetch } from "@/lib/hooks/battle";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";
import { myTurnKey } from "@/lib/utils/battle/view";
import type { BattlePreparationParticipant } from "@/types/battle";

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

if (typeof window !== "undefined" && window.matchMedia?.(DESKTOP_QUERY).matches) void loadDesktopLayout();

function useDesktopLayout(wide: boolean): DesktopLayout | null {
  const [, setLoaded] = useState(desktopLayout !== null);

  useEffect(() => {
    if (wide && !desktopLayout) void loadDesktopLayout().then(() => setLoaded(true));
  }, [wide]);

  return wide ? desktopLayout : null;
}

const CompleteBattleDialog = dynamic(() => import("@/components/battle/dm/CompleteBattleDialog").then((m) => m.CompleteBattleDialog), { ssr: false });

const ActionResultCard = dynamic(() => import("@/components/battle/overlays/ActionResultCard").then((m) => m.ActionResultCard), { ssr: false });

const ResultOverlay = dynamic(() => import("@/components/battle/overlays/ResultOverlay").then((m) => m.ResultOverlay), { ssr: false });

const BattleResultScreen = dynamic(() => import("@/components/battle/overlays/BattleResultScreen").then((m) => m.BattleResultScreen), { ssr: false });

const DmRevivePrompt = dynamic(() => import("@/components/battle/dm/DmRevivePrompt").then((m) => m.DmRevivePrompt), { ssr: false });

const BattleFxLayer = dynamic(() => import("@/components/battle/fx/BattleFxLayer").then((m) => m.BattleFxLayer), { ssr: false });

const BattlePreparationView = dynamic(() => import("@/components/battle/overlays/BattlePreparationView").then((m) => m.BattlePreparationView));

const sideCount = (participants: BattlePreparationParticipant[], side: string) => participants.filter((p) => p.side === side).reduce((s, p) => s + (p.quantity ?? 1), 0);

const onFieldCount = (participants: BattlePreparationParticipant[]) => participants.reduce((s, p) => s + (p.quantity ?? 1) - Math.min(p.reserved ?? 0, p.quantity ?? 1), 0);

export function BattleScreen() {
  const { battle, viewer: { isDM }, actions, turn: { isMyTurn }, roster: { hero } } = useBattleScene();

  // перший HTML — мобільний макет: телефони не бачать підміни після гідратації
  const wide = useMediaQuery(DESKTOP_QUERY);

  const Desktop = useDesktopLayout(wide);

  const [completeOpen, setCompleteOpen] = useState(false);

  // як на телефоні: новий хід згортає плеєр, інакше розгорнута панель лежить на кнопках моралі й дій
  const turnKey = hero && isMyTurn ? myTurnKey(hero, battle.currentRound) : null;

  const [notices, setNotices] = useState<HTMLElement | null>(null);

  useSpellBookPrefetch();

  useModeAutoSkip();

  const { userEnabled: fxOn } = useFxEnabled();

  useEffect(() => {
    if (!fxOn) return;

    import("@/components/battle/fx/preload").then((m) => m.preloadFx()).catch(() => undefined);
  }, [fxOn]);

  // один провайдер на обидві гілки: <audio> у ньому переживає «Почати бій»
  return (
    <BattleAudioProvider>
      {battle.status === BattleStatus.PREPARED ? (
        <div className={cn("battle-hud below-header overflow-y-auto", hudFontClassName)}>
          <BattlePreparationView alliesCount={sideCount(battle.participants, ParticipantSide.ALLY)} enemiesCount={sideCount(battle.participants, ParticipantSide.ENEMY)} isDM={isDM} onStartBattle={() => actions.start.mutate({})} isStarting={actions.start.isPending} canStart={onFieldCount(battle.participants) > 0} />
          <CornerStack>
            <AudioDock placement="corner" />
          </CornerStack>
        </div>
      ) : (
        <div className={cn("battle-hud", hudFontClassName)}>
          {Desktop ? <Desktop onComplete={() => setCompleteOpen(true)} /> : <NoticeStackContext value={notices}><MobileBattleLayout /></NoticeStackContext>}
          <ResultOverlay />
          {battle.status === BattleStatus.COMPLETED && <BattleResultScreen />}
          <div ref={setNotices} data-notice-stack className="pointer-events-none fixed inset-x-4 top-14 z-50 mx-auto flex max-w-md flex-col gap-2 *:pointer-events-auto">
            <BattleToast />
          </div>
          {Desktop && (
            <CornerStack>
              <ActionResultCard />
              <AudioDock placement="corner" collapseOn={turnKey} />
            </CornerStack>
          )}
          {isDM && <DmRevivePrompt />}
          {Desktop && <CompleteBattleDialog open={completeOpen} onOpenChange={setCompleteOpen} />}
          <BattleFxLayer />
        </div>
      )}
    </BattleAudioProvider>
  );
}
