import type { ReactNode } from "react";
import Link from "next/link";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

const TONE = {
  default: "shadow-[inset_0_0_0_1px_var(--color-hud-edge)] hover:shadow-[inset_0_0_0_1px_var(--color-hud-gold-strong)]",
  active: "shadow-[inset_0_0_0_1px_var(--color-hud-gold-strong),0_0_12px_var(--color-hud-glow)]",
  muted: "opacity-70 shadow-[inset_0_0_0_1px_var(--color-hud-edge-faint)]",
} as const;

interface HudCardProps {
  tone?: keyof typeof TONE;
  accent?: string;
  asChild?: boolean;
  href?: string;
  linkLabel?: string;
  className?: string;
  "data-tour"?: string;
  children: ReactNode;
}

export function HudCard({ tone = "default", accent, asChild = false, href, linkLabel, className, "data-tour": dataTour, children }: HudCardProps) {
  const Comp = asChild ? Slot : "div";

  return (
    <Comp
      data-tone={tone}
      data-tour={dataTour}
      data-clickable={href ? "" : undefined}
      style={accent ? { borderLeftColor: accent } : undefined}
      className={cn(href && "relative cursor-pointer", "block rounded-lg bg-hud-panel p-3 text-hud-bone transition-shadow", accent && "border-l-[3px]", TONE[tone], className)}
    >
      {href && !asChild ? (
        <>
          <Link href={href} data-card-overlay aria-label={linkLabel} className="absolute inset-0 rounded-lg" />
          {children}
        </>
      ) : (
        children
      )}
    </Comp>
  );
}
