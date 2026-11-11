import { Award, BookOpen, Bot, Briefcase, Cpu, Gem, GitBranch, GraduationCap, Images, type LucideIcon, Music, Network, Scale, ScrollText, Shield, Skull, Sparkles, Swords, Users, Wand2 } from "lucide-react";

import { metaOf } from "@/lib/utils/rules/systems/meta";

export const CampaignRole = { DM: "dm", PLAYER: "player" } as const;

export type CampaignRoleValue = (typeof CampaignRole)[keyof typeof CampaignRole];

export const CampaignStatus = { ACTIVE: "active", ARCHIVED: "archived" } as const;

export type CampaignStatus = (typeof CampaignStatus)[keyof typeof CampaignStatus];

export const CampaignKind = { CAMPAIGN: "campaign", TEMPLATE: "template", DEMO: "demo" } as const;

export const isDemoKind = (kind: string | null | undefined) => kind === CampaignKind.DEMO;

export type CampaignKind = (typeof CampaignKind)[keyof typeof CampaignKind];

export const CampaignVisibility = { PRIVATE: "private", OFFICIAL: "official" } as const;

export type CampaignVisibility = (typeof CampaignVisibility)[keyof typeof CampaignVisibility];

export const DEFAULT_TEMPLATE_LOCALE = "en";

export interface DmSection {
  path: string;
  icon: LucideIcon;
  templateVisible: boolean;
  requiresClasses?: boolean;
  /** shown only when the active system declares the path in meta.dmSections */
  systemSection?: true;
  /** skill libraries have no use in 5e class campaigns */
  hiddenWithClasses?: boolean;
  /** campaign page tile: in every kind, only on templates, or none (menu only) */
  tile: "all" | "template" | "none";
}

export const DM_SECTIONS: readonly DmSection[] = [
  { path: "scenario", icon: ScrollText, templateVisible: false, tile: "all" },
  { path: "graph", icon: Network, templateVisible: false, tile: "all" },
  { path: "characters", icon: Users, templateVisible: false, tile: "all" },
  { path: "units", icon: Skull, templateVisible: true, tile: "all" },
  { path: "spells", icon: Sparkles, templateVisible: true, tile: "all" },
  { path: "artifacts", icon: Gem, templateVisible: true, tile: "all" },
  { path: "skills", icon: BookOpen, templateVisible: true, hiddenWithClasses: true, tile: "all" },
  { path: "skill-trees", icon: GitBranch, templateVisible: true, hiddenWithClasses: true, tile: "all" },
  { path: "races", icon: Shield, templateVisible: true, tile: "all" },
  { path: "classes", icon: GraduationCap, templateVisible: true, requiresClasses: true, tile: "all" },
  { path: "backgrounds", icon: Award, templateVisible: true, requiresClasses: true, tile: "all" },
  { path: "feats", icon: Award, templateVisible: true, requiresClasses: true, tile: "all" },
  { path: "careers", icon: Briefcase, templateVisible: false, systemSection: true, tile: "all" },
  { path: "battles", icon: Swords, templateVisible: false, tile: "all" },
  { path: "music", icon: Music, templateVisible: true, tile: "all" },
  { path: "show", icon: Images, templateVisible: false, tile: "all" },
  { path: "spell-groups", icon: Wand2, templateVisible: true, tile: "template" },
  { path: "rules", icon: Scale, templateVisible: true, tile: "all" },
  { path: "artifact-sets", icon: Gem, templateVisible: false, tile: "none" },
  { path: "assistant", icon: Bot, templateVisible: false, tile: "none" },
  { path: "ai", icon: Cpu, templateVisible: true, tile: "all" },
];

interface DmSectionContext {
  isTemplate: boolean;
  classesEnabled: boolean;
  systemKey?: string;
}

export const dmSectionsFor = ({ isTemplate, classesEnabled, systemKey }: DmSectionContext): DmSection[] =>
  DM_SECTIONS.filter((s) => (!isTemplate || s.templateVisible) && (!s.systemSection || !!(systemKey && metaOf(systemKey)?.dmSections?.includes(s.path))) && (!s.requiresClasses || classesEnabled) && !(s.hiddenWithClasses && classesEnabled));

export const dmTilesFor = (ctx: DmSectionContext): DmSection[] =>
  dmSectionsFor(ctx).filter((s) => s.tile === "all" || (s.tile === "template" && ctx.isTemplate));
