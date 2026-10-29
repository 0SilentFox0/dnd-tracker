import type { LucideIcon } from "lucide-react";
import { Award, BookOpen, Contact, Gem, GitBranch, GraduationCap, Images, Map as MapIcon, Music, Scale, ScrollText, Shield, Skull, Sparkles, Swords, User, Users, Wand2 } from "lucide-react";

import { dmTilesFor } from "@/lib/constants/campaigns";

export type DashboardGroupKey = "game" | "heroes" | "libraries" | "player";

export interface DashboardSection {
  key: string;
  href: (campaignId: string) => string;
  icon: LucideIcon;
  group: DashboardGroupKey;
}

const dm = (path: string) => (id: string) => `/campaigns/${id}/dm/${path}`;

const info = (id: string) => `/campaigns/${id}/info`;

const acquaintances = (id: string) => `/campaigns/${id}/acquaintances`;

export const DM_DASHBOARD_SECTIONS: DashboardSection[] = [
  { key: "scenario", href: dm("scenario"), icon: ScrollText, group: "game" },
  { key: "battles", href: dm("battles"), icon: Swords, group: "game" },
  { key: "show", href: dm("show"), icon: Images, group: "game" },
  { key: "music", href: dm("music"), icon: Music, group: "game" },
  { key: "acquaintances", href: acquaintances, icon: Contact, group: "game" },
  { key: "characters", href: dm("characters"), icon: Users, group: "heroes" },
  { key: "info", href: info, icon: BookOpen, group: "heroes" },
  { key: "units", href: dm("units"), icon: Skull, group: "libraries" },
  { key: "spells", href: dm("spells"), icon: Sparkles, group: "libraries" },
  { key: "artifacts", href: dm("artifacts"), icon: Gem, group: "libraries" },
  { key: "skills", href: dm("skills"), icon: BookOpen, group: "libraries" },
  { key: "skill-trees", href: dm("skill-trees"), icon: GitBranch, group: "libraries" },
  { key: "races", href: dm("races"), icon: Shield, group: "libraries" },
  { key: "classes", href: dm("classes"), icon: GraduationCap, group: "libraries" },
  { key: "backgrounds", href: dm("backgrounds"), icon: Award, group: "libraries" },
  { key: "feats", href: dm("feats"), icon: Award, group: "libraries" },
  { key: "spell-groups", href: dm("spell-groups"), icon: Wand2, group: "libraries" },
  { key: "rules", href: dm("rules"), icon: Scale, group: "libraries" },
];

export function dashboardHiddenKeys({ isDM, hasWorld, acquaintancesEnabled }: { isDM: boolean; hasWorld: boolean; acquaintancesEnabled: boolean }): string[] {
  return [...(hasWorld ? [] : ["player-world"]), ...(isDM || acquaintancesEnabled ? [] : ["acquaintances"])];
}

const CAMPAIGN_LEVEL_KEYS = new Set(["info", "acquaintances"]);

export interface DashboardContext {
  isTemplate: boolean;
  classesEnabled: boolean;
}

export const DEFAULT_DASHBOARD_CONTEXT: DashboardContext = { isTemplate: false, classesEnabled: false };

/** Visibility comes from DM_SECTIONS (templates, classes rules); "info" is the reference page of a playable campaign. */
export function dmDashboardSectionsFor(ctx: DashboardContext): DashboardSection[] {
  const visible = new Set(dmTilesFor(ctx).map((s) => s.path));

  return DM_DASHBOARD_SECTIONS.filter((s) => (CAMPAIGN_LEVEL_KEYS.has(s.key) ? !ctx.isTemplate : visible.has(s.key)));
}

export const PLAYER_DASHBOARD_SECTIONS: DashboardSection[] = [
  { key: "my-character", href: (id) => `/campaigns/${id}/character`, icon: User, group: "player" },
  { key: "player-show", href: (id) => `/campaigns/${id}/show`, icon: Images, group: "player" },
  { key: "player-world", href: (id) => `/campaigns/${id}/world`, icon: MapIcon, group: "player" },
  { key: "acquaintances", href: acquaintances, icon: Contact, group: "player" },
  { key: "info", href: info, icon: BookOpen, group: "player" },
];

export const COMPACT_GROUPS: ReadonlySet<DashboardGroupKey> = new Set<DashboardGroupKey>(["libraries"]);
