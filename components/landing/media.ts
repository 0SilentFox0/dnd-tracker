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

export interface ShowcaseMedia {
  image?: string;
  ratio?: "16/10" | "9/16";
}

export const SHOWCASE_MEDIA = {
  combat: { image: "/landing/screen-battle.webp", ratio: "16/10" },
  scenario: { image: "/landing/screen-scenario.webp", ratio: "16/10" },
  show: { image: "/landing/screen-show.webp", ratio: "16/10" },
  world: { image: "/landing/screen-world.webp", ratio: "16/10" },
  phone: { image: "/landing/screen-player-mobile.webp", ratio: "9/16" },
  hero: { image: "/landing/screen-hero.webp", ratio: "16/10" },
  mechanics: { image: "/landing/screen-constructor.webp", ratio: "16/10" },
} satisfies Record<string, ShowcaseMedia>;

export type ShowcaseId = keyof typeof SHOWCASE_MEDIA;

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

export const FX_SPRITES = [
  { sprite: "ld-sprite-explosion", glow: "rgba(255,120,40,.35)", scale: "scale-[2]" },
  { sprite: "ld-sprite-lightning", glow: "rgba(120,170,255,.35)", scale: "scale-100" },
  { sprite: "ld-sprite-dark-bolt", glow: "rgba(170,90,255,.35)", scale: "scale-[1.4]" },
  { sprite: "ld-sprite-rings", glow: "rgba(90,220,255,.3)", scale: "scale-[2]" },
  { sprite: "ld-sprite-spark", glow: "rgba(255,220,120,.3)", scale: "scale-[3]" },
];
