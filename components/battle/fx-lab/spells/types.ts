import type { SpellFxPreview } from "@/lib/utils/battle/fx/spell-preview";

export interface SpellCardData extends SpellFxPreview {
  icon: string | null;
}

export interface SpellArenaHandle {
  play: (spell: SpellFxPreview) => void;
}
