"use client";

import { useMemo, useState } from "react";

import { groupSpellsByLevel } from "@/lib/utils/spells/group-by-level";
import type { BookSpell } from "@/types/spells";

export function useSpellBrowser(spells: BookSpell[], slots: { level: number; count: number }[]) {
  const byLevel = useMemo(() => groupSpellsByLevel(spells), [spells]);

  const [level, setLevel] = useState(() => [1, 2, 3, 4, 5, 0].find((l) => (byLevel[l] ?? []).length > 0) ?? 0);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  return {
    byLevel,
    level,
    selected: spells.find((s) => s.id === selectedId) ?? null,
    slotOf: (l: number) => (l === 0 ? Infinity : (slots.find((s) => s.level === l)?.count ?? 0)),
    setLevel: (l: number) => {
      setLevel(l);
      setSelectedId(null);
    },
    pick: (s: BookSpell) => setSelectedId(s.id),
    back: () => setSelectedId(null),
  };
}
