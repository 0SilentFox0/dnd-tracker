import type { LucideIcon } from "lucide-react";
import { Contact, Gem, MapPin, Skull, Sparkles, Swords, User } from "lucide-react";

import type { MentionType } from "@/types/scenario";

export const GRAPH_ENTITY_CAP = 150;
export const GRAPH_WARN_NODES = 400;
export const GRAPH_LABEL_MIN_DEGREE = 3;
export const GRAPH_TICKS = 300;

export const GRAPH_TYPE_STYLE: Record<MentionType, { icon: LucideIcon; color: string }> = {
  unit: { icon: Skull, color: "var(--color-hud-danger)" },
  artifact: { icon: Gem, color: "var(--color-hud-gold-bright)" },
  character: { icon: User, color: "var(--color-hud-good)" },
  spell: { icon: Sparkles, color: "var(--color-chart-4)" },
  battle: { icon: Swords, color: "var(--color-hud-bad)" },
  marker: { icon: MapPin, color: "var(--color-chart-2)" },
  acquaintance: { icon: Contact, color: "var(--color-hud-bone)" },
};
