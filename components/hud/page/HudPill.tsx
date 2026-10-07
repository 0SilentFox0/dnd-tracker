import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const TONE = {
  gold: "metal-gold metal-fill font-semibold",
  silver: "metal-silver metal-fill font-semibold",
  bone: "text-hud-bone shadow-[inset_0_0_0_1px_var(--color-hud-line)]",
  accent: "text-hud-bone shadow-[inset_0_0_0_1px_var(--color-hud-gold)]",
  muted: "text-hud-muted shadow-[inset_0_0_0_1px_var(--color-hud-line)]",
  fact: "text-[#c9bfae] shadow-[inset_0_0_0_1px_var(--color-hud-line)]",
} as const;

interface HudPillProps {
  tone?: keyof typeof TONE;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function HudPill({ tone = "fact", icon, className, children }: HudPillProps) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 text-[11px] leading-5", TONE[tone], className)}>
      {icon}
      {children}
    </span>
  );
}
