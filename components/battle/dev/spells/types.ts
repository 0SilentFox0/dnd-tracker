import type { PreviewSpell, SpellFxPreview } from "@/lib/utils/battle/fx";

export interface SpellCardData extends SpellFxPreview {
  icon: string | null;
  previewSpell: PreviewSpell;
}

export interface SpellArenaHandle {
  play: (spell: SpellFxPreview) => void;
}
