"use client";
import { cn } from "@/lib/utils";

export function CategoryChip({ label, count, checked, disabled, onChange }: { label: string; count: number; checked: boolean; disabled?: boolean; onChange: (on: boolean) => void }) {
  return <label className={cn("inline-flex cursor-pointer items-center rounded-full border px-3 py-1 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-hud-gold", checked ? "border-hud-gold bg-hud-gold/15 text-hud-ink" : "border-hud-rule text-hud-muted hover:border-hud-gold/60", disabled && "cursor-not-allowed opacity-50")}>
    <input className="sr-only" type="checkbox" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} />
    {`${label} (${count})`}
  </label>;
}
