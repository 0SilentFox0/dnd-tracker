import type { ReactNode } from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

const TONE = {
  default: "shadow-[inset_0_0_0_1px_rgba(230,194,90,.25)] hover:shadow-[inset_0_0_0_1px_#e6c25a]",
  active: "shadow-[inset_0_0_0_1px_#e6c25a,0_0_12px_rgba(230,194,90,.18)]",
  muted: "opacity-70 shadow-[inset_0_0_0_1px_rgba(230,194,90,.15)]",
} as const;

interface HudCardProps {
  tone?: keyof typeof TONE;
  accent?: string;
  asChild?: boolean;
  className?: string;
  children: ReactNode;
}

export function HudCard({ tone = "default", accent, asChild = false, className, children }: HudCardProps) {
  const Comp = asChild ? Slot : "div";

  return (
    <Comp
      data-tone={tone}
      style={accent ? { borderLeftColor: accent } : undefined}
      className={cn("block rounded-lg bg-[rgba(20,16,12,.85)] p-3 text-[#e6dccb] transition-shadow", accent && "border-l-[3px]", TONE[tone], className)}
    >
      {children}
    </Comp>
  );
}
