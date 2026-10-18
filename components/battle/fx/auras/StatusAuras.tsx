"use client";

import type { JSX } from "react";

import { BindAura } from "./bind";
import { BleedingAura } from "./bleeding";
import { BlessingAura } from "./blessing";
import { BurningAura } from "./burning";
import { CharmAura } from "./charm";
import { CurseAura } from "./curse";
import { DecayAura } from "./decay";
import { FrostAura } from "./frost";
import { MarkedAura } from "./marked";
import { PlagueAura } from "./plague";
import { RageAura } from "./rage";
import { RegenAura } from "./regen";
import { ShieldAura } from "./shield";
import { StaticAura } from "./static";
import { StunAura } from "./stun";

import { useFxEnabled } from "@/lib/hooks/battle";
import { aurasOf, type FxAuraKind } from "@/lib/utils/battle/fx";
import type { ActiveEffect } from "@/types/battle";

export const AURAS: Record<FxAuraKind, () => JSX.Element> = {
  stun: StunAura,
  charm: CharmAura,
  rage: RageAura,
  bind: BindAura,
  plague: PlagueAura,
  burning: BurningAura,
  frost: FrostAura,
  decay: DecayAura,
  bleeding: BleedingAura,
  static: StaticAura,
  marked: MarkedAura,
  curse: CurseAura,
  regen: RegenAura,
  shield: ShieldAura,
  blessing: BlessingAura,
};

export function AuraLayer({ kinds, size }: { kinds: FxAuraKind[]; size: number }) {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0" style={{ ["--s" as string]: `${size}px` }}>
      {kinds.map((kind) => {
        const Aura = AURAS[kind];

        return <Aura key={kind} />;
      })}
    </span>
  );
}

export function StatusAuras({ effects, size }: { effects: ActiveEffect[]; size: number }) {
  const { enabled } = useFxEnabled();

  if (!enabled) return null;

  return <AuraLayer kinds={aurasOf(effects)} size={size} />;
}
