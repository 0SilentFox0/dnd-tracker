"use client";

import { Sparkles } from "lucide-react";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { spellSchoolColor } from "@/lib/constants/spells";
import { getSpellGroupIcon, type SpellGroupLook } from "@/lib/utils/spells/spell-icons";

interface SpellIconProps {
  spell: { icon?: string | null; spellGroup?: SpellGroupLook | null };
  size: number;
  className?: string;
  iconClassName?: string;
}

export function SpellIcon({ spell, size, className, iconClassName = "size-5" }: SpellIconProps) {
  const School = spell.spellGroup ? getSpellGroupIcon(spell.spellGroup) : Sparkles;

  const fallback = <School className={iconClassName} style={{ color: spellSchoolColor(spell.spellGroup) }} />;

  if (!spell.icon) return fallback;

  return <OptimizedImage src={spell.icon} alt="" width={size} height={size} className={className} fallback={fallback} />;
}
