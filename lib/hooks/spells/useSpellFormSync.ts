"use client";

import { useEffect } from "react";

import type { Spell, SpellFormData } from "@/types/spells";

/** `toForm` передає сторінка DM: схема моделі (zod) не мусить потрапляти в бойовий чанк через barrel хуків. */
export function useSpellFormSync(
  spell: Spell | undefined | null,
  setFormData: (data: SpellFormData) => void,
  toForm: (spell: Spell) => SpellFormData,
) {
  useEffect(() => {
    if (!spell) return;

    const timer = setTimeout(() => setFormData(toForm(spell)), 0);

    return () => clearTimeout(timer);
  }, [spell, setFormData, toForm]);
}
