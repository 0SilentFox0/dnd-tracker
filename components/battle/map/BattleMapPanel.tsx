"use client";

import { BattleMap } from "./BattleMap";

import { useBattleMapScene } from "@/lib/hooks/battle";

export function BattleMapPanel() {
  const scene = useBattleMapScene();

  if (!scene) return null;

  return <BattleMap map={scene.map} participants={scene.participants} view={scene.view} actions={scene.actions} className="h-full" />;
}
