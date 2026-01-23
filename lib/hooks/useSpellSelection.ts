import { useCallback, useMemo,useState } from "react";

import {
  filterSelectedSpells,
  groupSpellsByGroup,
} from "@/lib/utils/spells";
import type { Spell } from "@/types/spells";

interface UseSpellSelectionProps {
  spells: Spell[];
  selectedSpellIds: string[];
  onSelectionChange: (spellIds: string[]) => void;
}

/**
 * Хук для управління вибором заклинань
 */
export function useSpellSelection({
  spells,
  selectedSpellIds,
  onSelectionChange,
}: UseSpellSelectionProps) {
  const [open, setOpen] = useState(false);

  // Групуємо заклинання по групах
  const groupedSpells = useMemo(() => {
    return Array.from(groupSpellsByGroup(spells).entries());
  }, [spells]);

  // Фільтруємо вибрані заклинання
  const selectedSpells = useMemo(() => {
    return filterSelectedSpells(spells, selectedSpellIds);
  }, [spells, selectedSpellIds]);

  // Перемикає вибір заклинання
  const toggleSpell = useCallback(
    (spellId: string) => {
      if (selectedSpellIds.includes(spellId)) {
        onSelectionChange(selectedSpellIds.filter((id) => id !== spellId));
      } else {
        onSelectionChange([...selectedSpellIds, spellId]);
      }
    },
    [selectedSpellIds, onSelectionChange]
  );

  // Видаляє заклинання з вибраних
  const removeSpell = useCallback(
    (spellId: string) => {
      onSelectionChange(selectedSpellIds.filter((id) => id !== spellId));
    },
    [selectedSpellIds, onSelectionChange]
  );

  return {
    open,
    setOpen,
    groupedSpells,
    selectedSpells,
    toggleSpell,
    removeSpell,
  };
}
