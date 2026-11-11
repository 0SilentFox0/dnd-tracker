import { z } from "zod";

import { CHARACTERISTIC_KEYS, SKILL_ADVANCE_KEY_RE } from "@/systems/wfrp/rules/characteristics/keys";

const LIST_MAX = 40;

const text = z.string().trim().min(1).max(100);

export const careerTierSchema = z.object({
  name: text,
  status: z.string().trim().max(100).optional(),
  characteristics: z.array(z.enum(CHARACTERISTIC_KEYS)).max(LIST_MAX),
  skills: z.array(z.string().regex(SKILL_ADVANCE_KEY_RE)).max(LIST_MAX),
  talents: z.array(z.string().trim().min(1).max(100)).max(LIST_MAX),
  trappings: z.array(text).max(LIST_MAX),
});

const fields = {
  name: z.string().trim().min(1).max(100),
  icon: z.string().max(2000).refine((v) => !v.startsWith("data:"), "careers.validation.iconUrl").nullable(),
  class: z.string().trim().min(1).max(100).nullable(),
  tiers: z.array(careerTierSchema).length(4),
};

export const createCareerSchema = z.object({
  ...fields,
  icon: fields.icon.optional(),
  class: fields.class.optional(),
});

export const updateCareerSchema = z.object(fields).partial();
