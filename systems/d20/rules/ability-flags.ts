import { z } from "zod";

import { ABILITY_KEYS } from "@/lib/constants/abilities";
import { PROFICIENCY_KINDS } from "@/lib/constants/artifacts";
import { DND_SKILLS } from "@/lib/constants/skills";
import { flagBase } from "@/lib/utils/abilities/schema/flag-base";

const abilityKeys = z.array(z.enum(ABILITY_KEYS)).min(1);

const skills = z.array(z.enum(DND_SKILLS)).min(1);

export const D20_FLAG_SCHEMAS = [
  z.object({ ...flagBase, flag: z.literal("saveProficiency"), abilities: abilityKeys }),
  z.object({ ...flagBase, flag: z.literal("skillProficiency"), skills }),
  z.object({ ...flagBase, flag: z.literal("skillExpertise"), skills }),
  z.object({ ...flagBase, flag: z.literal("proficiency"), kinds: z.array(z.enum(PROFICIENCY_KINDS)).min(1) }),
] as const;
