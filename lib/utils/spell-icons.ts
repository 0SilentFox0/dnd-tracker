import {
  Moon,
  Flame,
  Sparkles,
  Sun,
  LucideIcon,
  Crosshair,
  Circle,
  Sword,
  Heart,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

export function getSpellGroupIcon(groupName: string): LucideIcon {
  const iconMap: Record<string, LucideIcon> = {
    Dark: Moon,
    Destr: Flame,
    Summ: Sparkles,
    Light: Sun,
  };
  return iconMap[groupName] || Sparkles;
}

export function getSpellTypeIcon(type: string): LucideIcon {
  const iconMap: Record<string, LucideIcon> = {
    target: Crosshair,
    aoe: Circle,
  };
  return iconMap[type] || Crosshair;
}

export function getSpellDamageTypeIcon(damageType: string): LucideIcon {
  const iconMap: Record<string, LucideIcon> = {
    damage: Sword,
    heal: Heart,
    buff: ArrowUp,
    debuff: ArrowDown,
  };
  return iconMap[damageType] || Sword;
}
