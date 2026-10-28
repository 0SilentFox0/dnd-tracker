import type { LucideIcon } from "lucide-react";
import { BookOpen, Gem, GitBranch, Images, Map as MapIcon, Music, ScrollText, Shield, Skull, Sparkles, Swords, User, Users } from "lucide-react";

export type DashboardGroupKey = "game" | "heroes" | "libraries" | "player";

export interface DashboardSection {
  key: string;
  href: (campaignId: string) => string;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  keywords: string[];
  group: DashboardGroupKey;
}

export const DASHBOARD_GROUP_TITLE: Record<DashboardGroupKey, string> = {
  game: "Гра",
  heroes: "Герої",
  libraries: "Бібліотеки",
  player: "Кампанія",
};

const dm = (path: string) => (id: string) => `/campaigns/${id}/dm/${path}`;

const info = (id: string) => `/campaigns/${id}/info`;

export const DM_DASHBOARD_SECTIONS: DashboardSection[] = [
  { key: "scenario", href: dm("scenario"), icon: ScrollText, title: "Сценарій", subtitle: "Сцени, нотатки майстра й біографії героїв", keywords: ["сюжет", "нотатки", "рукопис"], group: "game" },
  { key: "battles", href: dm("battles"), icon: Swords, title: "Бої", subtitle: "Створення та управління боями", keywords: ["бій", "битви", "сцени"], group: "game" },
  { key: "show", href: dm("show"), icon: Images, title: "Показ", subtitle: "Набори слайдів із музикою для гравців", keywords: ["слайди"], group: "game" },
  { key: "music", href: dm("music"), icon: Music, title: "Музика", subtitle: "Бібліотека треків для плеєра в бою", keywords: ["треки", "плеєр"], group: "game" },
  { key: "characters", href: dm("characters"), icon: Users, title: "Персонажі", subtitle: "Управління персонажами гравців", keywords: ["герої", "гравці", "схвалення"], group: "heroes" },
  { key: "info", href: info, icon: BookOpen, title: "Довідник", subtitle: "Скіли, заклинання й артефакти: як діють і в кого що.", keywords: ["довідка", "інформація", "правила"], group: "heroes" },
  { key: "units", href: dm("units"), icon: Skull, title: "Юніти", subtitle: "Управління мобами та юнітами", keywords: ["моби", "npc", "монстри", "вороги"], group: "libraries" },
  { key: "spells", href: dm("spells"), icon: Sparkles, title: "Заклинання", subtitle: "База заклинань кампанії", keywords: ["закл", "магія"], group: "libraries" },
  { key: "artifacts", href: dm("artifacts"), icon: Gem, title: "Артефакти", subtitle: "Управління артефактами та сетами", keywords: ["предмети", "речі", "сети"], group: "libraries" },
  { key: "skills", href: dm("skills"), icon: BookOpen, title: "Скіли", subtitle: "Управління скілами та їх ефектами", keywords: ["навички", "здібності"], group: "libraries" },
  { key: "skill-trees", href: dm("skill-trees"), icon: GitBranch, title: "Дерева прокачки", subtitle: "Налаштування дерев прокачки для рас", keywords: ["прокачка", "рівні"], group: "libraries" },
  { key: "races", href: dm("races"), icon: Shield, title: "Раси", subtitle: "Управління расами та їх здібностями", keywords: ["народи"], group: "libraries" },
];

export const PLAYER_DASHBOARD_SECTIONS: DashboardSection[] = [
  { key: "my-character", href: (id) => `/campaigns/${id}/character`, icon: User, title: "Мій персонаж", subtitle: "Перегляд та редагування персонажа", keywords: ["герой", "лист"], group: "player" },
  { key: "player-show", href: (id) => `/campaigns/${id}/show`, icon: Images, title: "Показ", subtitle: "Слайди й музику від ДМ під час гри", keywords: ["слайди"], group: "player" },
  { key: "player-world", href: (id) => `/campaigns/${id}/world`, icon: MapIcon, title: "Карта", subtitle: "Ваші герої й відкриті місця світу", keywords: ["світ", "мапа"], group: "player" },
  { key: "info", href: info, icon: BookOpen, title: "Довідник", subtitle: "Скіли, заклинання й артефакти: як діють і в кого що.", keywords: ["довідка", "інформація", "правила"], group: "player" },
];

export const COMPACT_GROUPS: ReadonlySet<DashboardGroupKey> = new Set<DashboardGroupKey>(["libraries"]);
