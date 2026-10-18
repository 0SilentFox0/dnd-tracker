"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";

import { StatusAuras } from "@/components/battle/fx/auras/StatusAuras";
import type { HpChange } from "@/lib/hooks/battle";
import type { ActiveEffect } from "@/types/battle";

const ImpactFrame = dynamic(() => import("@/components/battle/fx/frames/ImpactFrame").then((m) => m.ImpactFrame), { ssr: false });

/** The portrait with its status auras drawn around it. */
export function PortraitFx({ effects, size, children }: { effects: ActiveEffect[]; size: number; children: ReactNode }) {
  return (
    <span className="relative shrink-0">
      {children}
      <StatusAuras effects={effects} size={size} />
    </span>
  );
}

/** The hit frame of this HP change; a new change restarts it. */
export function HitFrame({ change }: { change: HpChange | null }) {
  return change?.impact ? <ImpactFrame key={`frame:${change.id}`} impact={change.impact} /> : null;
}
