import type { SpellOnlyEffect, SpellOnlyKind } from "@/lib/utils/spells/editor/spell-only";

export interface SpellOnlyEditorProps<K extends SpellOnlyKind = SpellOnlyKind> {
  effect: SpellOnlyEffect<K>;
  path: string;
  onChange: (effect: SpellOnlyEffect<K>) => void;
}
