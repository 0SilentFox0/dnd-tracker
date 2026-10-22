import { z } from "zod";

import { FLAG_KEY_RE } from "@/lib/onboarding/flag-keys";

export const setOnboardingFlagSchema = z.object({ key: z.string().max(100).regex(FLAG_KEY_RE), value: z.string().max(100).nullish() });

export const resetOnboardingSchema = z.object({ scope: z.enum(["hints", "checklists"]) });
