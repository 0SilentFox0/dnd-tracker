"use client";

import { useTranslations } from "next-intl";

import { PlayerViewToggle } from "@/components/common/PlayerViewToggle";
import { useBattleScene } from "@/lib/hooks/battle";

export function BattlePlayerViewToggle({ className }: { className?: string }) {
  const t = useTranslations("battle.topBar");

  const { playerView } = useBattleScene();

  if (!playerView.available) return null;

  return <PlayerViewToggle enabled={playerView.enabled} onToggle={playerView.toggle} labels={{ on: t("playerViewOn"), off: t("playerViewOff") }} className={className} />;
}
