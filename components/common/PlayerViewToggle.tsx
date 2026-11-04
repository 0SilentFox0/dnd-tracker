"use client";

import { MonitorPlay } from "lucide-react";

import { cn } from "@/lib/utils";

export function PlayerViewToggle({ enabled, onToggle, labels, className }: { enabled: boolean; onToggle: () => void; labels: { on: string; off: string }; className?: string }) {
  const label = enabled ? labels.on : labels.off;

  return (
    <button type="button" onClick={onToggle} aria-label={label} aria-pressed={enabled} title={`${label} (P)`} className={cn("flex size-8 items-center justify-center hover:bg-white/10", enabled ? "text-[var(--gold)]" : "text-hud-soft/60", className)}>
      <MonitorPlay className="size-4" />
    </button>
  );
}
