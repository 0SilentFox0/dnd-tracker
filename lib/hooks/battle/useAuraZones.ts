"use client";

import { useState } from "react";

import { useBattleScene } from "./useBattleScene";

import { type AreaAura, pendingAreaAuras, zoneCandidates, zoneMembers } from "@/lib/utils/abilities/engine/area-aura";
import type { BattleParticipant } from "@/types/battle";

export interface AuraZoneStep {
  aura: AreaAura;
  candidates: BattleParticipant[];
  selected: string[];
  toggle: (id: string) => void;
  confirm: () => Promise<void>;
  pending: boolean;
}

/** Перша аура в області, зону якої власник ще не вказав у цьому раунді; попередній склад — як підказка. */
export function useAuraZones(owner: BattleParticipant): AuraZoneStep | null {
  const { battle, actions } = useBattleScene();

  const ps = battle.initiativeOrder;

  const aura = pendingAreaAuras(ps, owner.basicInfo.id, battle.currentRound)[0] ?? null;

  const candidates = aura ? zoneCandidates(ps, owner, aura.target) : [];

  const previous = aura ? zoneMembers(ps, owner.basicInfo.id, aura.id).ids : [];

  const [picked, setPicked] = useState<{ auraId: string; ids: string[] } | null>(null);

  if (!aura) return null;

  const live = new Set(candidates.map((c) => c.basicInfo.id));

  const selected = (picked?.auraId === aura.id ? picked.ids : previous).filter((id) => live.has(id));

  return {
    aura,
    candidates,
    selected,
    toggle: (id) => setPicked({ auraId: aura.id, ids: selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id] }),
    confirm: async () => {
      try {
        await actions.auraZone.mutateAsync({ participantId: owner.basicInfo.id, auraId: aura.id, targetIds: selected });
      } catch {
        return;
      }

      setPicked(null);
    },
    pending: actions.auraZone.isPending,
  };
}
