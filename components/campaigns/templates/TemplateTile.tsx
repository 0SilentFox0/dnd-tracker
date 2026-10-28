import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface TemplateTileProps {
  title: ReactNode;
  subtitle?: ReactNode;
  footnote?: ReactNode;
  selected?: boolean;
  onClick: () => void;
}

export function TemplateTile({ title, subtitle, footnote, selected = false, onClick }: TemplateTileProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "flex min-w-0 flex-col gap-1 rounded-lg bg-[rgba(20,16,12,.85)] p-3 text-left shadow-[inset_0_0_0_1px_rgba(230,194,90,.25)] transition-shadow hover:shadow-[inset_0_0_0_1px_var(--color-hud-gold-strong)]",
        selected && "shadow-[inset_0_0_0_2px_var(--color-hud-gold-strong),0_0_12px_rgba(230,194,90,.18)]",
      )}
    >
      <span className="hud-sc block text-[15px] text-hud-ink">{title}</span>
      {subtitle && <span className="block text-xs text-hud-muted">{subtitle}</span>}
      {footnote && <span className="line-clamp-2 block text-[11px] leading-4 text-hud-muted/80">{footnote}</span>}
    </button>
  );
}
