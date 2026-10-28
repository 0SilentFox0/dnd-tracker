import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface OptionButtonProps {
  role: "radio" | "checkbox";
  checked: boolean;
  disabled?: boolean;
  title: ReactNode;
  meta?: ReactNode;
  note?: ReactNode;
  onClick: () => void;
  variant?: "battle" | "form";
  className?: string;
}

const BATTLE = "border border-white/15 px-2 py-1.5 text-left text-sm text-[var(--ink)] hover:border-[var(--gold)]/50 disabled:opacity-40 aria-checked:border-[var(--gold)] aria-checked:bg-[var(--gold)]/10";

const VARIANTS = {
  battle: BATTLE,
  form: "w-full rounded-md border border-hud-line/50 p-2 text-left text-sm text-hud-ink aria-checked:border-hud-gold disabled:opacity-50",
} as const;

export function OptionButton({ role, checked, disabled, title, meta, note, onClick, variant = "battle", className }: OptionButtonProps) {
  return (
    <button type="button" role={role} aria-checked={checked} disabled={disabled} onClick={onClick} className={cn(VARIANTS[variant], className)}>
      <span className="flex items-baseline justify-between gap-2">
        <span className="font-medium">{title}</span>
        {meta !== undefined && <span className="text-xs text-[var(--hud-muted)]">{meta}</span>}
      </span>
      {note && <span className="block pt-0.5 text-xs text-[var(--hud-muted)]">{note}</span>}
    </button>
  );
}
