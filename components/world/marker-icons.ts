import { Building2, Castle, Home, Landmark, type LucideIcon, Skull, Sparkles, Swords, Tent } from "lucide-react";

import type { WORLD_MARKER_ICONS } from "@/lib/constants/world";

export const MARKER_ICON: Record<keyof typeof WORLD_MARKER_ICONS, LucideIcon> = {
  castle: Castle,
  city: Building2,
  village: Home,
  dungeon: Skull,
  portal: Sparkles,
  camp: Tent,
  landmark: Landmark,
  battle: Swords,
};
