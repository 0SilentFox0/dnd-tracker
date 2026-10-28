import { DoorOpen, Eye, Flame, Heart, LucideIcon, Moon, Shell, Shield, Skull, Sparkles, Sun, Tornado, VenetianMask } from "lucide-react";

import type { SpellGroupIconKey } from "@/lib/constants/spell-groups";

export type SpellGroupLook = { color?: string | null; icon?: string | null };

const ICONS: Record<SpellGroupIconKey, LucideIcon> = {
  moon: Moon,
  flame: Flame,
  sparkles: Sparkles,
  sun: Sun,
  shell: Shell,
  shield: Shield,
  portal: DoorOpen,
  eye: Eye,
  heart: Heart,
  mask: VenetianMask,
  skull: Skull,
  vortex: Tornado,
};

export function getSpellGroupIcon(group: SpellGroupLook | null | undefined): LucideIcon {
  return (group?.icon && Object.hasOwn(ICONS, group.icon) ? ICONS[group.icon as SpellGroupIconKey] : undefined) ?? Shell;
}
