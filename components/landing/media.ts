import {
  Boxes,
  Braces,
  Crown,
  FileUp,
  Image as ImageIcon,
  type LucideIcon,
  Map,
  MessageSquare,
  Music,
  NotebookPen,
  Package,
  ScrollText,
  Settings2,
  Sparkles,
  Swords,
  Wand2,
} from "lucide-react";

interface ShowcaseMedia {
  image?: string;
  mock?: "ai";
  ratio?: "16/10" | "9/16";
}

export const SHOWCASE_MEDIA: Record<string, ShowcaseMedia> = {
  combat: { image: "/landing/screen-battle.webp", ratio: "16/10" },
  scenario: { image: "/landing/screen-scenario.webp", ratio: "16/10" },
  show: { image: "/landing/screen-show.webp", ratio: "16/10" },
  world: { ratio: "16/10" },
  ai: { mock: "ai", ratio: "16/10" },
  phone: { ratio: "9/16" },
  hero: { image: "/landing/screen-hero.webp", ratio: "16/10" },
};

export const PROBLEM_ICONS: LucideIcon[] = [Map, Swords, ScrollText, MessageSquare, Music, NotebookPen, ImageIcon];

export const CAPABILITY_ICONS: Record<string, LucideIcon> = {
  races: Crown,
  classes: Boxes,
  units: Swords,
  abilities: Wand2,
  spells: Sparkles,
  artifacts: Package,
  rules: Settings2,
  import: FileUp,
  api: Braces,
};
