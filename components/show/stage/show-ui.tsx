import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/** Кольори через --show-* (сценарій задає свої), інакше HUD. */
export const SHOW_TONE = {
  rule: "border-[var(--show-rule,var(--color-hud-rule))]",
  accent: "border-[var(--show-accent,var(--color-hud-gold-strong))] ring-2 ring-[var(--show-accent,var(--color-hud-gold-strong))]",
  accentText: "text-[var(--show-accent,var(--color-hud-gold-strong))]",
  muted: "text-[var(--show-muted,var(--color-hud-muted))]",
};

export function ShowButton({ className, tone = "plain", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "plain" | "danger" }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded border px-2 text-sm hover:bg-[color-mix(in_srgb,currentColor_10%,transparent)] disabled:opacity-40 aria-pressed:border-[var(--show-accent,var(--color-hud-gold-strong))] aria-pressed:text-[var(--show-accent,var(--color-hud-gold-strong))]",
        SHOW_TONE.rule,
        tone === "danger" && "border-red-700/70 text-red-400",
        className,
      )}
    />
  );
}
