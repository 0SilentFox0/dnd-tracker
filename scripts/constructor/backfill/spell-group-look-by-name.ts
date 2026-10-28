import type { SpellGroupIconKey } from "@/lib/constants/spell-groups";

export const SPELL_GROUP_LOOK_BY_NAME: Record<string, { color?: string; icon?: SpellGroupIconKey }> = {
  Природа: { color: "#12a52b" },
  Світло: { color: "#f2b300", icon: "sun" },
  Темрява: { color: "#7a1fe6", icon: "moon" },
  Хаос: { color: "#ec1c0c", icon: "flame" },
  Dark: { icon: "moon" },
  Destr: { icon: "flame" },
  Summ: { icon: "sparkles" },
  Light: { icon: "sun" },
};
