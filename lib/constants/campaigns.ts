import { Award, BookOpen, Bot, Cpu, Gem, GitBranch, GraduationCap, Images, type LucideIcon, Music, Scale, ScrollText, Shield, Skull, Sparkles, Swords, Users, Wand2 } from "lucide-react";

export const CampaignRole = { DM: "dm", PLAYER: "player" } as const;

export type CampaignRoleValue = (typeof CampaignRole)[keyof typeof CampaignRole];

export const CampaignStatus = { ACTIVE: "active", ARCHIVED: "archived" } as const;

export type CampaignStatus = (typeof CampaignStatus)[keyof typeof CampaignStatus];

export const CampaignKind = { CAMPAIGN: "campaign", TEMPLATE: "template" } as const;

export type CampaignKind = (typeof CampaignKind)[keyof typeof CampaignKind];

export const CampaignVisibility = { PRIVATE: "private", OFFICIAL: "official" } as const;

export type CampaignVisibility = (typeof CampaignVisibility)[keyof typeof CampaignVisibility];

export const SRD_TEMPLATE_NAME = "5e SRD 5.2";

export interface DmSection {
  path: string;
  /** breadcrumb label */
  label: string;
  /** menu item and page tile title, defaults to label */
  title?: string;
  icon: LucideIcon;
  subtitle?: string;
  templateVisible: boolean;
  requiresClasses?: boolean;
  /** skill libraries have no use in 5e class campaigns */
  hiddenWithClasses?: boolean;
  /** campaign page tile: in every kind, only on templates, or none (menu only) */
  tile: "all" | "template" | "none";
}

export const DM_SECTIONS: readonly DmSection[] = [
  { path: "scenario", label: "Сценарій", icon: ScrollText, subtitle: "Сцени, нотатки майстра й біографії героїв", templateVisible: false, tile: "all" },
  { path: "characters", label: "Персонажі", icon: Users, subtitle: "Управління персонажами гравців", templateVisible: false, tile: "all" },
  { path: "units", label: "Юніти", title: "NPC Юніти", icon: Skull, subtitle: "Управління мобами та юнітами", templateVisible: true, tile: "all" },
  { path: "spells", label: "Заклинання", icon: Sparkles, subtitle: "База заклинань кампанії", templateVisible: true, tile: "all" },
  { path: "artifacts", label: "Артефакти", icon: Gem, subtitle: "Управління артефактами та сетами", templateVisible: true, tile: "all" },
  { path: "skills", label: "Скіли", title: "Бібліотека Скілів", icon: BookOpen, subtitle: "Управління скілами та їх ефектами", templateVisible: true, hiddenWithClasses: true, tile: "all" },
  { path: "skill-trees", label: "Дерева прокачки", title: "Дерева Прокачки", icon: GitBranch, subtitle: "Налаштування дерев прокачки для рас", templateVisible: true, hiddenWithClasses: true, tile: "all" },
  { path: "races", label: "Раси", title: "Ігрові Раси", icon: Shield, subtitle: "Управління расами та їх здібностями", templateVisible: true, tile: "all" },
  { path: "classes", label: "Класи", icon: GraduationCap, subtitle: "Класи, підкласи і вміння за рівнями", templateVisible: true, requiresClasses: true, tile: "all" },
  { path: "backgrounds", label: "Передісторії", icon: Award, subtitle: "Походження героя, навички й стартові вибори", templateVisible: true, requiresClasses: true, tile: "all" },
  { path: "feats", label: "Риси", icon: Award, subtitle: "Риси 5e: походження, загальні, стилі бою, епічні дари", templateVisible: true, requiresClasses: true, tile: "all" },
  { path: "battles", label: "Бої", title: "Сцени Боїв", icon: Swords, subtitle: "Створення та управління боями", templateVisible: false, tile: "all" },
  { path: "music", label: "Музика", title: "Музика бою", icon: Music, subtitle: "Бібліотека треків для плеєра в бою", templateVisible: true, tile: "all" },
  { path: "show", label: "Показ", title: "Показ сцен", icon: Images, subtitle: "Набори слайдів із музикою для гравців", templateVisible: false, tile: "all" },
  { path: "spell-groups", label: "Школи магії", icon: Wand2, subtitle: "Групи заклинань і школи", templateVisible: true, tile: "template" },
  { path: "rules", label: "Правила", icon: Scale, subtitle: "Правила кампанії", templateVisible: true, tile: "template" },
  { path: "artifact-sets", label: "Сети артефактів", icon: Gem, templateVisible: false, tile: "none" },
  { path: "assistant", label: "Асистент", icon: Bot, templateVisible: false, tile: "none" },
  { path: "ai", label: "AI і API", icon: Cpu, templateVisible: true, tile: "none" },
];

interface DmSectionContext {
  isTemplate: boolean;
  classesEnabled: boolean;
}

export const dmSectionsFor = ({ isTemplate, classesEnabled }: DmSectionContext): DmSection[] =>
  DM_SECTIONS.filter((s) => (!isTemplate || s.templateVisible) && (!s.requiresClasses || classesEnabled) && !(s.hiddenWithClasses && classesEnabled));

export const dmTilesFor = (ctx: DmSectionContext): DmSection[] =>
  dmSectionsFor(ctx).filter((s) => s.tile === "all" || (s.tile === "template" && ctx.isTemplate));

export const DM_SECTION_LABELS: Readonly<Record<string, string>> = Object.fromEntries(DM_SECTIONS.map((s) => [s.path, s.label]));
