import type { CSSProperties } from "react";
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

export function CompassRose({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="-50 -50 100 100" className={className} style={style} aria-hidden>
      <circle r="38" fill="rgba(230,216,184,.55)" stroke="var(--atlas-ink)" strokeWidth="2.5" />
      <circle r="31" fill="none" stroke="var(--atlas-ink)" strokeWidth="1" strokeDasharray="3 3" />
      <path d="M0 -48 L8 -8 L48 0 L8 8 L0 48 L-8 8 L-48 0 L-8 -8 Z" fill="var(--atlas-seal)" stroke="var(--atlas-ink)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M0 -48 L8 -8 L0 0 Z M0 48 L-8 8 L0 0 Z M48 0 L8 8 L0 0 Z M-48 0 L-8 -8 L0 0 Z" fill="var(--atlas-ink)" opacity=".55" />
      <circle r="4" fill="var(--atlas-paper)" stroke="var(--atlas-ink)" strokeWidth="1.5" />
    </svg>
  );
}
