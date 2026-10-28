import { appendAbility } from "./append-ability";

import type { Ability } from "@/lib/utils/abilities/schema";

export const ELF_EYE_ABILITY = {
  id: "constructor-elf-eye",
  name: "Ельфійське око",
  trigger: { event: "passive" },
  effects: [{ kind: "flag", flag: "advantage", attackKind: "ranged" }],
} as Ability;

export const isElfRaceName = (name: string) => name.toLowerCase().includes("elf");

export const withElfEye = (abilities: unknown) => appendAbility(abilities, ELF_EYE_ABILITY);
