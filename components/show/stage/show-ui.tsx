import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/** Кольори через --show-* (сценарій задає свої), інакше HUD. */
export const SHOW_TONE = {
  rule: "border-[var(--show-rule,var(--color-hud-rule))]",
  accent: "border-[var(--show-accent,var(--color-hud-gold-strong))] ring-2 ring-[var(--show-accent,var(--color-hud-gold-strong))]",
  muted: "text-[var(--show-muted,var(--color-hud-muted))]",
};

export function ShowButton({ className, tone = "plain", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "plain" | "danger" }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex h-8 min-w-8 shrink-0 items-center justify-center gap-1.5 rounded px-1.5 text-sm opacity-75 transition hover:bg-[color-mix(in_srgb,currentColor_10%,transparent)] hover:opacity-100 disabled:pointer-events-none disabled:opacity-30 aria-pressed:bg-[color-mix(in_srgb,var(--show-accent,var(--color-hud-gold-strong))_15%,transparent)] aria-pressed:text-[var(--show-accent,var(--color-hud-gold-strong))] aria-pressed:opacity-100",
        tone === "danger" && "hover:text-red-400",
        className,
      )}
    />
  );
}
