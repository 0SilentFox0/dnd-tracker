"use client";

import type { ReactNode } from "react";

import type { EffectBadgeEffect } from "./EffectBadge";
import type { EffectBadgeVariant } from "./EffectBadge";
import { EffectBadge } from "./EffectBadge";

export function EffectsRow({
  effects,
  variant,
  icon,
}: {
  effects: EffectBadgeEffect[];
  variant: EffectBadgeVariant;
  icon?: ReactNode;
}) {
  if (effects.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {icon}
      {effects.map((e) => (
        <EffectBadge key={e.id} effect={e} variant={variant} />
      ))}
    </div>
  );
}
