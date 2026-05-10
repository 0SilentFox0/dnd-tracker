"use client";

import { useEffect } from "react";

import type { SpellFormData } from "./spell-form-defaults";

import type { Spell } from "@/types/spells";

export function useSpellFormSync(
  spell: Spell | undefined | null,
  setFormData: (data: SpellFormData | ((prev: SpellFormData) => SpellFormData)) => void,
) {
  useEffect(() => {
    if (!spell) return;

    const timer = setTimeout(() => {
      setFormData({
        name: spell.name,
        level: spell.level,
        type: spell.type,
        target: spell.target || null,
        damageType: spell.damageType,
        damageElement: spell.damageElement || null,
        damageModifier: spell.damageModifier || null,
        healModifier: spell.healModifier || null,
        castingTime: spell.castingTime || null,
        range: spell.range || "",
        duration: spell.duration || "",
        diceCount: spell.diceCount || null,
        diceType: spell.diceType || null,
        savingThrow: spell.savingThrow,
        description: spell.description ?? null,
        effects: (() => {
          const raw = Array.isArray(spell.effects)
            ? spell.effects
            : spell.description
              ? [spell.description]
              : [];

          return raw.flatMap((e) =>
            String(e)
              .split(/\s*,\s*/)
              .map((s) => s.trim())
              .filter(Boolean),
          );
        })(),
        groupId: spell.groupId,
        icon: spell.icon || null,
        summonUnitId: spell.summonUnitId ?? null,
        damageDistribution: spell.damageDistribution ?? null,
      });
    }, 0);

    return () => clearTimeout(timer);
  }, [spell, setFormData]);
}
