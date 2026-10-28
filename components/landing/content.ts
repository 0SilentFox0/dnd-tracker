import {
  BookOpen,
  Boxes,
  Braces,
  Crown,
  Dices,
  Flag,
  GitBranch,
  HeartPulse,
  Image as ImageIcon,
  Layers,
  type LucideIcon,
  Map,
  MessageSquare,
  Music,
  NotebookPen,
  Printer,
  Scale,
  ScrollText,
  Shield,
  Smartphone,
  Sparkles,
  Swords,
  Users,
  Wand2,
} from "lucide-react";

export interface Showcase {
  id: string;
  points: number;
  image: string;
  mock?: "ai";
}

export const SHOWCASES: Showcase[] = [
  { id: "battle", points: 5, image: "/landing/screen-battle.webp" },
  { id: "heroes", points: 5, image: "/landing/screen-hero.webp" },
  { id: "story", points: 4, image: "/landing/screen-scenario.webp" },
  { id: "show", points: 4, image: "/landing/screen-show.webp" },
  { id: "ai", points: 5, image: "", mock: "ai" },
];

export interface Feature {
  id: string;
  icon: LucideIcon;
}

export const META_FEATURES = 8;

export const DEMO_STEPS = 4;

export const REPLACES: Feature[] = [
  { id: "vtt", icon: Map },
  { id: "initiative", icon: Swords },
  { id: "sheets", icon: ScrollText },
  { id: "dice", icon: MessageSquare },
  { id: "playlist", icon: Music },
  { id: "notes", icon: NotebookPen },
  { id: "images", icon: ImageIcon },
];

export const PAINS = 4;

export const STATS = [
  { id: "animations", value: "53" },
  { id: "auras", value: "39" },
  { id: "bestiary", value: "150+" },
  { id: "tracks", value: "96" },
  { id: "services", value: "0" },
];

export const SPELL_FX = [
  { id: "fireball", sprite: "ld-sprite-explosion", glow: "rgba(255,120,40,.35)", scale: "scale-[2]" },
  { id: "lightning", sprite: "ld-sprite-lightning", glow: "rgba(120,170,255,.35)", scale: "scale-100" },
  { id: "darkBolt", sprite: "ld-sprite-dark-bolt", glow: "rgba(170,90,255,.35)", scale: "scale-[1.4]" },
  { id: "arcane", sprite: "ld-sprite-rings", glow: "rgba(90,220,255,.3)", scale: "scale-[2]" },
  { id: "sparks", sprite: "ld-sprite-spark", glow: "rgba(255,220,120,.3)", scale: "scale-[3]" },
];

export const AURAS = ["burning", "freeze", "blessing", "bleeding", "curse", "stoneSkin", "blindness", "haste", "moonMark", "livingShield", "thorns", "stun"];

export const FEATURES: Feature[] = [
  { id: "balance", icon: Scale },
  { id: "bestiary", icon: Swords },
  { id: "races", icon: Crown },
  { id: "reserve", icon: Flag },
  { id: "music", icon: Music },
  { id: "mobile", icon: Smartphone },
  { id: "print", icon: Printer },
  { id: "invite", icon: Users },
];

export const CONSTRUCTOR: Feature[] = [
  { id: "templates", icon: Layers },
  { id: "rules", icon: Wand2 },
  { id: "api", icon: Braces },
  { id: "sync", icon: GitBranch },
  { id: "states", icon: HeartPulse },
  { id: "actions", icon: Shield },
  { id: "classes", icon: BookOpen },
  { id: "next", icon: Dices },
];

export const ROLES = [
  { id: "dm", icon: ScrollText, points: 4 },
  { id: "players", icon: Sparkles, points: 4 },
];

export const STEPS = [
  { id: "signIn", icon: Users },
  { id: "create", icon: Boxes },
  { id: "play", icon: Swords },
];

export const FAQ = ["tools", "editions", "world", "players", "price"];

export function numbered(count: number): number[] {
  return Array.from({ length: count }, (_, i) => i + 1);
}
