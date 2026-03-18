"use client";

import NextImage from "next/image";

export interface EffectBadgeEffect {
  id: string;
  name: string;
  description?: string | null;
  duration: number;
  icon?: string | null;
  dotDamage?: {
    damagePerRound: number;
    damageType: string;
  };
}

export type EffectBadgeVariant = "buff" | "debuff" | "condition";

const variantClasses: Record<
  EffectBadgeVariant,
  string
> = {
  buff: "bg-green-500/25 text-green-200 border-green-500/40",
  debuff: "bg-red-500/25 text-red-200 border-red-500/40",
  condition: "bg-amber-500/25 text-amber-200 border-amber-500/40",
};

export function EffectBadge({
  effect,
  variant,
}: {
  effect: EffectBadgeEffect;
  variant: EffectBadgeVariant;
}) {
  const dotInfo =
    effect.dotDamage &&
    `${effect.dotDamage.damagePerRound} ${effect.dotDamage.damageType} урону/раунд`;

  const title =
    effect.description ??
    [effect.name, effect.duration > 0 ? `(${effect.duration} р.)` : "", dotInfo]
      .filter(Boolean)
      .join(" ");

  return (
    <span
      className={[
        "flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium border",
        variantClasses[variant],
      ].join(" ")}
      title={title}
    >
      {effect.icon ? (
        <NextImage
          width={24}
          height={24}
          src={effect.icon}
          alt={effect.name}
          className="rounded object-cover shrink-0"
        />
      ) : (
        <span>{effect.name}</span>
      )}
      {effect.duration > 0 ? ` (${effect.duration})` : ""}
    </span>
  );
}
