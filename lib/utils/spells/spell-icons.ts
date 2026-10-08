import { Flame, LucideIcon, Moon, Shell, Sparkles, Sun } from "lucide-react";

export function getSpellGroupIcon(groupName: string): LucideIcon {
  const iconMap: Record<string, LucideIcon> = {
    Dark: Moon,
    Destr: Flame,
    Summ: Sparkles,
    Light: Sun,
  };

  return iconMap[groupName] ?? Shell;
}
