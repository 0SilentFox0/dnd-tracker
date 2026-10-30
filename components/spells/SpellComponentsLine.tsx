"use client";

import { useComponentsLine } from "@/lib/hooks/spells";
import { cn } from "@/lib/utils";
import type { Spell } from "@/types/spells";

export function SpellComponentsLine({ spell, className }: { spell: Pick<Spell, "ingredients" | "componentFlags" | "components">; className?: string }) {
  const line = useComponentsLine(spell);

  return line ? <p className={cn("text-xs text-hud-muted", className)}>{line}</p> : null;
}
